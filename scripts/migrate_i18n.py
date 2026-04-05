#!/usr/bin/env python3
"""
M41 i18n Migration: const I18N inline dicts → next-intl useTranslations

Handles:
- Simple string values: key: '文本' → messages JSON + t('key')
- Template literal functions: key: (n) => `text ${n}` → "text {n}" + t('key', { n })
- Multiple I18N dict patterns across 154 files

Usage: uv run python scripts/migrate_i18n.py [--dry-run] [--file path]
"""

import re
import json
import sys
import argparse
from pathlib import Path
from collections import OrderedDict

FRONTEND = Path("frontend")

# ─── Brace matching ──────────────────────────────────────────────────────────

def find_brace_end(text: str, start: int) -> int:
    """Find matching closing brace from start position (text[start] must be '{')"""
    depth = 0
    i = start
    in_template = False
    while i < len(text):
        ch = text[i]
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return i
        elif ch in ("'", '"'):
            # Skip string literals
            quote = ch
            i += 1
            while i < len(text) and text[i] != quote:
                if text[i] == '\\':
                    i += 1
                i += 1
        elif ch == '`':
            # Skip template literals (may contain ${})
            i += 1
            while i < len(text) and text[i] != '`':
                if text[i] == '\\':
                    i += 1
                elif text[i] == '$' and i + 1 < len(text) and text[i + 1] == '{':
                    # Template expression - skip to matching }
                    i += 2
                    td = 1
                    while i < len(text) and td > 0:
                        if text[i] == '{':
                            td += 1
                        elif text[i] == '}':
                            td -= 1
                        i += 1
                    continue
                i += 1
        elif ch == '/' and i + 1 < len(text):
            if text[i + 1] == '/':
                # Line comment - skip to end of line
                while i < len(text) and text[i] != '\n':
                    i += 1
            elif text[i + 1] == '*':
                # Block comment
                i += 2
                while i < len(text) - 1 and not (text[i] == '*' and text[i + 1] == '/'):
                    i += 1
                i += 1  # skip the /
        i += 1
    return -1


# ─── I18N block extraction ──────────────────────────────────────────────────

def extract_i18n_block(content: str):
    """Extract I18N dict block boundaries. Returns (block_text, start, end) or None."""
    match = re.search(r'const I18N\s*(?::\s*Record[^=]*)?=\s*\{', content)
    if not match:
        return None
    brace_start = content.index('{', match.start())
    brace_end = find_brace_end(content, brace_start)
    if brace_end == -1:
        return None
    # Include trailing semicolon and whitespace
    block_end = brace_end + 1
    while block_end < len(content) and content[block_end] in (' ', '\t', ';'):
        block_end += 1
    # Include trailing newlines (up to 2)
    nl_count = 0
    while block_end < len(content) and content[block_end] == '\n' and nl_count < 2:
        block_end += 1
        nl_count += 1
    return content[brace_start:brace_end + 1], match.start(), block_end


def extract_locale_section(block: str, locale_key: str) -> str | None:
    """Extract content of a specific locale section from the I18N block."""
    if '-' in locale_key:
        pattern = rf"['\"]?{re.escape(locale_key)}['\"]?\s*:\s*\{{"
    else:
        pattern = rf"\b{locale_key}\s*:\s*\{{"
    match = re.search(pattern, block)
    if not match:
        return None
    brace_pos = block.index('{', match.start())
    end = find_brace_end(block, brace_pos)
    if end == -1:
        return None
    return block[brace_pos + 1:end]


# ─── Entry parsing ──────────────────────────────────────────────────────────

