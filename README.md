# keri-claude

Shared [Claude Code](https://claude.ai/code) context for KERI ecosystem projects.

This repo gives Claude Code deep KERI knowledge — the protocol specifications, coding style conventions, architectural context, and reference documents — so it can work effectively across any KERI project.

## Quick Start (macOS)

### 1. Clone this repo

```bash
git clone https://github.com/seriouscoderone/keri-claude.git ~/keri-claude
```

### 2. Add environment variables to your shell

Copy and paste this one-liner to add the required config to your `~/.zshrc`:

```bash
cat >> ~/.zshrc << 'EOF'

# keri-claude: shared KERI context for Claude Code
export KERI_CLAUDE_DIR="$HOME/keri-claude"
export CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1
alias keri-claude='claude --add-dir "$KERI_CLAUDE_DIR"'
EOF
source ~/.zshrc
```

This does three things:
- **`KERI_CLAUDE_DIR`** — tells your shell where keri-claude lives
- **`CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`** — enables Claude Code to load `CLAUDE.md` and rules from additional directories (required, one-time setup)
- **`keri-claude`** — alias so you can type `keri-claude` instead of `claude --add-dir ...`

### 3. Use it

From any KERI project directory:

```bash
# Using the alias (recommended)
cd ~/code/keripy
keri-claude

# Or explicitly with the env var
cd ~/code/signify-ts
claude --add-dir "$KERI_CLAUDE_DIR"
```

Claude will now have full KERI context: specifications, coding style, architectural knowledge, and skills.

## Setup for Other Environments

### macOS with bash

If you use bash instead of zsh, replace `~/.zshrc` with `~/.bash_profile`:

```bash
cat >> ~/.bash_profile << 'EOF'

# keri-claude: shared KERI context for Claude Code
export KERI_CLAUDE_DIR="$HOME/keri-claude"
export CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1
alias keri-claude='claude --add-dir "$KERI_CLAUDE_DIR"'
EOF
source ~/.bash_profile
```

### Windows (PowerShell)

Add to your PowerShell profile (`$PROFILE`):

```powershell
# Open profile in editor (creates it if it doesn't exist)
if (!(Test-Path -Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force }
notepad $PROFILE
```

Add these lines:

```powershell
# keri-claude: shared KERI context for Claude Code
$env:KERI_CLAUDE_DIR = "$env:USERPROFILE\keri-claude"
$env:CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD = "1"
function keri-claude { claude --add-dir $env:KERI_CLAUDE_DIR @args }
```

### Windows (cmd.exe)

Set environment variables permanently via System Properties, or use:

```cmd
setx KERI_CLAUDE_DIR "%USERPROFILE%\keri-claude"
setx CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD 1
```

Then create a batch file at `%USERPROFILE%\keri-claude.cmd`:

```cmd
@echo off
claude --add-dir "%KERI_CLAUDE_DIR%" %*
```

Add `%USERPROFILE%` to your `PATH` if it isn't already.

### Linux

Same as the macOS zsh/bash instructions above. Use `~/.bashrc` for bash or `~/.zshrc` for zsh:

```bash
cat >> ~/.bashrc << 'EOF'

# keri-claude: shared KERI context for Claude Code
export KERI_CLAUDE_DIR="$HOME/keri-claude"
export CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1
alias keri-claude='claude --add-dir "$KERI_CLAUDE_DIR"'
EOF
source ~/.bashrc
```

## Custom Clone Location

If you cloned keri-claude somewhere other than `~/keri-claude`, just update `KERI_CLAUDE_DIR` to point to wherever you put it:

```bash
export KERI_CLAUDE_DIR="/path/to/your/keri-claude"
```

## What's Included

### CLAUDE.md
Shared context for all KERI projects:
- Repository overview and project dependency graph
- Key architectural concepts (CESR, KERIA, Signify, browser extension auth)
- Common development commands for every project (keripy, keria, keriox, signify-ts, etc.)
- Shared dependencies and system requirements

### Skills

**keri-style** — KERI coding style guide implementing the "Domain-Specific Gerund-Agent Pattern with CESR-Native Nomenclature":
- Gerund module names (`-ing` suffix)
- Agent noun classes (`-er` suffix)
- Codex patterns (`-Dex` suffix)
- Transformation functions (`-ify` suffix)
- CESR-native abbreviations (`qb64`, `qb2`, `hs`, `ss`, etc.)

**keri-blog** — Blog writing skill for KERI.host. Handles creating, editing, and reviewing blog posts in the project's distinctive voice.

### Reference Documents (`scripts/markdown/`)

Pre-converted markdown versions of key KERI documents for Claude context:

| Document | Source |
|----------|--------|
| KERI Specification | Trust over IP / KSWG |
| CESR Specification | Trust over IP / KSWG |
| ACDC Specification | Trust over IP / KSWG |
| KERI Whitepaper | SmithSamuelM/Papers |
| Identifier Theory | SmithSamuelM/Papers |
| PAC Theorem | SmithSamuelM/Papers |
| SPAC Message | SmithSamuelM/Papers |
| signifypy API docs | WebOfTrust/signifypy |

To refresh these documents, run `scripts/download-whitepapers.sh` (requires `pandoc` and a Python venv with `pymupdf4llm`).

## License

Apache 2.0
