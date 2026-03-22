#!/usr/bin/env python3
"""
Extract all classes, functions, and methods from keripy and produce
a taggable YAML inventory for domain mapping.

Usage:
    python3 rdod/extract_keripy.py /path/to/keripy/src/keri > rdod/keripy_inventory.yaml
"""

import ast
import os
import sys
from pathlib import Path


# First-pass heuristic mapping: module path patterns → domain leaf
# This is a starting point — the user refines from here
MODULE_HINTS = {
    # CESR primitives
    "core.coring": "cesr/primitives",
    "core.signing": "cesr/primitives",
    "core.indexing": "cesr/primitives",
    "core.counting": "cesr/composition",
    "core.structing": "cesr/composition",
    "core.serdering": "cesr/composition",

    # KERI protocol
    "core.eventing": "keri/identity",  # cross-cutting, needs per-symbol refinement
    "core.parsing": "keri/identity/establishment",
    "core.routing": "keri/identity",
    "core.scheming": "cesr/primitives",
    "core.kraming": "cloud-agent-service/api",
    "core.mapping": "cesr/composition",
    "core.annotating": "cesr/composition",

    # Database — infrastructure, mapped to the domain it primarily serves
    "db.dbing": "_infrastructure/database",
    "db.basing": "_infrastructure/database",
    "db.subing": "_infrastructure/database",
    "db.koming": "_infrastructure/database",
    "db.escrowing": "_infrastructure/database",

    # App layer
    "app.habbing": "local-agent",
    "app.keeping": "local-agent",
    "app.directing": "local-agent",
    "app.agenting": "keri/accountability/receipting",
    "app.indirecting": "keri/accountability/dissemination",
    "app.delegating": "keri/delegation/lifecycle",
    "app.oobiing": "discovery",
    "app.grouping": "keri/identity/thresholds",
    "app.notifying": "cloud-agent-service/api",
    "app.signaling": "cloud-agent-service/api",
    "app.forwarding": "cloud-agent-service/processing",
    "app.querying": "keri/identity/state",
    "app.challenging": "keri/identity/key-commitment",
    "app.watching": "keri/integrity/detection",
    "app.organizing": "local-agent",
    "app.storing": "local-agent",
    "app.configing": "local-agent",
    "app.httping": "cloud-agent-service/api",
    "app.apping": "local-agent",
    "app.signing": "cesr/primitives",
    "app.specing": "cloud-agent-service/api",

    # VDR
    "vdr.eventing": "acdc/credential-lifecycle/status",
    "vdr.credentialing": "acdc/credential-lifecycle/status",
    "vdr.viring": "acdc/credential-lifecycle",
    "vdr.verifying": "acdc/credential-lifecycle/verification",

    # VC / IPEX
    "vc.protocoling": "acdc/credential-exchange/negotiation",
    "vc.walleting": "acdc/credential-lifecycle",
    "vc.proving": "acdc/privacy/disclosure",

    # ACDC
    "acdc.messaging": "acdc/credential-exchange/negotiation",

    # Peer
    "peer.exchanging": "acdc/credential-exchange/negotiation",

    # Help
    "help": "_cross-cutting/utilities",
    "help.helping": "_cross-cutting/utilities",
    "help.ogling": "_cross-cutting/utilities",

    # CLI — each command group maps to the domain it serves
    "cli.kli": "local-agent/api",
    "cli.common.existing": "local-agent/api",
    "cli.common.displaying": "local-agent/api",
    "cli.common.parsing": "local-agent/api",
    "cli.common.rotating": "local-agent/api",
    "cli.common.terming": "local-agent/api",
    "cli.common.config": "local-agent/api",

    # Identity establishment
    "cli.commands.incept": "keri/identity/establishment",
    "cli.commands.rotate": "keri/identity/establishment",
    "cli.commands.init": "keri/identity/establishment",

    # Identity anchoring
    "cli.commands.interact": "keri/identity/anchoring",

    # Identity state
    "cli.commands.status": "keri/identity/state",
    "cli.commands.kevers": "keri/identity/state",
    "cli.commands.query": "keri/identity/state",
    "cli.commands.aid": "keri/identity/state",
    "cli.commands.list": "keri/identity/state",
    "cli.commands.rename": "keri/identity/state",
    "cli.commands.event": "keri/identity/state",
    "cli.commands.rollback": "keri/identity/state",

    # Identity thresholds (multisig)
    "cli.commands.multisig": "keri/identity/thresholds",
    "cli.commands.multisig.incept": "keri/identity/thresholds",
    "cli.commands.multisig.rotate": "keri/identity/thresholds",
    "cli.commands.multisig.interact": "keri/identity/thresholds",
    "cli.commands.multisig.join": "keri/identity/thresholds",
    "cli.commands.multisig.shell": "keri/identity/thresholds",
    "cli.commands.multisig.demo": "keri/identity/thresholds",
    "cli.commands.multisig.notice": "keri/identity/thresholds",
    "cli.commands.multisig.update": "keri/identity/thresholds",
    "cli.commands.multisig.continue_": "keri/identity/thresholds",

    # Key commitment (challenge-response)
    "cli.commands.challenge": "keri/identity/key-commitment",
    "cli.commands.challenge.generate": "keri/identity/key-commitment",
    "cli.commands.challenge.respond": "keri/identity/key-commitment",
    "cli.commands.challenge.verify": "keri/identity/key-commitment",

    # Delegation
    "cli.commands.delegate": "keri/delegation",
    "cli.commands.delegate.confirm": "keri/delegation/authorization",
    "cli.commands.delegate.request": "keri/delegation/lifecycle",

    # Accountability (witnesses)
    "cli.commands.witness": "keri/accountability",
    "cli.commands.witness.start": "keri/accountability/receipting",
    "cli.commands.witness.demo": "keri/accountability",
    "cli.commands.witness.authenticate": "keri/accountability",
    "cli.commands.witness.list": "keri/accountability",
    "cli.commands.witness.submit": "keri/accountability/dissemination",

    # Integrity (watchers)
    "cli.commands.watcher": "keri/integrity",
    "cli.commands.watcher.add": "keri/integrity/detection",
    "cli.commands.watcher.adjudicate": "keri/integrity/evidence",
    "cli.commands.watcher.list": "keri/integrity",

    # Credential lifecycle
    "cli.commands.vc": "acdc/credential-lifecycle",
    "cli.commands.vc.create": "acdc/credential-lifecycle/status",
    "cli.commands.vc.revoke": "acdc/credential-lifecycle/status",
    "cli.commands.vc.list": "acdc/credential-lifecycle",
    "cli.commands.vc.export": "acdc/credential-lifecycle",
    "cli.commands.vc.import_": "acdc/credential-lifecycle",
    "cli.commands.vc.registry": "acdc/credential-lifecycle/registry",
    "cli.commands.vc.registry.incept": "acdc/credential-lifecycle/registry",
    "cli.commands.vc.registry.list": "acdc/credential-lifecycle/registry",
    "cli.commands.vc.registry.status": "acdc/credential-lifecycle/registry",

    # Credential exchange (IPEX)
    "cli.commands.ipex": "acdc/credential-exchange",
    "cli.commands.ipex.grant": "acdc/credential-exchange/negotiation",
    "cli.commands.ipex.admit": "acdc/credential-exchange/negotiation",
    "cli.commands.ipex.offer": "acdc/credential-exchange/negotiation",
    "cli.commands.ipex.agree": "acdc/credential-exchange/negotiation",
    "cli.commands.ipex.apply": "acdc/credential-exchange/negotiation",
    "cli.commands.ipex.spurn": "acdc/credential-exchange/negotiation",
    "cli.commands.ipex.list": "acdc/credential-exchange",
    "cli.commands.ipex.join": "acdc/credential-exchange/negotiation",

    # Discovery (OOBI)
    "cli.commands.oobi": "discovery",
    "cli.commands.oobi.resolve": "discovery",
    "cli.commands.oobi.generate": "discovery",
    "cli.commands.introduce": "discovery",
    "cli.commands.ends": "discovery",
    "cli.commands.location": "discovery",

    # Contacts (local-agent address book)
    "cli.commands.contacts": "local-agent",
    "cli.commands.contacts.add": "local-agent",
    "cli.commands.contacts.delete": "local-agent",
    "cli.commands.contacts.find": "local-agent",
    "cli.commands.contacts.get": "local-agent",
    "cli.commands.contacts.list": "local-agent",
    "cli.commands.contacts.query": "local-agent",
    "cli.commands.contacts.rename": "local-agent",
    "cli.commands.contacts.replace": "local-agent",

    # Cloud-agent-service (mailbox, notifications)
    "cli.commands.mailbox": "cloud-agent-service/api",
    "cli.commands.notifications": "cloud-agent-service/api",
    "cli.commands.exn": "acdc/credential-exchange/negotiation",

    # Signify (passcode)
    "cli.commands.passcode": "signify-client/key-management",

    # CESR operations
    "cli.commands.sign": "cesr/primitives",
    "cli.commands.verify": "cesr/primitives",
    "cli.commands.decrypt": "cesr/primitives",
    "cli.commands.saidify": "cesr/composition",
    "cli.commands.salt": "cesr/primitives",
    "cli.commands.nonce": "cesr/primitives",
    "cli.commands.export": "cesr/composition",
    "cli.commands.import_": "cesr/composition",

    # Infrastructure
    "cli.commands.migrate": "_infrastructure/database",
    "cli.commands.escrow": "_infrastructure/database",
    "cli.commands.clean": "_infrastructure/database",
    "cli.commands.version": "local-agent/api",
    "cli.commands.time": "local-agent/api",

    # Other
    "cli.commands.did": "keri/identity/state",
    "cli.commands.ssh": "cesr/primitives",
    "cli.commands.local": "local-agent",

    # End — HTTP endpoints
    "end.ending": "cloud-agent-service/api",
    "end.priming": "cloud-agent-service/api",

    # DB migrations — infrastructure
    "db.migrations": "_infrastructure/database",

    # Other
    "kering": "_cross-cutting/exceptions",
    "recording": "_cross-cutting/records",
    "spac.payloading": "_cross-cutting/utilities",
}

