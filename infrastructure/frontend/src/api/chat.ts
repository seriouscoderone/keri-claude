export interface NumberedCitation {
  number: number;
  content: string;
  source: string;
}

export interface ChatResponse {
  answer: string;
  citations: NumberedCitation[];
}

export interface Attachment {
  name: string;
  type: string;
  content: string;  // base64
}

export interface ChatError {
  error: string;
  code?: string;
  detail?: string;
}

export class ChatApiError extends Error {
  status: number;
  code?: string;
  detail?: string;

  constructor(status: number, body: ChatError) {
    super(body.error);
    this.status = status;
    this.code = body.code;
    this.detail = body.detail;
  }
}

interface SSEChunkEvent {
  type: 'chunk';
  text: string;
}

interface SSECitationsEvent {
  type: 'citations';
  data: NumberedCitation[];
}

interface SSEDoneEvent {
  type: 'done';
}

interface SSEErrorEvent {
  type: 'error';
  error: string;
  code?: string;
  detail?: string;
}

type SSEEvent = SSEChunkEvent | SSECitationsEvent | SSEDoneEvent | SSEErrorEvent;

export async function streamMessage(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  attachments: Attachment[] | undefined,
  onChunk: (text: string) => void,
  onCitations: (citations: NumberedCitation[]) => void,
): Promise<void> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, attachments }),
  });

  if (!res.ok) {
    let body: ChatError;
    try {
      body = await res.json();
    } catch {
      if (res.status === 504) {
        body = {
          error: 'Request timed out',
          code: 'TIMEOUT',
          detail: 'The model took too long to respond. Try a simpler or more focused question.',
        };
      } else {
        body = { error: `Chat failed: ${res.status}` };
      }
    }
    throw new ChatApiError(res.status, body);
  }

  if (!res.body) {
    throw new ChatApiError(0, { error: 'No response body' });
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE lines from buffer
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
          onChunk(event.text);
          break;
        case 'citations':
          onCitations(event.data);
          break;
        case 'error':
          throw new ChatApiError(500, {
            error: event.error,
            code: event.code,
            detail: event.detail,
          });
        case 'done':
          return;
      }
    }
  }
}
