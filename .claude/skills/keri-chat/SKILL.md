---
name: keri-chat
description: >-
  KERI architecture specialist and devil's advocate. Auto-activates when
  reviewing KERI implementations, evaluating spec compliance, or making
  architecture decisions about KERI/CESR/ACDC. Queries the keri.host chat
  API for spec-grounded answers with citations.
---

# keri-chat

Query the keri.host knowledge base for spec-grounded answers about KERI, CESR, and ACDC.

## When to Activate

- Reviewing KERI protocol implementations for spec compliance
- Evaluating architecture decisions involving KERI/CESR/ACDC
- Answering questions about KERI specification details
- Stress-testing designs against the specification

## How to Query

Use the `ask_keri_chat` MCP tool. It maintains conversation history automatically across calls.

```
ask_keri_chat({ question: "What is pre-rotation in KERI?" })
```

For follow-up questions, just call again — history is preserved:

```
ask_keri_chat({ question: "How does that differ from delegation?" })
```

To start a fresh topic, reset the conversation:

```
ask_keri_chat({ question: "Explain CESR encoding", reset_history: true })
```

### Curl fallback

If the MCP server is unavailable, query the API directly:

```bash
QUESTION='<your question>'
RESULT=$(curl -sN https://chat.keri.host/api/chat \
  -H 'Content-Type: application/json' \
  -d "{\"message\":\"$QUESTION\",\"history\":[]}" \
  | grep '^data: ' | sed 's/^data: //' \
  | jq -s '{
      answer: [.[] | select(.type=="chunk") | .text] | join(""),
      citations: ([.[] | select(.type=="citations") | .data] | add // [])
    }')
echo "$RESULT"
```

### Attachments (curl only)

The request body accepts an optional `attachments` array for including file content with a question:

```json
{
  "message": "Summarize this document",
  "history": [],
  "attachments": [
    {"name": "file.txt", "type": "text/plain", "content": "<base64-encoded content>"}
  ]
}
```

Each attachment has `name` (filename), `type` (MIME type), and `content` (base64-encoded).

## SSE Event Types

The backend emits newline-delimited SSE events (`data: {JSON}\n\n`):

| Type | Shape | Description |
|------|-------|-------------|
| `chunk` | `{type: "chunk", text: "..."}` | Incremental answer text |
| `citations` | `{type: "citations", data: [{number, content, source}, ...]}` | Sent after answer completes |
| `done` | `{type: "done"}` | Stream end signal |
| `error` | `{type: "error", error, code, detail}` | Error (see codes below) |

### Error codes

- `BAD_REQUEST` — missing `message` field
- `MODEL_ACCESS_REQUIRED` — Anthropic use case details not yet submitted in Bedrock console
- `MARKETPLACE_SUBSCRIPTION` — Bedrock Marketplace subscription still provisioning
- `THROTTLED` — rate-limited, retry after a moment
- `INTERNAL_ERROR` — unexpected server error

## Query Log

Every query and response is appended to `~/.claude/keri-chat-log.jsonl`. Each line is a JSON object:

```json
{"timestamp":"2026-02-16T20:30:00Z","question":"What is pre-rotation?","answer":"Pre-rotation is...","citations":[...]}
```

Review the log:

```bash
# Last 5 queries
tail -5 ~/.claude/keri-chat-log.jsonl | jq .

# Search by keyword
grep -i 'delegation' ~/.claude/keri-chat-log.jsonl | jq .
```

## Personas

### KERI Architect Reviewer

When reviewing code or designs:

1. Before making any spec claim, verify it via `ask_keri_chat`
2. Cite specific specification sections in your review
3. Identify deviations from the spec with exact references
4. Suggest corrections that align with spec language

### Devil's Advocate

When stress-testing designs or assumptions:

1. Query `ask_keri_chat` to find edge cases in the spec
2. Challenge assumptions by citing counter-examples from the specification
3. Ask "what if" questions grounded in spec-defined failure modes
4. Verify that error handling covers all spec-defined error conditions

## Hosted MCP Endpoint

Every KeriChat deployment includes a hosted MCP endpoint at `/mcp`. Users with a deployment can configure Claude Code to use it directly — no local MCP server install needed:

```json
{
  "mcpServers": {
    "keri-chat": {
      "type": "url",
      "url": "https://<your-domain>/mcp"
    }
  }
}
```

The hosted endpoint exposes the same `ask_keri_chat` tool. Since it's stateless (Lambda), conversation history is passed explicitly via the `history` parameter rather than auto-accumulated.

## Guidelines

- Always query the API before making authoritative spec claims
- Include citation numbers from the API response in your analysis
- If the API returns "I don't have information about that", say so explicitly
- Prefer specification language over paraphrasing when precision matters
- Cross-reference multiple queries for complex topics
