#!/usr/bin/env python3
"""
i18n Migration Pass 2: Fix residual I18N references after initial migration.
Handles:
- useT() helper function removal
- type Locale/Lang = keyof typeof I18N removal
- (typeof I18N)['zh'] type references
- Remaining I18N[locale] access patterns
- Import cleanup
"""

import re
from pathlib import Path

FRONTEND = Path("frontend")
fixes_total = 0


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
            if len(parts) == 3:
                return 'homePage'
            segment = parts[2]
            if segment.startswith('('):
                segment = parts[3] if len(parts) > 3 else segment.strip('()')
            sp = segment.split('-')
            return sp[0] + ''.join(w.capitalize() for w in sp[1:]) + 'Page'
        else:
            return filepath.stem
    if parts[0] == 'components':
        return filepath.stem
    return filepath.stem


def fix_file(filepath: Path) -> list[str]:
    content = filepath.read_text(encoding='utf-8')
    original = content
    fixes = []
    namespace = derive_namespace(filepath)

    # 1) Remove useT() helper function (various patterns)
    # Pattern: function useT() { const locale = useLocale(); return I18N[...]; }
    usetFn = re.search(
        r'\nfunction useT\(\)\s*\{[^}]*I18N[^}]*\}\s*\n',
        content
    )
    if usetFn:
        content = content[:usetFn.start()] + '\n' + content[usetFn.end():]
        fixes.append('removed useT()')

    # Also handle: function useI18N() pattern
    useI18NFn = re.search(
        r'\nfunction useI18N\(\)\s*\{[^}]*I18N[^}]*\}\s*\n',
        content
    )
    if useI18NFn:
        content = content[:useI18NFn.start()] + '\n' + content[useI18NFn.end():]
        fixes.append('removed useI18N()')

    # 2) Replace const t = useT() → const t = useTranslations('Namespace')
    content, n = re.subn(
        r'const t = useT\(\);?',
        f"const t = useTranslations('{namespace}');",
        content
    )
    if n:
        fixes.append(f'replaced useT() calls ({n})')

    # 3) Replace remaining I18N[locale] access patterns
    patterns_to_replace = [
        # const t = I18N[locale] ?? I18N.zh;
        r"const t\s*=\s*I18N\[locale\]\s*\?\?\s*I18N\.zh;?",
        r"const t\s*=\s*I18N\[locale\]\s*\?\?\s*I18N\['zh'\];?",
        # const t = I18N[(locale as Locale) in I18N ? (locale as Locale) : 'zh'];
        r"const t\s*=\s*I18N\[\(locale\s*as\s*\w+\)\s*in\s*I18N\s*\?\s*\(locale\s*as\s*\w+\)\s*:\s*'zh'\];?",
        # return I18N[(locale as Locale) in I18N ? ...]
        r"return\s+I18N\[\(locale\s*as\s*\w+\)\s*in\s*I18N\s*\?\s*\(locale\s*as\s*\w+\)\s*:\s*'zh'\];?",
        # return { strings: I18N[...], locale }
        r"return\s+\{\s*strings:\s*I18N\[\(locale\s*as\s*\w+\)\s*in\s*I18N\s*\?\s*\(locale\s*as\s*\w+\)\s*:\s*'zh'\],\s*locale\s*\};?",
        # const t: TypeName = I18N[locale] ?? I18N['zh'];
        r"const t:\s*\w+\s*=\s*I18N\[locale\]\s*\?\?\s*I18N\['zh'\];?",
        r"const t:\s*\w+\s*=\s*I18N\[locale\]\s*\?\?\s*I18N\.zh;?",
        # (I18N as unknown as Record<...>)[locale] ?? I18N['zh']
        r"const t\s*=\s*\(I18N\s+as\s+unknown\s+as\s+Record<[^>]*>\)\[locale\]\s*\?\?\s*I18N\['zh'\];?",
    ]
    for pat in patterns_to_replace:
        if re.search(pat, content):
            content = re.sub(pat, f"const t = useTranslations('{namespace}');", content)
            fixes.append('replaced I18N access')
            break

    # 4) Remove type aliases referencing I18N
    for pat in [
        r'\ntype Locale = keyof typeof I18N;\s*\n',
        r'\ntype Lang = keyof typeof I18N;\s*\n',
        r'\ntype I18NKey = keyof typeof I18N;\s*\n',
        r'\ntype ReportI18NKey = keyof typeof REPORT_I18N;\s*\n',
    ]:
        if re.search(pat, content):
            content = re.sub(pat, '\n', content)
            fixes.append('removed type alias')

    # 5) Fix (typeof I18N)['zh'] type references → string
    if "(typeof I18N)['zh']" in content:
        content = content.replace("keyof (typeof I18N)['zh']", 'string')
        content = content.replace("(typeof I18N)['zh']", 'Record<string, string>')
        fixes.append('replaced I18N type references')

    # 6) Remove remaining I18N dict blocks that weren't caught (skipped files)
    i18n_match = re.search(r'const I18N\s*(?::\s*Record[^=]*)?=\s*\{', content)
    if i18n_match:
        brace_pos = content.index('{', i18n_match.start())
        end = find_brace_end(content, brace_pos)
        if end != -1:
            # Include trailing as const; and semicolon
            block_end = end + 1
            rest = content[block_end:block_end + 20]
            if 'as const' in rest:
                ac = rest.index('as const')
                block_end += ac + len('as const')
            while block_end < len(content) and content[block_end] in (' ', '\t', ';'):
                block_end += 1
            while block_end < len(content) and content[block_end] == '\n':
                block_end += 1
            content = content[:i18n_match.start()] + content[block_end:]
            fixes.append('removed remaining I18N dict')

    # Also remove secondary dicts like KPI_LABELS_I18N that reference I18N pattern
    # These are typically small inline dicts

    # 7) Remove const locale = useLocale() if unused
    if 'useLocale()' in content:
        locale_decl = re.search(r'\n(\s*)const locale = useLocale\(\);?\s*\n', content)
        if locale_decl:
            remaining = content[:locale_decl.start()] + content[locale_decl.end():]
            locale_uses = len(re.findall(r'\blocale\b', remaining))
            if locale_uses == 0:
                content = content[:locale_decl.start()] + '\n' + content[locale_decl.end():]
                fixes.append('removed unused locale')

    # 8) Ensure useTranslations is imported
    if "useTranslations('" in content and 'useTranslations' not in content.split("useTranslations('")[0].split('\n')[-5:]:
        # Check import
        import_match = re.search(r"import\s*\{([^}]*)\}\s*from\s*'next-intl'", content)
        if import_match:
            if 'useTranslations' not in import_match.group(1):
                new_imports = import_match.group(1).strip() + ', useTranslations'
                content = (content[:import_match.start(1)] + ' ' + new_imports + ' ' +
                          content[import_match.end(1):])
                fixes.append('added useTranslations import')
        elif "from 'next-intl'" not in content:
            first_import = re.search(r'^import\s', content, re.MULTILINE)
            if first_import:
                content = (content[:first_import.start()] +
                          "import { useTranslations } from 'next-intl';\n" +
                          content[first_import.start():])
                fixes.append('added next-intl import')

    # 9) Clean up unused useLocale import
    import_match = re.search(r"import\s*\{([^}]*)\}\s*from\s*'next-intl'", content)
    if import_match:
        imports_str = import_match.group(1)
        if 'useLocale' in imports_str:
            code_after = content[import_match.end():]
            if 'useLocale' not in code_after:
                cleaned = re.sub(r'\buseLocale\b', '', imports_str)
                cleaned = re.sub(r',\s*,', ',', cleaned).strip().strip(',').strip()
                if cleaned:
                    content = (content[:import_match.start()] +
                              f"import {{ {cleaned} }} from 'next-intl'" +
                              content[import_match.end():])
                    fixes.append('cleaned useLocale import')

    # 10) Remove `as const;` remnants
    content = re.sub(r'\n\s*as const;\s*\n', '\n', content)

    # 11) Clean triple+ blank lines
    content = re.sub(r'\n{3,}', '\n\n', content)

    if content != original:
        filepath.write_text(content, encoding='utf-8')
    return fixes


def main():
    global fixes_total
    targets = sorted(FRONTEND.rglob('*.tsx'))

    for filepath in targets:
        content = filepath.read_text(encoding='utf-8')
        if 'I18N' not in content and 'useT()' not in content:
            continue

        fixes = fix_file(filepath)
        if fixes:
            fixes_total += len(fixes)
            print(f"  ✓ {filepath.relative_to(FRONTEND)}: {', '.join(fixes)}")

    print(f"\nTotal fixes: {fixes_total}")


if __name__ == '__main__':
    main()