def parse_entries(section_text: str) -> tuple[dict[str, str], dict[str, list[str]]]:
    """
    Parse key-value entries from a locale section text.
    Returns (entries, func_params) where:
      entries: { key: translated_value }
      func_params: { key: [param_names] } for function entries
    """
    entries: dict[str, str] = {}
    func_params: dict[str, list[str]] = {}
    if not section_text:
        return entries, func_params

    # 1) Template literal functions: key: (params) => `template ${x} text`
    for m in re.finditer(
        r"(\w+)\s*:\s*\(([^)]*)\)\s*=>\s*`((?:[^`\\]|\\.|(?:\$\{[^}]*\}))*)`",
        section_text
    ):
        key, params_str, template = m.group(1), m.group(2), m.group(3)
        param_names = [p.strip().split(':')[0].strip()
                       for p in params_str.split(',') if p.strip()]
        # Convert ${param} → {param}
        value = re.sub(r'\$\{(\w+)\}', r'{\1}', template)
        entries[key] = value
        func_params[key] = param_names

    # 2) String concat functions: key: (n) => '前缀' + n + '后缀'
    # Try to reconstruct a reasonable message
    for m in re.finditer(
        r"(\w+)\s*:\s*\(([^)]*)\)\s*=>\s*(?!`)(.+?)(?:,\s*$|\n)",
        section_text, re.MULTILINE
    ):
        key = m.group(1)
        if key in entries:
            continue  # already handled as template
        params_str = m.group(2)
        expr = m.group(3).strip().rstrip(',')
        param_names = [p.strip().split(':')[0].strip()
                       for p in params_str.split(',') if p.strip()]
        # Try to parse simple concat: 'str' + param + 'str'
        parts = re.split(r'\s*\+\s*', expr)
        result_parts = []
        for part in parts:
            part = part.strip()
            sm = re.match(r"^['\"](.+?)['\"]$", part)
            if sm:
                result_parts.append(sm.group(1))
            elif part in param_names:
                result_parts.append(f'{{{part}}}')
            else:
                result_parts.append(f'{{{part}}}')
        if result_parts:
            entries[key] = ''.join(result_parts)
            func_params[key] = param_names

    # 3) Simple single-quoted strings: key: '...'
    for m in re.finditer(r"(\w+)\s*:\s*'((?:[^'\\]|\\.)*)'", section_text):
        key, value = m.group(1), m.group(2)
        if key not in entries:
            entries[key] = value

    # 4) Simple double-quoted strings: key: "..."
    for m in re.finditer(r'(\w+)\s*:\s*"((?:[^"\\]|\\.)*)"', section_text):
        key, value = m.group(1), m.group(2)
        if key not in entries:
            entries[key] = value

    return entries, func_params


# ─── Namespace derivation ───────────────────────────────────────────────────

def derive_namespace(filepath: Path) -> str:
    """Derive next-intl namespace from file path."""
    rel = filepath.relative_to(FRONTEND)
    parts = rel.parts

    # app/[locale]/.../page.tsx → camelCaseNamePage
    if parts[0] == 'app' and len(parts) > 1 and parts[1] == '[locale]':
        if parts[-1] == 'page.tsx':
            if len(parts) == 3:
                return 'homePage'
            segment = parts[2]
            if segment.startswith('('):
                segment = parts[3] if len(parts) > 3 else segment.strip('()')
            # kebab to camelCase
            sp = segment.split('-')
            return sp[0] + ''.join(w.capitalize() for w in sp[1:]) + 'Page'
        else:
            return filepath.stem

    # components/XXX/YYY.tsx → YYY
    if parts[0] == 'components':
        return filepath.stem

    return filepath.stem


# ─── Component rewriting ────────────────────────────────────────────────────

I18N_ACCESS_PATTERNS = [
    r"const t = \(I18N as unknown as Record<[^>]*>\)\[locale\]\s*\?\?\s*I18N\['zh'\];?",
    r"const t = \(I18N as unknown as Record<[^>]*>\)\[locale\]\s*\?\?\s*I18N\.zh;?",
    r"const t = I18N\[locale as keyof typeof I18N\]\s*\?\?\s*I18N\['zh'\];?",
    r"const t = I18N\[locale as keyof typeof I18N\]\s*\?\?\s*I18N\.zh;?",
    r"const t = I18N\[locale\]\s*\?\?\s*I18N\['zh'\];?",
    r"const t = I18N\[locale\]\s*\?\?\s*I18N\.zh;?",
]