# Per-symbol overrides for cross-cutting modules (e.g., eventing.py)
SYMBOL_OVERRIDES = {
    # core.eventing symbols that belong to specific domains
    "core.eventing.Kever": "keri/identity/state",
    "core.eventing.Kevery": "keri/identity/establishment",
    "core.eventing.incept": "keri/identity/establishment",
    "core.eventing.rotate": "keri/identity/establishment",
    "core.eventing.interact": "keri/identity/anchoring",
    "core.eventing.receipt": "keri/accountability/receipting",
    "core.eventing.query": "keri/identity/state",
    "core.eventing.reply": "keri/identity/state",
    "core.eventing.exchange": "acdc/credential-exchange/negotiation",
    "core.eventing.messagize": "cesr/composition",
    "core.eventing.verifySigs": "keri/identity/state",
    "core.eventing.validateSigs": "keri/identity/state",
    "core.eventing.delcept": "keri/delegation/authorization",
    "core.eventing.deltate": "keri/delegation/authorization",

    # core.coring symbols
    "core.coring.Tholder": "keri/identity/thresholds",
    "core.coring.Saider": "cesr/primitives",
    "core.coring.Sadder": "cesr/composition",

    # vdr
    "vdr.eventing.Tever": "acdc/credential-lifecycle/status",
    "vdr.eventing.Tevery": "acdc/credential-lifecycle/verification",
    "vdr.credentialing.Regery": "acdc/credential-lifecycle/registry",
    "vdr.credentialing.Registrar": "acdc/credential-lifecycle/status",
    "vdr.credentialing.Credentialer": "acdc/credential-lifecycle/status",
    "vdr.credentialing.Registry": "acdc/credential-lifecycle/registry",
    "vdr.credentialing.SignifyRegistry": "acdc/credential-lifecycle/registry",
}


def module_path(filepath: Path, root: Path) -> str:
    """Convert file path to dotted module path relative to keri/."""
    rel = filepath.relative_to(root)
    parts = list(rel.with_suffix("").parts)
    # Remove leading 'keri' if present
    if parts and parts[0] == "keri":
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
