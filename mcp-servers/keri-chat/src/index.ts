#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

// --- Configuration ---

const CHAT_API_URL =
  process.env.KERI_CHAT_URL || "https://chat.keri.host/api/chat";
const LOG_PATH = join(homedir(), ".claude", "keri-chat-log.jsonl");

// --- Conversation history (persists for subprocess lifetime) ---

interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
}

let history: HistoryEntry[] = [];

// --- SSE consumer ---

interface NumberedCitation {
  number: number;
  content: string;
  source: string;
}

interface ChatResult {
  answer: string;
  citations: NumberedCitation[];
}

interface SSEChunkEvent {
  type: "chunk";
  text: string;
}
interface SSECitationsEvent {
  type: "citations";
  data: NumberedCitation[];
}
interface SSEDoneEvent {
  type: "done";
}
interface SSEErrorEvent {
  type: "error";
  error: string;
  code?: string;
  detail?: string;
}
type SSEEvent =
  | SSEChunkEvent
  | SSECitationsEvent
  | SSEDoneEvent
  | SSEErrorEvent;

async function queryKeriChat(
  question: string,
  conversationHistory: HistoryEntry[]
): Promise<ChatResult> {
  const res = await fetch(CHAT_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: question, history: conversationHistory }),
    signal: AbortSignal.timeout(55_000),
  });

  if (!res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/event-stream")) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        detail = body.error || body.detail || detail;
      } catch {
        // ignore parse failure
      }
      throw new Error(
        `Chat API error: ${detail} (this may indicate an IP allowlist issue)`
      );
    }
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    throw new Error(
      `Unexpected content-type: ${contentType}. Expected text/event-stream. Check that the URL is correct and your IP is allowlisted.`
    );
  }

  if (!res.body) {
    throw new Error("No response body from chat API");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let citations: NumberedCitation[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (!json) continue;

      let event: SSEEvent;
      try {
        event = JSON.parse(json);
      } catch {
        continue;
      }

      switch (event.type) {
        case "chunk":
          answer += event.text;
          break;
        case "citations":
          citations = event.data;
          break;
        case "error":
          throw new Error(
            `Chat API error [${event.code ?? "UNKNOWN"}]: ${event.error}${event.detail ? ` — ${event.detail}` : ""}`
          );
        case "done":
          return { answer, citations };
      }
    }
  }

  return { answer, citations };
}

// --- Logging ---

async function logEntry(question: string, result: ChatResult): Promise<void> {
  const entry = {
    timestamp: new Date().toISOString(),
    question,
    answer: result.answer,
    citations: result.citations,
  };
  try {
    await appendFile(LOG_PATH, JSON.stringify(entry) + "\n");
  } catch {
    // Non-fatal: log directory may not exist yet on first run
  }
}

// --- MCP server ---

const server = new McpServer({
  name: "keri-chat",
  version: "1.0.0",
});

server.tool(
  "ask_keri_chat",
  "Query the keri.host knowledge base for spec-grounded answers about KERI, CESR, and ACDC. Maintains conversation history across calls for follow-up questions.",
  {
    question: z.string().describe("The KERI/CESR/ACDC question to ask"),
    reset_history: z
      .boolean()
      .optional()
      .default(false)
      .describe("Clear conversation history before asking (start fresh topic)"),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })
      )
      .optional()
      .describe(
        "Explicit conversation history (overrides auto-accumulated history for this call)"
      ),
  },
  async ({ question, reset_history, history: explicitHistory }) => {
    if (reset_history) {
      history = [];
    }

    const effectiveHistory = explicitHistory ?? history;
    const result = await queryKeriChat(question, effectiveHistory);

    // Update conversation history
    history.push({ role: "user", content: question });
    history.push({ role: "assistant", content: result.answer });

    // Log asynchronously (don't block response)
    logEntry(question, result).catch(() => {});

    // Format output
    let text = result.answer;
    if (result.citations.length > 0) {
      text += "\n\n---\n**Sources:**\n";
      for (const c of result.citations) {
        text += `- [${c.number}] ${c.source}: ${c.content.slice(0, 150)}${c.content.length > 150 ? "..." : ""}\n`;
      }
    }

    return { content: [{ type: "text" as const, text }] };
  }
);

// --- Startup ---

async function main(): Promise<void> {
  // Ensure log directory exists
  await mkdir(join(homedir(), ".claude"), { recursive: true });

  console.error(`keri-chat MCP server starting (endpoint: ${CHAT_API_URL})`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
