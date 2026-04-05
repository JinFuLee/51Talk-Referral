#!/usr/bin/env python3
"""
i18n Migration Pass 3: Aggressively remove ALL remaining I18N references.
Handles remaining patterns that pass 1+2 missed:
- (typeof I18N)[Locale] type references
- type TStrings = (typeof I18N)[keyof typeof I18N]
- Comments mentioning I18N
- const lang = ... I18N ... patterns
- const tr = (I18N as ...) patterns
- Remaining I18N dict blocks with Record<> type annotation
- CoPilotTerminal useLocale() as keyof typeof I18N
- access-control patterns with I18N[lang]
"""

import re
import json
from pathlib import Path

FRONTEND = Path("frontend")


def find_brace_end(text: str, start: int) -> int:
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
                if text[i] == '\\':
                    i += 1
                i += 1
        elif ch == '`':
            i += 1
            while i < len(text) and text[i] != '`':
                if text[i] == '\\':
                    i += 1
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


def derive_namespace(filepath: Path) -> str:
    rel = filepath.relative_to(FRONTEND)
    parts = rel.parts
    if parts[0] == 'app' and len(parts) > 1 and parts[1] == '[locale]':
        if parts[-1] == 'page.tsx':
            if len(parts) == 3: return 'homePage'
            segment = parts[2]
            if segment.startswith('('): segment = parts[3] if len(parts) > 3 else segment.strip('()')
            sp = segment.split('-')
            return sp[0] + ''.join(w.capitalize() for w in sp[1:]) + 'Page'
        return filepath.stem
    if parts[0] == 'components':
        return filepath.stem
    return filepath.stem


def extract_locale_entries_from_block(block: str, locale_key: str) -> dict:
    """Extract key-value pairs from a locale section."""
    if '-' in locale_key:
        pattern = rf"['\"]?{re.escape(locale_key)}['\"]?\s*:\s*\{{"
    else:
        pattern = rf"\b{locale_key}\s*:\s*\{{"
    match = re.search(pattern, block)
    if not match: return {}
    brace_pos = block.index('{', match.start())
    end = find_brace_end(block, brace_pos)
    if end == -1: return {}
    section = block[brace_pos + 1:end]

    entries = {}
    # Template functions
    for m in re.finditer(r"(\w+)\s*:\s*\(([^)]*)\)\s*=>\s*`((?:[^`\\]|\\.|(?:\$\{[^}]*\}))*)`", section):
        key, template = m.group(1), m.group(3)
        entries[key] = re.sub(r'\$\{(\w+)\}', r'{\1}', template)
    # Simple strings
    for m in re.finditer(r"(\w+)\s*:\s*'((?:[^'\\]|\\.)*)'", section):
        if m.group(1) not in entries: entries[m.group(1)] = m.group(2)
    for m in re.finditer(r'(\w+)\s*:\s*"((?:[^"\\]|\\.)*)"', section):
        if m.group(1) not in entries: entries[m.group(1)] = m.group(2)
    return entries


