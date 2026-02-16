import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { Message } from '../hooks/useChat';
import SourceCitation from './SourceCitation';

interface Props {
  message: Message;
}

// Replace citation markers [1], [2] etc with superscript badges
function injectCitationBadges(text: string): React.ReactNode[] {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      return (
        <sup
          key={i}
          className="inline-flex items-center justify-center ml-0.5 px-1 py-0 text-[10px] font-bold rounded bg-keri-accent/20 text-keri-accent-light cursor-default"
          title={`Source ${match[1]}`}
        >
          {match[1]}
        </sup>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// Custom react-markdown components for our theme
const markdownComponents: Components = {
  // Code blocks and inline code
  code({ className, children, ...props }) {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return (
        <code className={`${className ?? ''}`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="px-1.5 py-0.5 rounded bg-keri-darker text-keri-accent-light text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre({ children }) {
    return (
      <pre className="my-2 p-3 rounded-lg bg-keri-darker text-sm overflow-x-auto font-mono">
        {children}
      </pre>
    );
  },
  // Links open in new tab
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-keri-accent-light hover:underline"
      >
        {children}
      </a>
    );
  },
  // Style lists
  ul({ children }) {
    return <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>;
  },
  // Headings
  h1({ children }) {
    return <h1 className="text-lg font-bold mt-3 mb-1">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-base font-bold mt-2 mb-1">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-sm font-bold mt-2 mb-0.5">{children}</h3>;
  },
  // Tables
  table({ children }) {
    return (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full text-xs border-collapse border border-keri-surface-light/50">
          {children}
        </table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border border-keri-surface-light/50 px-2 py-1 bg-keri-darker font-semibold text-left">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border border-keri-surface-light/50 px-2 py-1">{children}</td>
    );
  },
  // Blockquotes
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-keri-accent/50 pl-3 my-2 text-keri-text-muted italic">
        {children}
      </blockquote>
    );
  },
  // Paragraphs — inject citation badges into text content
  p({ children }) {
    const processed = processChildren(children);
    return <p className="my-1">{processed}</p>;
  },
  // List items — also inject citation badges
  li({ children }) {
    const processed = processChildren(children);
    return <li>{processed}</li>;
  },
};

// Process children to inject citation badges into string segments
function processChildren(children: React.ReactNode): React.ReactNode {
  if (!children) return children;
  if (typeof children === 'string') {
    if (/\[\d+\]/.test(children)) {
      return injectCitationBadges(children);
    }
    return children;
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === 'string' && /\[\d+\]/.test(child)) {
        return <span key={i}>{injectCitationBadges(child)}</span>;
      }
      return child;
    });
  }
  return children;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const hasCitations = message.citations && message.citations.length > 0;
  const [showCitations, setShowCitations] = useState(false);

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

        <div className="break-words prose-keri">
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {hasCitations && (
          <div className="mt-3 pt-3 border-t border-keri-surface-light/50">
            <button
              onClick={() => setShowCitations(!showCitations)}
              className="flex items-center gap-1.5 text-xs font-medium text-keri-text-muted hover:text-keri-text transition-colors"
            >
              <span>Sources ({message.citations!.length})</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`w-3.5 h-3.5 transition-transform ${showCitations ? 'rotate-180' : ''}`}
              >
                <path
                  fillRule="evenodd"
                  d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {showCitations && (
              <div className="flex flex-col gap-1.5 mt-2">
                {message.citations!.map((citation) => (
                  <SourceCitation key={citation.number} citation={citation} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
