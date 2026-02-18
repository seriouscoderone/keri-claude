import { useChat } from './hooks/useChat';
import ChatWindow from './components/ChatWindow';

export default function App() {
  const { messages, isLoading, error, send, reset } = useChat();

  return (
    <div className="flex flex-col h-screen bg-keri-dark">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-keri-surface-light bg-keri-darker">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label="key">
            &#x1F511;
          </span>
          <h1 className="text-lg font-semibold text-keri-text">keri.host</h1>
          <span className="text-xs text-keri-text-muted ml-1">
            chat
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/review?templateURL=https://keri-host-chat-stack.s3.us-east-1.amazonaws.com/keri-chat/template.yaml&stackName=KeriChat"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
            title="Deploy in your own AWS account"
          >
            <span className="text-xs text-keri-text-muted hidden sm:inline">Deploy in your own AWS?</span>
            <img
              src="https://cdn.rawgit.com/buildkite/cloudformation-launch-stack-button-svg/master/launch-stack.svg"
              alt="Launch Stack"
              className="h-8"
            />
          </a>
          <button
            onClick={reset}
            className="px-3 py-1.5 text-sm rounded-md bg-keri-surface hover:bg-keri-surface-light text-keri-text-muted hover:text-keri-text transition-colors"
          >
            New Chat
          </button>
        </div>
      </header>

      {/* Main chat area */}
      <main className="flex-1 overflow-hidden">
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          error={error}
          onSend={send}
        />
      </main>
    </div>
  );
}