def rewrite_component(content: str, namespace: str, entries: dict, func_params: dict,
                       i18n_start: int, i18n_end: int) -> str:
    """Rewrite the .tsx file: remove I18N dict, use useTranslations."""
    # 1) Remove I18N dict block
    new_content = content[:i18n_start] + content[i18n_end:]

    # Remove I18N type comment line if present (e.g., /* ── i18n ─── */)
    new_content = re.sub(r'\n\s*/\*\s*──\s*(?:i18n|内联 I18N|I18N)\s*─+\s*\*/\s*\n', '\n', new_content)
    new_content = re.sub(r'\n\s*//\s*──\s*(?:内联 I18N|I18N)\s*─+[^\n]*\n', '\n', new_content)

    # Clean up triple+ blank lines
    new_content = re.sub(r'\n{3,}', '\n\n', new_content)

    # 2) Replace I18N locale access line → useTranslations
    replaced = False
    for pat in I18N_ACCESS_PATTERNS:
        if re.search(pat, new_content):
            new_content = re.sub(pat, f"const t = useTranslations('{namespace}');", new_content, count=1)
            replaced = True
            break

    if not replaced:
        # Fallback: look for any line that accesses I18N[locale]
        fallback = re.search(r"const t = .*I18N.*locale.*\n", new_content)
        if fallback:
            new_content = (new_content[:fallback.start()] +
                          f"  const t = useTranslations('{namespace}');\n" +
                          new_content[fallback.end():])
            replaced = True

    # 3) Replace property access t.key → t('key')
    # Process longest keys first to avoid partial matches
    for key in sorted(entries.keys(), key=len, reverse=True):
        if key in func_params and func_params[key]:
            # Function key: t.key(expr) → t('key', { param: expr })
            param = func_params[key][0]
            # Handle both simple and complex args
            pattern = rf"\bt\.{re.escape(key)}\(([^)]*)\)"
            def func_replacer(m, k=key, p=param):
                arg = m.group(1).strip()
                return f"t('{k}', {{ {p}: {arg} }})"
            new_content = re.sub(pattern, func_replacer, new_content)
        else:
            # Simple key: t.key → t('key') — but not t.key( which would be a function call
            pattern = rf"\bt\.{re.escape(key)}\b(?!\s*\()"
            new_content = re.sub(pattern, f"t('{key}')", new_content)

    # 4) Handle useLocale — check if still needed after removing I18N access
    locale_decl_pattern = r'\n\s*const locale = useLocale\(\);?\s*\n'
    locale_decl_match = re.search(locale_decl_pattern, new_content)
    if locale_decl_match:
        # Count remaining uses of `locale` (excluding the declaration itself)
        remaining = new_content[:locale_decl_match.start()] + new_content[locale_decl_match.end():]
        locale_uses = len(re.findall(r'\blocale\b', remaining))
        if locale_uses == 0:
            # locale is only used for I18N dict — remove declaration
            new_content = re.sub(locale_decl_pattern, '\n', new_content)

    # 5) Update imports
    if 'useTranslations' not in new_content:
        import_match = re.search(
            r"import\s*\{([^}]*)\}\s*from\s*'next-intl'",
            new_content
        )
        if import_match:
            current = import_match.group(1).strip()
            # Check if useLocale is still used
            if 'useLocale' in current and 'useLocale' not in new_content.replace(import_match.group(0), ''):
                # Remove useLocale, add useTranslations
                new_imports = re.sub(r',?\s*useLocale\s*,?', '', current).strip().strip(',')
                if new_imports:
                    new_imports = f" {new_imports}, useTranslations "
                else:
                    new_imports = " useTranslations "
            else:
                new_imports = f" {current}, useTranslations "
            new_content = (new_content[:import_match.start()] +
                          f"import {{{new_imports}}} from 'next-intl'" +
                          new_content[import_match.end():])
        else:
            # No next-intl import yet — add one at the top of imports
            first_import = re.search(r'^import\s', new_content, re.MULTILINE)
            if first_import:
                new_content = (new_content[:first_import.start()] +
                              "import { useTranslations } from 'next-intl';\n" +
                              new_content[first_import.start():])

    # 6) Clean up: remove unused useLocale import
    # If useLocale is imported but never used in the code body
    import_match = re.search(r"import\s*\{([^}]*)\}\s*from\s*'next-intl'", new_content)
    if import_match:
        imports_str = import_match.group(1)
        if 'useLocale' in imports_str:
            # Check if useLocale is still used in the code body
            code_after_import = new_content[import_match.end():]
            if 'useLocale' not in code_after_import:
                # Remove useLocale from imports
                cleaned = re.sub(r',?\s*useLocale\s*,?', ', ', imports_str)
                cleaned = re.sub(r'^[\s,]+|[\s,]+$', '', cleaned)
                cleaned = re.sub(r',\s*,', ',', cleaned)
                new_content = (new_content[:import_match.start(1)] +
                              f" {cleaned} " +
                              new_content[import_match.end(1):])

    return new_content


# ─── Main ───────────────────────────────────────────────────────────────────

def find_migration_targets() -> list[Path]:
    """Find .tsx files with const I18N that don't already use useTranslations."""
    targets = []
    for f in sorted(FRONTEND.rglob('*.tsx')):
        content = f.read_text(encoding='utf-8')
        if re.search(r'const I18N\s*(?::|=)', content) and 'useTranslations' not in content:
            targets.append(f)
    return targets


