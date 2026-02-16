import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { Writable } from 'stream';

const bedrockRuntime = new BedrockRuntimeClient({});
const bedrockAgent = new BedrockAgentRuntimeClient({});

interface Attachment {
  name: string;
  type: string;
  content: string;
}

interface ChatRequest {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  attachments?: Attachment[];
}

interface Chunk {
  content: string;
  source: string;
}

interface Citation {
  number: number;
  content: string;
  source: string;
}

const SYSTEM_PROMPT_TEMPLATE = `You are the keri.host chat assistant — a specialist in the KERI ecosystem including CESR encoding and ACDC credentials.

## Your Knowledge
Answer questions about KERI, CESR, and ACDC using the specification excerpts below. You understand:
- KERI: decentralized key management, pre-rotation, witnesses, KAACE consensus
- CESR: composable event streaming, qualified base64, code tables
- ACDC: verifiable credentials, graduated disclosure, IPEX exchange

## Citation Rules
- Cite sources using [1], [2], etc. matching the numbered excerpts
- Every factual claim must have at least one citation
- If excerpts don't contain enough info, say so — never guess
- Prefer specification language when precision matters

## Tone
You communicate in a casual, yet precise manner, ensuring the technical details, development practices, and contribution opportunities are clear and engaging. You encourage deep dives into technical underpinnings, testing and practical applications. Focus on technical depth and specific insights while maintaining an approachable tone. Use KERI terminology correctly (Verfer, Diger, Siger, pre-rotation, etc.).

## Retrieved Excerpts
{CHUNKS}`;

async function reformulateQuery(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  if (history.length === 0) {
    return message;
  }

  try {
    const messages = [
      ...history.map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: [{ text: h.content }],
      })),
      { role: 'user' as const, content: [{ text: message }] },
    ];

    const response = await bedrockRuntime.send(
      new ConverseCommand({
        modelId: process.env.REFORMULATION_MODEL_ARN!,
        system: [
          {
            text: 'You are a query reformulator. Given a conversation and a follow-up question, rewrite the follow-up as a standalone search query that captures the full context. Output ONLY the reformulated query, nothing else.',
          },
        ],
        messages,
      }),
    );

    const reformulated = response.output?.message?.content?.[0]?.text;
    if (reformulated) {
      return reformulated;
    }
    return message;
  } catch (err) {
    console.error('Reformulation failed, using raw query:', err);
    return message;
  }
}

async function retrieveChunks(query: string): Promise<Chunk[]> {
  const response = await bedrockAgent.send(
    new RetrieveCommand({
      knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID!,
      retrievalQuery: { text: query },
      retrievalConfiguration: {
        vectorSearchConfiguration: {
          numberOfResults: 10,
        },
      },
    }),
  );

  return (
    response.retrievalResults?.map((r) => ({
      content: r.content?.text ?? '',
      source: extractSource(r.location?.s3Location?.uri),
    })) ?? []
  );
}

function extractSource(uri?: string): string {
  if (!uri) return 'unknown';
  const parts = uri.split('/');
  return parts[parts.length - 1] || 'unknown';
}

function buildChunksSection(chunks: Chunk[]): string {
  if (chunks.length === 0) {
    return 'No relevant excerpts found.';
  }
  return chunks
    .map((c, i) => `[${i + 1}] (source: ${c.source})\n${c.content}`)
    .join('\n\n');
}

function buildUserMessageWithAttachments(
  message: string,
  attachments?: Attachment[],
): string {
  if (!attachments || attachments.length === 0) {
    return message;
  }

  const fileSections = attachments.map((a) => {
    const decoded = Buffer.from(a.content, 'base64').toString('utf-8');
    return `[Attached file: ${a.name}]\n${decoded}\n[End of attached file]`;
  });

  return fileSections.join('\n\n') + '\n\n' + message;
}

function extractCitations(answer: string, chunks: Chunk[]): Citation[] {
  const matches = answer.match(/\[(\d+)\]/g);
  if (!matches) return [];

  const citationNumbers = [
    ...new Set(matches.map((m) => parseInt(m.slice(1, -1)))),
  ];

  return citationNumbers
    .filter((n) => n >= 1 && n <= chunks.length)
    .map((n) => ({
      number: n,
      content: chunks[n - 1].content,
      source: chunks[n - 1].source,
    }));
}

function writeSSE(stream: Writable, data: object): void {
  stream.write(`data: ${JSON.stringify(data)}\n\n`);
}

