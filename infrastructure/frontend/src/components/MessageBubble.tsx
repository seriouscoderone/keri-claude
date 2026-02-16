import { Message } from '../hooks/useChat';
import SourceCitation from './SourceCitation';

interface Props {
  message: Message;
}

function formatContent(text: string): React.ReactNode[] {
  const blocks = text.split(/```(\w*)\n?([\s\S]*?)```/g);
  const result: React.ReactNode[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block === undefined) continue;

    if (i % 3 === 2) {
      result.push(
        <pre
          key={i}
          className="my-2 p-3 rounded-lg bg-keri-darker text-sm overflow-x-auto font-mono"
        >
          <code>{block}</code>
        </pre>,
      );
      continue;
    }
    if (i % 3 === 1) continue;

    // Inline formatting: bold, inline code, citation markers, line breaks
    const parts = block.split(/(\*\*.*?\*\*|`[^`]+`|\[(\d+)\]|\n)/g);
    for (let j = 0; j < parts.length; j++) {
      const part = parts[j];
      if (part === undefined || part === '') continue;

      if (part === '\n') {
        result.push(<br key={`${i}-${j}`} />);
      } else if (part.startsWith('**') && part.endsWith('**')) {
        result.push(
          <strong key={`${i}-${j}`} className="font-semibold">
            {part.slice(2, -2)}
          </strong>,
        );
      } else if (part.startsWith('`') && part.endsWith('`')) {
        result.push(
          <code
            key={`${i}-${j}`}
            className="px-1.5 py-0.5 rounded bg-keri-darker text-keri-accent-light text-sm font-mono"
          >
            {part.slice(1, -1)}
          </code>,
        );
      } else if (/^\[(\d+)\]$/.test(part)) {
        const num = part.slice(1, -1);
        result.push(
          <sup
            key={`${i}-${j}`}
            className="inline-flex items-center justify-center ml-0.5 px-1 py-0 text-[10px] font-bold rounded bg-keri-accent/20 text-keri-accent-light cursor-default"
            title={`Source ${num}`}
          >
            {num}
          </sup>,
        );
      } else if (/^\d+$/.test(part)) {
        // Skip bare digits from the capture group in the citation regex
        continue;
      } else {
        result.push(<span key={`${i}-${j}`}>{part}</span>);
      }
    }
  }

  return result;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const hasCitations =
    message.citations && message.citations.length > 0;

  return (
    <div
      className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-keri-accent text-white rounded-br-sm'
            : 'bg-keri-surface text-keri-text rounded-bl-sm'
        }`}
      >
        {/* Show attached file names for user messages */}
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {message.attachments.map((a, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-white/20 text-white/90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4Z" clipRule="evenodd" />
                </svg>
                {a.name}
              </span>
            ))}
          </div>
        )}

        <div className="whitespace-pre-wrap break-words">
          {formatContent(message.content)}
        </div>

        {hasCitations && (
          <div className="mt-3 pt-3 border-t border-keri-surface-light/50">
            <p className="text-xs font-medium text-keri-text-muted mb-2">
              Sources
            </p>
            <div className="flex flex-col gap-1.5">
              {message.citations!.map((citation) => (
                <SourceCitation key={citation.number} citation={citation} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
