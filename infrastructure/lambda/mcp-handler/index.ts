import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  StreamableHTTPServerTransport,
} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

// --- Types ---

interface NumberedCitation {
  number: number;
  content: string;
  source: string;
}

interface ChatResult {
  answer: string;
  citations: NumberedCitation[];
}

interface SSEChunkEvent { type: 'chunk'; text: string }
interface SSECitationsEvent { type: 'citations'; data: NumberedCitation[] }
interface SSEDoneEvent { type: 'done' }
interface SSEErrorEvent { type: 'error'; error: string; code?: string; detail?: string }
type SSEEvent = SSEChunkEvent | SSECitationsEvent | SSEDoneEvent | SSEErrorEvent;

interface HistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

// --- SSE consumer (same pattern as local MCP server) ---

async function queryKeriChat(
  question: string,
  history: HistoryEntry[],
  chatFnUrl: string,
): Promise<ChatResult> {
  const res = await fetch(chatFnUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: question, history }),
    signal: AbortSignal.timeout(80_000),
  });

  if (!res.ok) {
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/event-stream')) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        detail = body.error || body.detail || detail;
      } catch { /* ignore */ }
      throw new Error(`Chat API error: ${detail}`);
    }
  }

  if (!res.body) {
    throw new Error('No response body from chat API');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let citations: NumberedCitation[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (!json) continue;

      let event: SSEEvent;
      try {
        event = JSON.parse(json);
      } catch {
        continue;
      }

      switch (event.type) {
        case 'chunk':
          answer += event.text;
          break;
        case 'citations':
          citations = event.data;
          break;
        case 'error':
          throw new Error(
            `Chat API error [${event.code ?? 'UNKNOWN'}]: ${event.error}${event.detail ? ` — ${event.detail}` : ''}`,
          );
        case 'done':
          return { answer, citations };
      }
    }
  }

  return { answer, citations };
}

// --- Lambda handler ---

const CHAT_FN_URL = process.env.CHAT_FN_URL!;

export async function handler(event: {
  requestContext: { http: { method: string; path: string } };
  headers: Record<string, string>;
  body?: string;
  isBase64Encoded?: boolean;
}): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  const method = event.requestContext.http.method;

  // Only accept POST
  if (method !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', error: { code: -32600, message: 'Method not allowed' } }),
    };
  }

  // Decode body
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body ?? '', 'base64').toString('utf-8')
    : (event.body ?? '');

  // Build a Web Standard Request
  const url = `https://localhost${event.requestContext.http.path}`;
  const reqHeaders = new Headers();
  for (const [k, v] of Object.entries(event.headers)) {
    reqHeaders.set(k, v);
  }
  const request = new Request(url, {
    method: 'POST',
    headers: reqHeaders,
    body: rawBody,
  });

  // Create stateless MCP server + transport for this invocation
  const server = new McpServer({
    name: 'keri-chat',
    version: '1.0.0',
  });

  server.tool(
    'ask_keri_chat',
    'Query the keri.host knowledge base for spec-grounded answers about KERI, CESR, and ACDC.',
    {
      question: z.string().describe('The KERI/CESR/ACDC question to ask'),
      history: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string(),
          }),
        )
        .optional()
        .default([])
        .describe('Conversation history for multi-turn context'),
    },
    async ({ question, history }) => {
      const result = await queryKeriChat(question, history, CHAT_FN_URL);

      let text = result.answer;
      if (result.citations.length > 0) {
        text += '\n\n---\n**Sources:**\n';
        for (const c of result.citations) {
          text += `- [${c.number}] ${c.source}: ${c.content.slice(0, 150)}${c.content.length > 150 ? '...' : ''}\n`;
        }
      }

      return { content: [{ type: 'text' as const, text }] };
    },
  );

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });

  await server.connect(transport);

  try {
    const response = await transport.handleRequest(request);

    // Extract response body and headers
    const responseBody = await response.text();
    const responseHeaders: Record<string, string> = {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
    };

    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: responseBody,
    };
  } finally {
    await transport.close();
    await server.close();
  }
}
