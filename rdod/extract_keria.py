#!/usr/bin/env python3
"""
Extract all classes, functions, and methods from keria and produce
a taggable YAML inventory for domain mapping.

Usage:
    python3 rdod/extract_keria.py /path/to/keria/src/keria > rdod/keria_inventory.yaml
"""

import ast
import os
import sys
from pathlib import Path


# First-pass heuristic mapping: module path patterns → domain leaf
# This is a starting point — the user refines from here
MODULE_HINTS = {
    # Agency — provisioning & multi-tenancy
    "app.agenting": "cloud-agent-service/provisioning",

    # Admin API — identity management endpoints
    "app.aiding": "cloud-agent-service/api",

    # Credential management endpoints
    "app.credentialing": "acdc/credential-lifecycle",

    # Multisig group coordination
    "app.grouping": "keri/identity/thresholds",

    # HTTP indirect mode message ingestion
    "app.indirecting": "cloud-agent-service/api",

    # Exchange message history
    "app.messaging": "acdc/credential-exchange",

    # Notification system
    "app.notifying": "cloud-agent-service/api",

    # Credential presentation
    "app.presenting": "acdc/credential-exchange/negotiation",

    # OpenAPI spec generation
    "app.specing": "cloud-agent-service/api",

    # Watcher support (empty placeholder)
    "app.watching": "keri/integrity/detection",

    # CLI
    "app.cli": "cloud-agent-service",

    # Core — authentication
    "core.authing": "cloud-agent-service/api",

    # Core — HTTP utilities
    "core.httping": "cloud-agent-service/api",

    # Core — remote key management (Signify protocol)
    "core.keeping": "signify-client/key-management",

    # Core — async operation tracking
    "core.longrunning": "cloud-agent-service/processing",

    # Database — multi-tenant agency DB + credential search
    "db.basing": "cloud-agent-service/provisioning",

    # OOBI endpoint
    "end.ending": "discovery",

    # Peer exchange
    "peer.exchanging": "acdc/credential-exchange/negotiation",

    # Testing
    "testing": "_cross-cutting/testing",

    # Entry point
    "__main__": "cloud-agent-service",
}

# Per-symbol overrides for cross-cutting modules (e.g., eventing.py)
SYMBOL_OVERRIDES = {
    # agenting.py — mixed concerns
    "app.agenting.Agency": "cloud-agent-service/provisioning",
    "app.agenting.Agent": "cloud-agent-service/provisioning",
    "app.agenting.setup": "cloud-agent-service/api",
    "app.agenting.Witnesser": "keri/accountability/receipting",
    "app.agenting.Delegator": "keri/delegation/lifecycle",
    "app.agenting.Escrower": "cloud-agent-service/processing",
    "app.agenting.GroupRequester": "keri/identity/thresholds",
    "app.agenting.Querier": "keri/identity/state",

    # aiding.py — mixed identity + contacts
    "app.aiding.IdentifierCollectionEnd": "keri/identity/establishment",
    "app.aiding.IdentifierResourceEnd": "keri/identity/state",
    "app.aiding.EndRoleCollectionEnd": "discovery",
    "app.aiding.EndRoleResourceEnd": "discovery",
    "app.aiding.ChallengeCollectionEnd": "keri/identity/key-commitment",
    "app.aiding.ChallengeResourceEnd": "keri/identity/key-commitment",
    "app.aiding.ContactCollectionEnd": "cloud-agent-service/api",
    "app.aiding.ContactResourceEnd": "cloud-agent-service/api",
    "app.aiding.RpyEscrowCollectionEnd": "keri/identity",

    # credentialing.py — mixed lifecycle + registry
    "app.credentialing.RegistryCollectionEnd": "acdc/credential-lifecycle/registry",
    "app.credentialing.CredentialCollectionEnd": "acdc/credential-lifecycle/status",
    "app.credentialing.CredentialResourceEnd": "acdc/credential-lifecycle/status",
    "app.credentialing.CredentialQueryCollectionEnd": "acdc/credential-lifecycle",
    "app.credentialing.SchemaResourceEnd": "acdc/credential-lifecycle",
    "app.credentialing.SchemaCollectionEnd": "acdc/credential-lifecycle",
    "app.credentialing.Registrar": "acdc/credential-lifecycle/status",
    "app.credentialing.Credentialer": "acdc/credential-lifecycle/status",

    # db/basing.py — mixed provisioning + search
    "db.basing.AgencyBaser": "cloud-agent-service/provisioning",
    "db.basing.Seeker": "acdc/credential-lifecycle",
}


