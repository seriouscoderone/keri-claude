import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { Message, ChatErrorInfo } from '../hooks/useChat';
import { Attachment } from '../api/chat';
import MessageBubble from './MessageBubble';

const EXAMPLE_QUESTIONS = [
  'What is pre-rotation in KERI and why does it matter?',
  'How does CESR achieve composability across text and binary?',
  'Explain the ACDC graduated disclosure mechanism',
  'How do KERI witnesses reach agreement (KAACE)?',
];

interface Props {
  messages: Message[];
  isLoading: boolean;
  error?: ChatErrorInfo;
  onSend: (text: string, attachments?: Attachment[]) => void;
}

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = '.pdf,.txt,.md,.csv,.py,.ts,.js,.rs,.json,.toml,.yaml,.yml';

export default function ChatWindow({
  messages,
  isLoading,
  error,
  onSend,
}: Props) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setInput('');
    setAttachments([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleExampleClick = (question: string) => {
    if (isLoading) return;
    onSend(question);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const remaining = MAX_FILES - attachments.length;
    const toAdd = files.slice(0, remaining);

    const newAttachments: Attachment[] = [];
    for (const file of toAdd) {
      if (file.size > MAX_FILE_SIZE) continue;
      const content = await fileToBase64(file);
      newAttachments.push({
        name: file.name,
        type: file.type || 'text/plain',
        content,
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
              <div className="text-5xl mb-4" role="img" aria-label="key">
                &#x1F511;
              </div>
              <h2 className="text-xl font-semibold text-keri-text mb-2">
                keri.host chat
              </h2>
              <p className="text-keri-text-muted mb-8 max-w-md">
                Ask about KERI, CESR, or ACDC — answers grounded in the official specifications
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleExampleClick(q)}
                    className="px-4 py-2 text-sm rounded-lg bg-keri-surface hover:bg-keri-surface-light text-keri-text-muted hover:text-keri-text border border-keri-surface-light hover:border-keri-accent/30 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}

              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-keri-surface rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-keri-text-muted animate-pulse" />
                      <span
                        className="w-2 h-2 rounded-full bg-keri-text-muted animate-pulse"
                        style={{ animationDelay: '0.15s' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-keri-text-muted animate-pulse"
                        style={{ animationDelay: '0.3s' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/30 border border-red-700/50 text-sm">
                  <p className="text-red-300 font-medium">{error.message}</p>
                  {error.detail && (
                    <p className="text-red-300/80 mt-1">{error.detail}</p>
                  )}
                  {error.code === 'MODEL_ACCESS_REQUIRED' && (
                    <div className="mt-2 pt-2 border-t border-red-700/30">
                      <p className="text-red-300/70 text-xs">
                        Steps: AWS Console &rarr; Amazon Bedrock &rarr; Model catalog &rarr;
                        Click &ldquo;Submit use case details&rdquo; in the banner at the top of the page.
                        Access is typically granted within a few minutes.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-keri-surface-light bg-keri-darker px-4 py-3">
        <div className="max-w-3xl mx-auto">
          {/* Attached file chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {attachments.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-keri-surface border border-keri-surface-light text-keri-text-muted"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4Z" clipRule="evenodd" />
                  </svg>
                  {a.name}
                  <button
                    onClick={() => removeAttachment(i)}
                    className="ml-0.5 hover:text-keri-text"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                      <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || attachments.length >= MAX_FILES}
              className="p-3 rounded-xl text-keri-text-muted hover:text-keri-text hover:bg-keri-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Attach files"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z" clipRule="evenodd" />
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about KERI, CESR, or ACDC..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none rounded-xl bg-keri-surface border border-keri-surface-light focus:border-keri-accent focus:ring-1 focus:ring-keri-accent/50 px-4 py-3 text-sm text-keri-text placeholder-keri-text-muted outline-none transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 rounded-xl bg-keri-accent hover:bg-keri-accent-light text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.11 28.11 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.11 28.11 0 0 0 3.105 2.288Z" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:text/plain;base64,")
      const base64 = result.split(',')[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