def fix_file(filepath: Path, messages: dict) -> list[str]:
    content = filepath.read_text('utf-8')
    original = content
    fixes = []
    namespace = derive_namespace(filepath)

    # A) Remove remaining I18N dict blocks (including Record<> type annotation)
    # Match: const I18N: Record<\n  string,\n  Record<...>\n> = {
    i18n_match = re.search(r'const I18N\s*(?::[\s\S]*?)?\s*=\s*\{', content)
    if i18n_match and 'const I18N' in content:
        # Find the actual opening brace of the dict value
        brace_search = content[i18n_match.start():]
        eq_pos = brace_search.index('=')
        brace_offset = brace_search.index('{', eq_pos)
        abs_brace_start = i18n_match.start() + brace_offset
        end = find_brace_end(content, abs_brace_start)
        if end != -1:
            # Extract entries for messages before removing
            block = content[abs_brace_start:end + 1]
            for locale in ['zh', 'zh-TW', 'en', 'th']:
                entries = extract_locale_entries_from_block(block, locale)
                if entries and namespace not in messages.get(locale, {}):
                    messages.setdefault(locale, {})[namespace] = entries

            # Remove including `as const;`
            block_end = end + 1
            rest = content[block_end:block_end + 25]
            if 'as const' in rest:
                block_end += rest.index('as const') + len('as const')
            while block_end < len(content) and content[block_end] in ' \t;':
                block_end += 1
            while block_end < len(content) and content[block_end] == '\n':
                block_end += 1
            content = content[:i18n_match.start()] + content[block_end:]
            fixes.append('removed I18N dict')

    # B) Remove type definitions referencing I18N
    for pat in [
        r'\n\s*type\s+\w+\s*=\s*keyof\s+typeof\s+I18N;\s*\n',
        r'\n\s*type\s+\w+\s*=\s*\(typeof\s+I18N\)\[keyof\s+typeof\s+I18N\];\s*\n',
        r'\n\s*type\s+\w+\s*=\s*\(typeof\s+I18N\)\[\w+\];\s*\n',
    ]:
        if re.search(pat, content):
            content = re.sub(pat, '\n', content)
            fixes.append('removed I18N type def')

    # C) Replace (typeof I18N)[...] in function params/type annotations
    content = re.sub(r'\(typeof I18N\)\[keyof typeof I18N\]', 'Record<string, string>', content)
    content = re.sub(r'\(typeof I18N\)\[\w+\]', 'Record<string, string>', content)
    content = re.sub(r'keyof typeof I18N', 'string', content)
    content = re.sub(r'keyof \(typeof I18N\)', 'string', content)
    if content != original:
        fixes.append('replaced I18N type refs') if 'replaced I18N type refs' not in fixes else None

    # D) Replace access patterns with lang variable
    for pat in [
        r"const\s+(?:t|tr)\s*=\s*I18N\[lang\];?\s*\n",
        r"const\s+(?:t|tr)\s*=\s*\(I18N\s+as\s+unknown\s+as\s+Record<[^>]*>\)\[locale\]\s*\?\?\s*I18N\['zh'\];?\s*\n",
    ]:
        if re.search(pat, content):
            content = re.sub(pat, f"const t = useTranslations('{namespace}');\n", content)
            fixes.append('replaced I18N[lang]')

    # E) Replace lang declaration patterns
    for pat in [
        r"const\s+lang(?:\s*:\s*\w+)?\s*=\s*\(locale\s+in\s+I18N\s*\?\s*locale\s*:\s*'(?:en|zh)'\)\s*(?:as\s+\w+)?;?\s*\n",
        r"const\s+lang(?:\s*:\s*\w+)?\s*=\s*\(locale\s+in\s+I18N\s*\?\s*\(locale\s+as\s+\w+\)\s*:\s*'(?:en|zh)'\)\s*;?\s*\n",
    ]:
        if re.search(pat, content):
            content = re.sub(pat, '', content)
            fixes.append('removed lang decl')

    # F) Replace inline I18N[lang].key patterns (access-control components)
    content = re.sub(r'I18N\[lang\]\.(\w+)', lambda m: f"t('{m.group(1)}')", content)
    # I18N[lang].funcKey(args)
    content = re.sub(r"I18N\[lang\]\.(\w+)\(([^)]*)\)", lambda m: f"t('{m.group(1)}', {{ n: {m.group(2)} }})", content)

    # G) Fix `locale in I18N` patterns in JSX
    content = re.sub(r'locale\s+in\s+I18N\s*\?\s*\(locale\s+as\s+\w+\)\s*:\s*\'(?:zh|en)\'', "'zh'", content)
    content = re.sub(r"lang={locale in I18N \? \(locale as \w+\) : 'zh'}", "lang={'zh' as string}", content)

    # H) Remove comment-only lines mentioning I18N
    content = re.sub(r'\n\s*//.*\bI18N\b.*\n', '\n', content)
    content = re.sub(r'\n\s*/\*.*\bI18N\b.*\*/\s*\n', '\n', content)

    # I) useLocale() as keyof typeof I18N → useLocale()
    content = re.sub(r'useLocale\(\)\s+as\s+keyof\s+typeof\s+I18N', "useLocale()", content)

    # J) Clean up unused locale/lang variables
    if 'const locale = useLocale()' in content:
        locale_decl = re.search(r'\n(\s*)const locale = useLocale\(\);?\s*\n', content)
        if locale_decl:
            remaining = content[:locale_decl.start()] + content[locale_decl.end():]
            if len(re.findall(r'\blocale\b', remaining)) == 0:
                content = content[:locale_decl.start()] + '\n' + content[locale_decl.end():]
                fixes.append('removed unused locale')

    # K) Ensure useTranslations import
    if "useTranslations('" in content:
        imp = re.search(r"import\s*\{([^}]*)\}\s*from\s*'next-intl'", content)
        if imp:
            if 'useTranslations' not in imp.group(1):
                content = content[:imp.start(1)] + imp.group(1).strip() + ', useTranslations ' + content[imp.end(1):]
                fixes.append('added useTranslations import')
            # Clean unused useLocale
            if 'useLocale' in imp.group(0) and 'useLocale' not in content[imp.end():]:
                cleaned = re.sub(r'\buseLocale\b', '', imp.group(1))
                cleaned = re.sub(r',\s*,', ',', cleaned).strip().strip(',').strip()
                content = content[:imp.start(1)] + ' ' + cleaned + ' ' + content[imp.end(1):]
        elif "from 'next-intl'" not in content:
            first_import = re.search(r'^import\s', content, re.MULTILINE)
            if first_import:
                content = content[:first_import.start()] + "import { useTranslations } from 'next-intl';\n" + content[first_import.start():]
                fixes.append('added next-intl import')

    # L) Clean up
    content = re.sub(r'\n{3,}', '\n\n', content)

    if content != original:
        filepath.write_text(content, 'utf-8')
    return fixes


def main():
    messages = {}
    for locale in ['zh', 'zh-TW', 'en', 'th']:
        msg_path = FRONTEND / 'messages' / f'{locale}.json'
        messages[locale] = json.loads(msg_path.read_text('utf-8'))

    targets = sorted(FRONTEND.rglob('*.tsx'))
    total = 0

    for fp in targets:
        content = fp.read_text('utf-8')
        if 'I18N' not in content:
            continue
        fixes = fix_file(fp, messages)
        if fixes:
            total += len(fixes)
            print(f"  ✓ {fp.relative_to(FRONTEND)}: {', '.join(set(fixes))}")

    # Write updated messages (for skipped analytics slides)
    for locale in ['zh', 'zh-TW', 'en', 'th']:
        msg_path = FRONTEND / 'messages' / f'{locale}.json'
        msg_path.write_text(json.dumps(messages[locale], ensure_ascii=False, indent=2) + '\n', 'utf-8')

    print(f"\nTotal fixes: {total}")


if __name__ == '__main__':
    main()
