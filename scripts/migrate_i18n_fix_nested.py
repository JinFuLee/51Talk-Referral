#!/usr/bin/env python3
"""
Fix nested keys in messages JSON by re-extracting from git history.
The original migration script only extracted flat key-value pairs,
missing nested objects like tabs: { cc: '...', ss: '...' }.
This script:
1. Gets the pre-migration version of each file from git
2. Parses the full I18N dict including nested objects using JS evaluation
3. Merges nested structures into current messages JSON
"""

import re
import json
import subprocess
import sys
from pathlib import Path

FRONTEND = Path("frontend")
PRE_COMMIT = "5e7c54c9"  # commit before migration


def git_show(commit: str, filepath: str) -> str | None:
    """Get file content from a specific git commit."""
    try:
        result = subprocess.run(
            ["git", "show", f"{commit}:{filepath}"],
            capture_output=True, text=True, timeout=5
        )
        return result.stdout if result.returncode == 0 else None
    except Exception:
        return None


def find_brace_end(text: str, start: int) -> int:
    """Find matching closing brace."""
    depth = 0
    i = start
    while i < len(text):
        ch = text[i]
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return i
        elif ch in ("'", '"'):
            q = ch
            i += 1
            while i < len(text) and text[i] != q:
                if text[i] == '\\': i += 1
                i += 1
        elif ch == '`':
            i += 1
            while i < len(text) and text[i] != '`':
                if text[i] == '\\': i += 1
                elif text[i] == '$' and i + 1 < len(text) and text[i + 1] == '{':
                    i += 2
                    td = 1
                    while i < len(text) and td > 0:
                        if text[i] == '{': td += 1
                        elif text[i] == '}': td -= 1
                        i += 1
                    continue
                i += 1
        i += 1
    return -1


def parse_js_object(text: str) -> dict:
    """
    Parse a JS object literal into a Python dict.
    Handles: nested objects, strings, template literals, arrow functions.
    """
    result = {}
    i = 0
    while i < len(text):
        # Skip whitespace and commas
        while i < len(text) and text[i] in ' \t\n\r,':
            i += 1
        if i >= len(text):
            break

        # Skip comments
        if text[i:i+2] == '//':
            while i < len(text) and text[i] != '\n':
                i += 1
            continue
        if text[i:i+2] == '/*':
            end = text.find('*/', i + 2)
            i = end + 2 if end != -1 else len(text)
            continue

        # Parse key
        key_match = re.match(r"['\"]?(\w+(?:-\w+)*)['\"]?\s*:", text[i:])
        if not key_match:
            i += 1
            continue

        key = key_match.group(1)
        i += key_match.end()

        # Skip whitespace
        while i < len(text) and text[i] in ' \t\n\r':
            i += 1

        if i >= len(text):
            break

        # Parse value
        if text[i] == '{':
            # Nested object
            end = find_brace_end(text, i)
            if end != -1:
                inner = text[i+1:end]
                result[key] = parse_js_object(inner)
                i = end + 1
            else:
                i += 1
        elif text[i] == '[':
            # Array - extract as list of strings
            bracket_end = text.find(']', i)
            if bracket_end != -1:
                arr_text = text[i+1:bracket_end]
                items = re.findall(r"'([^']*)'|\"([^\"]*)\"", arr_text)
                result[key] = [a or b for a, b in items]
                i = bracket_end + 1
            else:
                i += 1
        elif text[i] == "'":
            # Single-quoted string
            end = i + 1
            while end < len(text) and text[end] != "'":
                if text[end] == '\\': end += 1
                end += 1
            result[key] = text[i+1:end]
            i = end + 1
        elif text[i] == '"':
            # Double-quoted string
            end = i + 1
            while end < len(text) and text[end] != '"':
                if text[end] == '\\': end += 1
                end += 1
            result[key] = text[i+1:end]
            i = end + 1
        elif text[i] == '`':
            # Template literal
            end = i + 1
            while end < len(text) and text[end] != '`':
                if text[end] == '\\': end += 1
                elif text[end] == '$' and end + 1 < len(text) and text[end+1] == '{':
                    end += 2
                    td = 1
                    while end < len(text) and td > 0:
                        if text[end] == '{': td += 1
                        elif text[end] == '}': td -= 1
                        end += 1
                    continue
                end += 1
            value = text[i+1:end]
            # Convert ${param} to {param}
            value = re.sub(r'\$\{(\w+)\}', r'{\1}', value)
            result[key] = value
            i = end + 1
        elif text[i] == '(':
            # Arrow function: (params) => `template` or (params) => 'string' + ...
            # Find the arrow =>
            arrow = text.find('=>', i)
            if arrow != -1:
                after_arrow = arrow + 2
                while after_arrow < len(text) and text[after_arrow] in ' \t\n\r':
                    after_arrow += 1
                if after_arrow < len(text) and text[after_arrow] == '`':
                    # Template literal function
                    end = after_arrow + 1
                    while end < len(text) and text[end] != '`':
                        if text[end] == '\\': end += 1
                        elif text[end] == '$' and end + 1 < len(text) and text[end+1] == '{':
                            end += 2
                            td = 1
                            while end < len(text) and td > 0:
                                if text[end] == '{': td += 1
                                elif text[end] == '}': td -= 1
                                end += 1
                            continue
                        end += 1
                    value = text[after_arrow+1:end]
                    value = re.sub(r'\$\{(\w+)\}', r'{\1}', value)
                    result[key] = value
                    i = end + 1
                elif after_arrow < len(text) and text[after_arrow] == "'":
                    # String concatenation - try to parse
                    # Find end of expression (next comma at same nesting level or end)
                    depth = 0
                    end = after_arrow
                    while end < len(text):
                        if text[end] in '({[': depth += 1
                        elif text[end] in ')}]': depth -= 1
                        elif text[end] == ',' and depth == 0: break
                        elif text[end] == '\n' and depth == 0:
                            # Check if next non-ws is a key
                            rest = text[end:].lstrip()
                            if re.match(r'\w+\s*:', rest):
                                break
                        end += 1
                    expr = text[after_arrow:end].strip().rstrip(',')
                    # Extract strings from concatenation
                    parts = re.split(r'\s*\+\s*', expr)
                    result_parts = []
                    param_names = re.findall(r'\((\w+)', text[i:arrow])
                    for part in parts:
                        part = part.strip()
                        sm = re.match(r"^['\"](.+?)['\"]$", part)
                        if sm:
                            result_parts.append(sm.group(1))
                        elif part in param_names:
                            result_parts.append(f'{{{part}}}')
                        else:
                            result_parts.append(f'{{{part}}}')
                    result[key] = ''.join(result_parts)
                    i = end
                else:
                    # Skip unknown function pattern
                    i = arrow + 2
            else:
                i += 1
        else:
            # Skip unknown value
            # Find next comma or newline
            end = i
            while end < len(text) and text[end] not in ',\n':
                end += 1
            i = end + 1

    return result


