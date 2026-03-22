#!/usr/bin/env python3
"""
Generate the RDOD_DATA blob in context-map.html from domain YAML files.

Reads all domain.yaml files recursively from rdod/spec/domains/, enriches them
with ports.yaml and ubiquitous-language.yaml data, and replaces the RDOD_DATA
JSON blob in context-map.html.

Usage:
    python3 rdod/generate_context_map.py
"""

import json
import os
import re
import sys

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML is required. Install with: pip3 install pyyaml")
    sys.exit(1)


# Paths relative to the repo root
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
DOMAINS_DIR = os.path.join(REPO_ROOT, "rdod", "spec", "domains")
CONTEXT_MAP_HTML = os.path.join(DOMAINS_DIR, "context-map.html")


def find_domain_dirs(base_dir):
    """Find all directories containing a domain.yaml file."""
    domain_dirs = []
    for root, _dirs, files in os.walk(base_dir):
        if "domain.yaml" in files:
            domain_dirs.append(root)
    return sorted(domain_dirs)


def load_yaml_file(path):
    """Load a YAML file, returning None if it doesn't exist or fails to parse."""
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    except Exception as e:
        print(f"  WARNING: Failed to parse {path}: {e}")
        return None


def build_domain_entry(domain_dir, base_dir):
    """Build a single domain entry from its YAML files."""
    # Compute the relative path as the domain ID
    rel_path = os.path.relpath(domain_dir, base_dir)
    # Normalize path separators
    rel_path = rel_path.replace(os.sep, "/")

    # Load the three YAML files
    domain_data = load_yaml_file(os.path.join(domain_dir, "domain.yaml"))
    if domain_data is None:
        return None, None

    ports_data = load_yaml_file(os.path.join(domain_dir, "ports.yaml"))
    ul_data = load_yaml_file(os.path.join(domain_dir, "ubiquitous-language.yaml"))

    # Use the id from domain.yaml if present, otherwise use the relative path
    domain_id = domain_data.get("id", rel_path)

    # Build the entry matching the RDOD_DATA format
    entry = {}

    # Core fields from domain.yaml
    if "template_version" in domain_data:
        entry["template_version"] = domain_data["template_version"]

    entry["id"] = domain_id

    if "name" in domain_data:
        entry["name"] = domain_data["name"]

    if "description" in domain_data:
        entry["description"] = domain_data["description"]

    if "version" in domain_data:
        entry["version"] = domain_data["version"]

    if "type" in domain_data:
        entry["type"] = domain_data["type"]

    # Source material
    if "source_material" in domain_data:
        entry["source_material"] = domain_data["source_material"]

    # Ubiquitous language: merge from domain.yaml and ubiquitous-language.yaml
    ul_terms = []
    if "ubiquitous_language" in domain_data and domain_data["ubiquitous_language"]:
        ul_terms.extend(domain_data["ubiquitous_language"])

    # ubiquitous-language.yaml may have additional/richer terms
    if ul_data and "terms" in ul_data and ul_data["terms"]:
        # Build a set of term names already present from domain.yaml
        existing_terms = {t.get("term") for t in ul_terms}
        # The UL file typically has richer definitions; replace domain.yaml terms
        # with the more detailed versions from ubiquitous-language.yaml
        ul_file_terms = ul_data["terms"]
        merged = []
        ul_file_by_name = {t.get("term"): t for t in ul_file_terms}
        # Start with UL file terms (richer), then add any from domain.yaml not in UL file
        for t in ul_file_terms:
            merged.append(t)
        for t in ul_terms:
            if t.get("term") not in ul_file_by_name:
                merged.append(t)
        ul_terms = merged

    if ul_terms:
        entry["ubiquitous_language"] = ul_terms

    # Relationships
    entry["domain_clients"] = domain_data.get("domain_clients", []) or []
    entry["subdomains"] = domain_data.get("subdomains", []) or []
    entry["kernels"] = domain_data.get("kernels", []) or []
    entry["adjacents"] = domain_data.get("adjacents", []) or []
    entry["externals"] = domain_data.get("externals", []) or []

    # Implementation guidance
    if "implementation_guidance" in domain_data and domain_data["implementation_guidance"]:
        entry["implementation_guidance"] = domain_data["implementation_guidance"]

    # Issues
    entry["issues"] = domain_data.get("issues", []) or []

    # Tags
    if "tags" in domain_data and domain_data["tags"]:
        entry["tags"] = domain_data["tags"]

    # _source: relative path to domain.yaml from the repo root
    source_rel = os.path.relpath(
        os.path.join(domain_dir, "domain.yaml"), REPO_ROOT
    ).replace(os.sep, "/")
    entry["_source"] = source_rel

    # _events from ubiquitous-language.yaml
    events = []
    if ul_data and "events" in ul_data and ul_data["events"]:
        events = ul_data["events"]
    elif "events" in domain_data and domain_data["events"]:
        events = domain_data["events"]
    if events:
        entry["_events"] = events

    # _rules from ubiquitous-language.yaml
    rules = []
    if ul_data and "rules" in ul_data and ul_data["rules"]:
        rules = ul_data["rules"]
    elif "rules" in domain_data and domain_data["rules"]:
        rules = domain_data["rules"]
    if rules:
        entry["_rules"] = rules

    # _ports from ports.yaml
    if ports_data and "ports" in ports_data and ports_data["ports"]:
        entry["_ports"] = ports_data["ports"]

    return domain_id, entry