def module_path(filepath: Path, root: Path) -> str:
    """Convert file path to dotted module path relative to keri/."""
    rel = filepath.relative_to(root)
    parts = list(rel.with_suffix("").parts)
    # Remove leading 'keri' or 'keria' if present
    if parts and parts[0] in ("keri", "keria"):
        parts = parts[1:]
    return ".".join(parts)


def extract_symbols(filepath: Path) -> list[dict]:
    """Extract classes and top-level functions from a Python file via AST."""
    try:
        source = filepath.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(filepath))
    except (SyntaxError, UnicodeDecodeError):
        return []

    symbols = []
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.ClassDef):
            symbols.append({
                "type": "class",
                "name": node.name,
                "line": node.lineno,
                "methods": [],
            })
            for item in ast.iter_child_nodes(node):
                if isinstance(item, ast.FunctionDef | ast.AsyncFunctionDef):
                    if not item.name.startswith("_"):
                        symbols[-1]["methods"].append({
                            "name": item.name,
                            "line": item.lineno,
                        })
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            symbols.append({
                "type": "function",
                "name": node.name,
                "line": node.lineno,
            })
    return symbols


def resolve_domain(mod_path: str, symbol_name: str) -> str:
    """Look up domain: symbol override first, then module hint (prefix match), else unmapped."""
    qualname = f"{mod_path}.{symbol_name}"
    if qualname in SYMBOL_OVERRIDES:
        return SYMBOL_OVERRIDES[qualname]
    if mod_path in MODULE_HINTS:
        return MODULE_HINTS[mod_path]
    # Prefix match: cli.commands.mailbox.list matches cli.commands.mailbox
    parts = mod_path.split(".")
    for i in range(len(parts), 0, -1):
        prefix = ".".join(parts[:i])
        if prefix in MODULE_HINTS:
            return MODULE_HINTS[prefix]
    return "UNMAPPED"


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} /path/to/keripy/src/keri", file=sys.stderr)
        sys.exit(1)

    keri_root = Path(sys.argv[1])
    if not keri_root.is_dir():
        print(f"Error: {keri_root} is not a directory", file=sys.stderr)
        sys.exit(1)

    # We need the parent of keri/ as the root for module path calculation
    src_root = keri_root.parent

    # Collect all .py files
    py_files = sorted(keri_root.rglob("*.py"))

    # Skip __pycache__, test files, demo files
    py_files = [
        f for f in py_files
        if "__pycache__" not in str(f)
        and "/test" not in str(f)
        and "/demo/" not in str(f)
    ]

    # Group by domain
    domain_map: dict[str, list[dict]] = {}
    stats = {"classes": 0, "functions": 0, "methods": 0, "files": 0}

    for filepath in py_files:
        mod_path = module_path(filepath, src_root)
        symbols = extract_symbols(filepath)
        if not symbols:
            continue

        stats["files"] += 1

        for sym in symbols:
            domain = resolve_domain(mod_path, sym["name"])

            if domain not in domain_map:
                domain_map[domain] = []

            if sym["type"] == "class":
                stats["classes"] += 1
                entry = {
                    "qualname": f"{mod_path}.{sym['name']}",
                    "type": "class",
                    "line": sym["line"],
                    "file": str(filepath.relative_to(keri_root.parent)),
                }
                if sym.get("methods"):
                    entry["methods"] = [
                        f"{m['name']} (L{m['line']})" for m in sym["methods"]
                    ]
                    stats["methods"] += len(sym["methods"])
                domain_map[domain].append(entry)

            elif sym["type"] == "function":
                stats["functions"] += 1
                # Skip private functions
                if sym["name"].startswith("_"):
                    continue
                domain_map[domain].append({
                    "qualname": f"{mod_path}.{sym['name']}",
                    "type": "function",
                    "line": sym["line"],
                    "file": str(filepath.relative_to(keri_root.parent)),
                })

    # Output YAML
    print("# keripy → DDD domain mapping")
    print(f"# Extracted: {stats['files']} files, {stats['classes']} classes, "
          f"{stats['functions']} functions, {stats['methods']} public methods")
    print(f"# Auto-mapped by module/symbol heuristics — review UNMAPPED items")
    print()

    # Sort: UNMAPPED first (the interesting part), then alphabetical
    sorted_domains = sorted(domain_map.keys(), key=lambda d: ("0" if d == "UNMAPPED" else "1") + d)

    for domain in sorted_domains:
        items = domain_map[domain]
        print(f"{domain}:  # {len(items)} items")
        for item in sorted(items, key=lambda x: x["qualname"]):
            tag = "class" if item["type"] == "class" else "fn"
            print(f"  - {item['qualname']}  # {tag} @ {item['file']}:{item['line']}")
            if item.get("methods"):
                for m in item["methods"]:
                    print(f"    # .{m}")
        print()


if __name__ == "__main__":
    main()
