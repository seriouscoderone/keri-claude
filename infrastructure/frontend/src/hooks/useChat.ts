import { useState, useCallback } from 'react';
import { sendMessage, ChatApiError, NumberedCitation, Attachment } from '../api/chat';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: NumberedCitation[];
  attachments?: Attachment[];
  timestamp: Date;
}

export interface ChatErrorInfo {
  message: string;
  code?: string;
  detail?: string;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ChatErrorInfo>();

  const send = useCallback(
    async (text: string, attachments?: Attachment[]) => {
      setError(undefined);
      const userMsg: Message = {
        role: 'user',
        content: text,
        attachments,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        // Build history from existing messages
        const history = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const response = await sendMessage(text, history, attachments);
        const assistantMsg: Message = {
          role: 'assistant',
          content: response.answer,
          citations: response.citations,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        if (err instanceof ChatApiError) {
          setError({
            message: err.message,
            code: err.code,
            detail: err.detail,
          });
        } else {
          const message =
            err instanceof Error ? err.message : 'An unexpected error occurred';
          setError({ message });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [messages],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(undefined);
  }, []);

  return { messages, isLoading, error, send, reset };
}