def build_rdod_data(base_dir):
    """Build the complete RDOD_DATA dictionary from all domain directories."""
    domain_dirs = find_domain_dirs(base_dir)
    rdod_data = {}
    skipped = 0

    for domain_dir in domain_dirs:
        domain_id, entry = build_domain_entry(domain_dir, base_dir)
        if domain_id is None:
            skipped += 1
            continue
        rdod_data[domain_id] = entry

    return rdod_data, skipped


def replace_rdod_data_in_html(html_content, rdod_data):
    """Replace the RDOD_DATA blob in the HTML content.

    Finds the pattern:
        const RDOD_DATA = {
            ...
        };
        const RDOD_SCHEMA = ...

    And replaces everything between 'const RDOD_DATA = ' and the '};' before 'const RDOD_SCHEMA'.
    """
    # Pattern: match from "const RDOD_DATA = " to the closing "};" that precedes "const RDOD_SCHEMA"
    pattern = r'(const RDOD_DATA = )(\{.*?\})(\s*;\s*\n)(const RDOD_SCHEMA)'
    # Use DOTALL so . matches newlines
    match = re.search(pattern, html_content, re.DOTALL)
    if not match:
        print("ERROR: Could not find RDOD_DATA blob in context-map.html")
        print("  Expected pattern: 'const RDOD_DATA = { ... };' followed by 'const RDOD_SCHEMA'")
        sys.exit(1)

    # Format the new JSON blob with 2-space indentation
    new_json = json.dumps(rdod_data, indent=2, ensure_ascii=False)

    # Reconstruct: prefix + new data + semicolon/newline + RDOD_SCHEMA
    new_html = (
        html_content[: match.start()]
        + match.group(1)
        + new_json
        + match.group(3)
        + match.group(4)
        + html_content[match.end():]
    )

    return new_html


def main():
    print(f"Domains directory: {DOMAINS_DIR}")
    print(f"Context map HTML:  {CONTEXT_MAP_HTML}")
    print()

    # Verify paths exist
    if not os.path.isdir(DOMAINS_DIR):
        print(f"ERROR: Domains directory not found: {DOMAINS_DIR}")
        sys.exit(1)
    if not os.path.isfile(CONTEXT_MAP_HTML):
        print(f"ERROR: context-map.html not found: {CONTEXT_MAP_HTML}")
        sys.exit(1)

    # Build RDOD_DATA from YAML files
    print("Scanning for domain.yaml files...")
    rdod_data, skipped = build_rdod_data(DOMAINS_DIR)

    # Print summary
    print(f"\nDomains loaded: {len(rdod_data)}")
    if skipped:
        print(f"Domains skipped (parse errors): {skipped}")

    # Categorize by depth
    top_level = []
    mid_level = []
    leaf_level = []
    for domain_id in sorted(rdod_data.keys()):
        depth = domain_id.count("/")
        if depth == 0:
            top_level.append(domain_id)
        elif depth == 1:
            mid_level.append(domain_id)
        else:
            leaf_level.append(domain_id)

    print(f"  Top-level domains ({len(top_level)}): {', '.join(top_level)}")
    print(f"  Mid-level domains ({len(mid_level)}): {', '.join(mid_level)}")
    print(f"  Leaf domains ({len(leaf_level)}): {len(leaf_level)} domains")

    # Count enrichment data
    with_ports = sum(1 for d in rdod_data.values() if "_ports" in d)
    with_events = sum(1 for d in rdod_data.values() if "_events" in d)
    with_rules = sum(1 for d in rdod_data.values() if "_rules" in d)
    with_ul = sum(1 for d in rdod_data.values() if "ubiquitous_language" in d)
    print(f"\nEnrichment: {with_ports} with ports, {with_events} with events, "
          f"{with_rules} with rules, {with_ul} with ubiquitous language")

    # Read existing HTML
    print(f"\nReading {CONTEXT_MAP_HTML}...")
    with open(CONTEXT_MAP_HTML, "r", encoding="utf-8") as f:
        html_content = f.read()

    # Replace the RDOD_DATA blob
    print("Replacing RDOD_DATA blob...")
    new_html = replace_rdod_data_in_html(html_content, rdod_data)

    # Write updated HTML
    with open(CONTEXT_MAP_HTML, "w", encoding="utf-8") as f:
        f.write(new_html)

    print(f"Updated {CONTEXT_MAP_HTML}")

    # Verify the output by extracting and parsing the JSON blob
    print("\nVerifying output...")
    verify_match = re.search(
        r'const RDOD_DATA = (\{.*?\});\s*\nconst RDOD_SCHEMA',
        new_html,
        re.DOTALL
    )
    if verify_match:
        try:
            parsed = json.loads(verify_match.group(1))
            print(f"Verification passed: RDOD_DATA contains {len(parsed)} domains")
        except json.JSONDecodeError as e:
            print(f"ERROR: Generated JSON is invalid: {e}")
            sys.exit(1)
    else:
        print("ERROR: Could not re-extract RDOD_DATA from output for verification")
        sys.exit(1)

    print("\nDone.")


if __name__ == "__main__":
    main()
