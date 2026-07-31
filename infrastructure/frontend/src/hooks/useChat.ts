import { useState, useCallback, useRef, useEffect } from 'react';
import {
  streamMessage,
  warmIfStale,
  ChatApiError,
  NumberedCitation,
  Attachment,
  WakeStatus,
} from '../api/chat';

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
  const [wakeStatus, setWakeStatus] = useState<string>();

  // Trigger a resume as the page opens, so a first question usually lands on
  // an awake cluster. Intentionally not awaited.
  useEffect(() => {
    void warmIfStale();
  }, []);

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

      // History reflects the conversation before this exchange.
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const onChunk = (chunk: string) => {
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
      };

      const onCitations = (citations: NumberedCitation[]) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, citations };
          }
          return updated;
        });
      };

      const onStatus = (status: WakeStatus) => {
        const seconds = Math.round(status.elapsedMs / 1000);
        setWakeStatus(
          `${status.detail ?? 'Waking the knowledge base…'}${
            seconds > 0 ? ` ${seconds}s` : ''
          }`,
        );
      };

      // Two attempts at most. The outer net covers an exhausted server-side
      // wake budget and a connection dropped before any content arrived; the
      // placeholder assistant message is reused, never re-appended.
      let lastErr: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
          setWakeStatus('Knowledge base is still waking — retrying…');
          await new Promise((r) => setTimeout(r, 3000));
        }
        try {
          streamRef.current = '';
          await streamMessage(
            text,
            history,
            attachments,
            onChunk,
            onCitations,
            onStatus,
          );
          lastErr = undefined;
          break;
        } catch (err) {
          lastErr = err;
          const isWaking =
            err instanceof ChatApiError && err.code === 'DATABASE_RESUMING';
          const droppedEmpty =
            !(err instanceof ChatApiError) && streamRef.current === '';
          if (!isWaking && !droppedEmpty) break;
        }
      }

      setWakeStatus(undefined);
      setIsLoading(false);

      if (lastErr) {
        // Drop the placeholder if nothing ever streamed into it.
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant' && !last.content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
        if (lastErr instanceof ChatApiError) {
          setError({
            message: lastErr.message,
            code: lastErr.code,
            detail: lastErr.detail,
          });
        } else {
          setError({
            message:
              lastErr instanceof Error
                ? lastErr.message
                : 'An unexpected error occurred',
          });
        }
      }
    },
    [messages],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(undefined);
    setWakeStatus(undefined);
  }, []);

  return { messages, isLoading, error, wakeStatus, send, reset };
}