def extract_locale_data(content: str, locale: str) -> dict | None:
    """Extract a locale section from I18N dict content."""
    # Find the I18N block first
    i18n_match = re.search(r'const I18N\s*(?::\s*Record[^=]*)?=\s*\{', content)
    if not i18n_match:
        return None
    brace_start = content.index('{', i18n_match.start())
    brace_end = find_brace_end(content, brace_start)
    if brace_end == -1:
        return None
    block = content[brace_start+1:brace_end]

    # Find locale section
    if '-' in locale:
        pattern = rf"['\"]?{re.escape(locale)}['\"]?\s*:\s*\{{"
    else:
        pattern = rf"\b{locale}\s*:\s*\{{"
    match = re.search(pattern, block)
    if not match:
        return None
    loc_brace = block.index('{', match.start())
    loc_end = find_brace_end(block, loc_brace)
    if loc_end == -1:
        return None
    section = block[loc_brace+1:loc_end]
    return parse_js_object(section)


def derive_namespace(filepath: str) -> str:
    """Derive namespace from file path."""
    parts = filepath.replace('frontend/', '').split('/')
    if parts[0] == 'app' and len(parts) > 1 and parts[1] == '[locale]':
        if parts[-1] == 'page.tsx':
            if len(parts) == 3: return 'homePage'
            segment = parts[2]
            if segment.startswith('('): segment = parts[3] if len(parts) > 3 else segment.strip('()')
            sp = segment.split('-')
            return sp[0] + ''.join(w.capitalize() for w in sp[1:]) + 'Page'
        return Path(parts[-1]).stem
    if parts[0] == 'components':
        return Path(parts[-1]).stem
    return Path(parts[-1]).stem


def deep_merge(base: dict, override: dict) -> dict:
    """Deep merge override into base."""
    result = dict(base)
    for k, v in override.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = deep_merge(result[k], v)
        else:
            result[k] = v
    return result


def main():
    # Load current messages
    messages = {}
    for locale in ['zh', 'zh-TW', 'en', 'th']:
        msg_path = FRONTEND / 'messages' / f'{locale}.json'
        messages[locale] = json.loads(msg_path.read_text())

    # Find migration targets from git diff
    result = subprocess.run(
        ["git", "diff", "--name-only", f"{PRE_COMMIT}..HEAD", "--", "frontend/"],
        capture_output=True, text=True
    )
    changed_files = [f for f in result.stdout.strip().split('\n') if f.endswith('.tsx')]

    fixed_namespaces = 0
    fixed_keys = 0

    for filepath in sorted(changed_files):
        # Get pre-migration content
        old_content = git_show(PRE_COMMIT, filepath)
        if not old_content or 'const I18N' not in old_content:
            continue

        namespace = derive_namespace(filepath)

        for locale in ['zh', 'zh-TW', 'en', 'th']:
            data = extract_locale_data(old_content, locale)
            if not data:
                continue

            current = messages[locale].get(namespace, {})
            if not isinstance(current, dict):
                current = {}

            # Deep merge: add nested keys that are missing
            merged = deep_merge(current, data)
            if merged != current:
                messages[locale][namespace] = merged
                new_keys = len(json.dumps(merged)) - len(json.dumps(current))
                if locale == 'zh':
                    fixed_keys += new_keys // 10  # rough key count estimate
                    fixed_namespaces += 1

    # Write updated messages
    for locale in ['zh', 'zh-TW', 'en', 'th']:
        msg_path = FRONTEND / 'messages' / f'{locale}.json'
        msg_path.write_text(
            json.dumps(messages[locale], ensure_ascii=False, indent=2) + '\n',
            encoding='utf-8'
        )

    print(f"Fixed {fixed_namespaces} namespaces, ~{fixed_keys} keys added")


if __name__ == '__main__':
    main()
