import { useState } from 'react';
import { NumberedCitation } from '../api/chat';

interface Props {
  citation: NumberedCitation;
}

function extractDocName(source: string): string {
  // Extract filename from S3 URI or path
  const parts = source.replace(/^s3:\/\/[^/]+\//, '').split('/');
  return parts[parts.length - 1] ?? source;
}

export default function SourceCitation({ citation }: Props) {
  const [expanded, setExpanded] = useState(false);
  const docName = extractDocName(citation.source);

  return (
    <div className="rounded-lg bg-keri-darker/60 border border-keri-surface-light/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-keri-text-muted hover:text-keri-text transition-colors text-left"
      >
        <span className="flex items-center gap-2 truncate mr-2">
          <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded bg-keri-accent/20 text-keri-accent-light flex-shrink-0">
            {citation.number}
          </span>
          <span className="truncate">{docName}</span>
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-2">
          <p className="text-xs text-keri-text-muted/80 leading-relaxed italic">
            {citation.content}
          </p>
          <p className="mt-1 text-[10px] text-keri-text-muted/50 truncate">
            {citation.source}
          </p>
        </div>
      )}
    </div>
  );
}