function writeErrorSSE(stream: Writable, err: unknown): void {
  const errMsg = err instanceof Error ? err.message : String(err);
  const errName = err instanceof Error ? err.name : '';

  if (
    errMsg.includes('use case details have not been submitted') ||
    errMsg.includes('Fill out the') ||
    errName === 'AccessDeniedException'
  ) {
    writeSSE(stream, {
      type: 'error',
      error: 'Anthropic use case details required',
      code: 'MODEL_ACCESS_REQUIRED',
      detail:
        'First-time Anthropic model users must submit use case details before access is granted. ' +
        'Open the Amazon Bedrock console → Model catalog — a banner at the top will prompt you to ' +
        '"Submit use case details". Click it, fill in the short form, and access is typically granted within a few minutes.',
    });
    return;
  }

  if (
    errMsg.includes('aws-marketplace:') ||
    errMsg.includes('Marketplace')
  ) {
    writeSSE(stream, {
      type: 'error',
      error: 'Marketplace permissions pending',
      code: 'MARKETPLACE_SUBSCRIPTION',
      detail:
        'Bedrock is completing the Marketplace subscription for the Anthropic model. ' +
        'This happens automatically after submitting use case details. ' +
        'If you just submitted the form, please wait 2-3 minutes and try again. ' +
        'If the error persists, invoke any Claude model once from the Bedrock Playground to trigger the subscription.',
    });
    return;
  }

  if (
    errName === 'ThrottlingException' ||
    errMsg.includes('ThrottlingException')
  ) {
    writeSSE(stream, {
      type: 'error',
      error: 'Too many requests',
      code: 'THROTTLED',
      detail: 'The service is temporarily rate-limited. Please wait a moment and try again.',
    });
    return;
  }

  writeSSE(stream, {
    type: 'error',
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    detail: 'An unexpected error occurred. Please try again later.',
  });
}

// Lambda Function URL streaming handler
// Uses the global awslambda.streamifyResponse provided by the Lambda runtime
declare const awslambda: {
  streamifyResponse(
    handler: (event: any, responseStream: Writable, context: any) => Promise<void>,
  ): any;
  HttpResponseStream: {
    from(stream: Writable, metadata: object): Writable;
  };
};

export const handler = awslambda.streamifyResponse(
  async (event: any, responseStream: Writable, _context: any) => {
    const httpStream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

    try {
      const rawBody = event.body
        ? event.isBase64Encoded
          ? Buffer.from(event.body, 'base64').toString('utf-8')
          : event.body
        : '{}';
      const body: ChatRequest = JSON.parse(rawBody);

      if (!body.message) {
        writeSSE(httpStream, { type: 'error', error: 'message is required', code: 'BAD_REQUEST' });
        httpStream.end();
        return;
      }

      const history = body.history ?? [];

      // Step 1: Reformulate query (synchronous)
      const reformulatedQuery = await reformulateQuery(body.message, history);

      // Step 2: Retrieve chunks (synchronous)
      const chunks = await retrieveChunks(reformulatedQuery);

      const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace(
        '{CHUNKS}',
        buildChunksSection(chunks),
      );

      const currentUserMessage = buildUserMessageWithAttachments(
        body.message,
        body.attachments,
      );

      const messages = [
        ...history.map((h) => ({
          role: h.role as 'user' | 'assistant',
          content: [{ text: h.content }],
        })),
        { role: 'user' as const, content: [{ text: currentUserMessage }] },
      ];

      // Step 3: Stream generation via ConverseStreamCommand
      const response = await bedrockRuntime.send(
        new ConverseStreamCommand({
          modelId: process.env.MODEL_ARN!,
          system: [{ text: systemPrompt }],
          messages,
        }),
      );

      let fullAnswer = '';

      if (response.stream) {
        for await (const event of response.stream) {
          if (event.contentBlockDelta?.delta?.text) {
            const text = event.contentBlockDelta.delta.text;
            fullAnswer += text;
            writeSSE(httpStream, { type: 'chunk', text });
          }
        }
      }

      // Extract citations and send as final event
      const citations = extractCitations(fullAnswer, chunks);
      if (citations.length > 0) {
        writeSSE(httpStream, { type: 'citations', data: citations });
      }

      writeSSE(httpStream, { type: 'done' });
    } catch (err: unknown) {
      console.error('Chat error:', err);
      writeErrorSSE(httpStream, err);
    }

    httpStream.end();
  },
);
