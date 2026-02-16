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

export async function sendMessage(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  attachments?: Attachment[],
): Promise<ChatResponse> {
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
      body = { error: `Chat failed: ${res.status}` };
    }
    throw new ChatApiError(res.status, body);
  }
  return res.json();
}
