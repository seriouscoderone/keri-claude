import { useState, useCallback, useRef } from 'react';
import { streamMessage, ChatApiError, NumberedCitation, Attachment } from '../api/chat';

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
  // Track accumulated streaming text outside React state for performance
  const streamRef = useRef('');

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
      streamRef.current = '';

      // Add an empty assistant message that will grow as chunks arrive
      const assistantMsg: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      try {
        // Build history from existing messages (before this exchange)
        const history = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        await streamMessage(
          text,
          history,
          attachments,
          // onChunk: append text to the assistant message
          (chunk: string) => {
            streamRef.current += chunk;
            const accumulated = streamRef.current;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = { ...last, content: accumulated };
              }
              return updated;
            });
          },
          // onCitations: attach citations to the assistant message
          (citations: NumberedCitation[]) => {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = { ...last, citations };
              }
              return updated;
            });
          },
        );
      } catch (err) {
        // Remove the empty assistant message on error
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant' && !last.content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
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