def migrate_file(filepath: Path, messages: dict, dry_run: bool = False) -> dict:
    """Migrate a single file. Returns info dict."""
    content = filepath.read_text(encoding='utf-8')
    namespace = derive_namespace(filepath)
    result = extract_i18n_block(content)
    if result is None:
        return {'file': str(filepath), 'status': 'skip', 'reason': 'no I18N block found'}

    block_text, i18n_start, i18n_end = result

    # Extract entries for each locale
    all_entries = {}
    all_func_params = {}
    for locale in ['zh', 'zh-TW', 'en', 'th']:
        section = extract_locale_section(block_text, locale)
        if section:
            entries, fparams = parse_entries(section)
            all_entries[locale] = entries
            if locale == 'zh':
                all_func_params = fparams
        else:
            all_entries[locale] = {}

    # Use zh as the canonical key set
    zh_keys = set(all_entries.get('zh', {}).keys())
    if not zh_keys:
        return {'file': str(filepath), 'status': 'skip', 'reason': 'no zh entries found'}

    # Add to messages
    for locale in ['zh', 'zh-TW', 'en', 'th']:
        locale_entries = all_entries.get(locale, {})
        # Fill missing keys from zh as fallback
        for key in zh_keys:
            if key not in locale_entries:
                locale_entries[key] = all_entries['zh'].get(key, '')
        messages[locale][namespace] = locale_entries

    # Rewrite component
    new_content = rewrite_component(content, namespace, all_entries['zh'],
                                     all_func_params, i18n_start, i18n_end)

    if not dry_run:
        filepath.write_text(new_content, encoding='utf-8')

    key_count = len(zh_keys)
    func_count = len(all_func_params)
    return {
        'file': str(filepath),
        'status': 'migrated',
        'namespace': namespace,
        'keys': key_count,
        'functions': func_count,
    }


def main():
    parser = argparse.ArgumentParser(description='Migrate inline I18N to useTranslations')
    parser.add_argument('--dry-run', action='store_true', help='Preview without writing files')
    parser.add_argument('--file', type=str, help='Migrate a single file')
    args = parser.parse_args()

    # Load existing messages
    messages = {}
    for locale in ['zh', 'zh-TW', 'en', 'th']:
        msg_path = FRONTEND / 'messages' / f'{locale}.json'
        if msg_path.exists():
            messages[locale] = json.loads(msg_path.read_text(encoding='utf-8'))
        else:
            messages[locale] = {}

    if args.file:
        targets = [Path(args.file)]
    else:
        targets = find_migration_targets()

    print(f"Found {len(targets)} files to migrate")

    results = []
    for filepath in targets:
        try:
            info = migrate_file(filepath, messages, dry_run=args.dry_run)
            results.append(info)
            status = info['status']
            if status == 'migrated':
                print(f"  ✓ {info['file']} → {info['namespace']} ({info['keys']} keys, {info['functions']} funcs)")
            else:
                print(f"  ⚠ {info['file']} — {info.get('reason', 'unknown')}")
        except Exception as e:
            results.append({'file': str(filepath), 'status': 'error', 'reason': str(e)})
            print(f"  ✗ {filepath} — ERROR: {e}")

    # Write updated messages
    if not args.dry_run:
        for locale in ['zh', 'zh-TW', 'en', 'th']:
            msg_path = FRONTEND / 'messages' / f'{locale}.json'
            msg_path.write_text(
                json.dumps(messages[locale], ensure_ascii=False, indent=2) + '\n',
                encoding='utf-8'
            )
            print(f"  ✓ Updated {msg_path}")

    # Summary
    migrated = sum(1 for r in results if r['status'] == 'migrated')
    skipped = sum(1 for r in results if r['status'] == 'skip')
    errors = sum(1 for r in results if r['status'] == 'error')
    total_keys = sum(r.get('keys', 0) for r in results if r['status'] == 'migrated')
    total_funcs = sum(r.get('functions', 0) for r in results if r['status'] == 'migrated')

    print(f"\n{'='*60}")
    print(f"Migration Summary:")
    print(f"  Migrated: {migrated}")
    print(f"  Skipped:  {skipped}")
    print(f"  Errors:   {errors}")
    print(f"  Total keys added: {total_keys}")
    print(f"  Function keys:    {total_funcs}")
    print(f"{'='*60}")

    if errors > 0:
        print("\nERROR files need manual attention:")
        for r in results:
            if r['status'] == 'error':
                print(f"  - {r['file']}: {r['reason']}")

    return 0 if errors == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
