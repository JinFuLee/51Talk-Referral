#!/usr/bin/env python3
"""
Post-migration cleanup: fix residual issues from migrate_i18n.py
1. Remove standalone `as const;` lines
2. Fix empty imports `import { } from 'next-intl'`
3. Remove `type Lang = keyof typeof I18N` and related references
4. Remove remaining `I18N` references (locale access fallbacks)
5. Ensure useTranslations is properly imported
"""

import re
from pathlib import Path

FRONTEND = Path("frontend")
fixed_count = 0


def cleanup_file(filepath: Path) -> list[str]:
    """Clean up a single file. Returns list of fixes applied."""
    content = filepath.read_text(encoding='utf-8')
    original = content
    fixes = []

    # 1) Remove standalone `as const;` lines (remnant from `} as const;` pattern)
    if re.search(r'^\s*as const;\s*$', content, re.MULTILINE):
        content = re.sub(r'\n\s*as const;\s*\n', '\n', content)
        fixes.append('removed `as const;`')

    # 2) Remove `type Lang = keyof typeof I18N;` and variants
    if 'keyof typeof I18N' in content:
        content = re.sub(r'\n\s*type Lang = keyof typeof I18N;\s*\n', '\n', content)
        # Remove Lang type usage in function parameters/generics
        content = re.sub(r'\[locale as Lang\]', '[locale]', content)
        # Remove any remaining `I18N` references that are dead after migration
        # Pattern: (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale]
        # These should have been replaced by useTranslations already
        fixes.append('removed `type Lang`')

    # 3) Fix empty imports: `import {  } from 'next-intl'` or `import { } from 'next-intl'`
    empty_import = re.search(r"import\s*\{\s*\}\s*from\s*'next-intl'\s*;?\s*\n", content)
    if empty_import:
        # Check if useTranslations is already imported elsewhere
        if 'useTranslations' in content.replace(empty_import.group(0), ''):
            # Just remove the empty import
            content = content[:empty_import.start()] + content[empty_import.end():]
            fixes.append('removed empty next-intl import')
        else:
            # Replace empty import with useTranslations
            content = (content[:empty_import.start()] +
                      "import { useTranslations } from 'next-intl';\n" +
                      content[empty_import.end():])
            fixes.append('fixed empty import → useTranslations')

    # 4) Fix `import { , useTranslations }` → `import { useTranslations }`
    content = re.sub(
        r"import\s*\{\s*,\s*useTranslations\s*\}\s*from\s*'next-intl'",
        "import { useTranslations } from 'next-intl'",
        content
    )
    # Also: `import { useTranslations,  }` → `import { useTranslations }`
    content = re.sub(
        r"import\s*\{\s*useTranslations\s*,\s*\}\s*from\s*'next-intl'",
        "import { useTranslations } from 'next-intl'",
        content
    )
    # Fix double-imported: `import { useLocale, useTranslations } from 'next-intl'` where useLocale is unused
    import_match = re.search(r"import\s*\{([^}]*)\}\s*from\s*'next-intl'", content)
    if import_match:
        imports_str = import_match.group(1)
        if 'useLocale' in imports_str:
            # Check if useLocale() is actually called in the file
            code_after = content[import_match.end():]
            if 'useLocale()' not in code_after and 'useLocale(' not in code_after:
                cleaned = re.sub(r'\buseLocale\b', '', imports_str)
                cleaned = re.sub(r',\s*,', ',', cleaned).strip().strip(',').strip()
                if cleaned:
                    content = (content[:import_match.start()] +
                              f"import {{ {cleaned} }} from 'next-intl'" +
                              content[import_match.end():])
                    fixes.append('removed unused useLocale import')

    # 5) Remove `const locale = useLocale();` if locale is not used in remaining code
    locale_decl = re.search(r'\n(\s*)const locale = useLocale\(\);?\s*\n', content)
    if locale_decl:
        remaining = content[:locale_decl.start()] + content[locale_decl.end():]
        # Count uses of 'locale' as a word (not in imports/comments)
        locale_uses = len(re.findall(r'\blocale\b', remaining))
        if locale_uses == 0:
            content = content[:locale_decl.start()] + '\n' + content[locale_decl.end():]
            fixes.append('removed unused locale declaration')

    # 6) Remove stale comment sections about I18N
    content = re.sub(r'\n\s*/\*\s*──\s*(?:types|I18N|i18n|内联)\s*─+\s*\*/\s*\n', '\n', content)

    # 7) Clean up excessive blank lines
    content = re.sub(r'\n{3,}', '\n\n', content)

    if content != original:
        filepath.write_text(content, encoding='utf-8')
        return fixes
    return []


def main():
    global fixed_count
    # Find all tsx files that might have issues
    targets = sorted(FRONTEND.rglob('*.tsx'))
    total_fixes = 0

    for filepath in targets:
        try:
            content = filepath.read_text(encoding='utf-8')
            # Only process files that have potential issues
            needs_check = any([
                re.search(r'^\s*as const;\s*$', content, re.MULTILINE),
                'keyof typeof I18N' in content,
                re.search(r"import\s*\{\s*\}\s*from\s*'next-intl'", content),
                re.search(r"import\s*\{\s*,", content),
            ])
            if not needs_check:
                continue

            fixes = cleanup_file(filepath)
            if fixes:
                total_fixes += len(fixes)
                print(f"  ✓ {filepath.relative_to(FRONTEND)}: {', '.join(fixes)}")
        except Exception as e:
            print(f"  ✗ {filepath.relative_to(FRONTEND)}: ERROR - {e}")

    print(f"\nTotal fixes applied: {total_fixes}")


if __name__ == '__main__':
    main()
