#!/usr/bin/env python3
"""
M41 i18n 迁移脚本：内联 I18N/LABELS 字典 → next-intl useTranslations

模式：
  Before: const I18N = { zh: { key: 'val' }, en: { key: 'val' }, ... }
          const locale = useLocale(); const t = I18N[locale as ...] || I18N.zh;
          {t.key}
  After:  import { useTranslations } from 'next-intl';
          const t = useTranslations('Namespace');
          {t('key')}

用法: uv run python scripts/migrate-i18n-to-next-intl.py [--dry-run] [--file path]
"""

import re
import json
import ast
import sys
from pathlib import Path
from typing import Any

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
MESSAGES_DIR = FRONTEND_DIR / "messages"
LOCALES = ["en", "zh", "zh-TW", "th"]

# 匹配内联 i18n 字典定义块（const I18N/LABELS/LANG/T_ = { ... } as const;）
DICT_PATTERN = re.compile(
    r"^const\s+(I18N|LABELS|LANG|T_\w+)\s*=\s*\{",
    re.MULTILINE,
)

# 匹配 locale lookup: const t = I18N[locale as ...] || I18N.zh;
LOOKUP_PATTERN = re.compile(
    r"const\s+(\w+)\s*=\s*(?:I18N|LABELS|LANG|T_\w+)\[locale\s+as\s+[^\]]+\]\s*\|\|\s*(?:I18N|LABELS|LANG|T_\w+)\.\w+;?"
)

# 匹配 useLocale import（如果已有则保留）
USE_LOCALE_IMPORT = re.compile(r"import\s*\{[^}]*useLocale[^}]*\}\s*from\s*'next-intl'")

DRY_RUN = "--dry-run" in sys.argv
SINGLE_FILE = None
for i, arg in enumerate(sys.argv):
    if arg == "--file" and i + 1 < len(sys.argv):
        SINGLE_FILE = Path(sys.argv[i + 1])


def derive_namespace(filepath: Path) -> str:
    """从文件路径推导 i18n namespace"""
    rel = filepath.relative_to(FRONTEND_DIR)
    parts = list(rel.parts)

    # app/[locale]/xxx/page.tsx → xxx
    if "app" in parts and "page.tsx" in parts:
        # 找 [locale] 后面的第一个目录名
        try:
            locale_idx = parts.index("[locale]")
            if locale_idx + 1 < len(parts) - 1:  # -1 排除 page.tsx
                return parts[locale_idx + 1].replace("-", "_")
        except ValueError:
            pass
        return "common"

    # app/[locale]/xxx/Component.tsx → xxx
    if "app" in parts:
        try:
            locale_idx = parts.index("[locale]")
            if locale_idx + 1 < len(parts):
                return parts[locale_idx + 1].replace("-", "_")
        except ValueError:
            pass

    # components/xxx/Component.tsx → xxx
    if "components" in parts:
        comp_idx = parts.index("components")
        if comp_idx + 1 < len(parts):
            return parts[comp_idx + 1].replace("-", "_")

    return "common"


def extract_dict_block(content: str, match_start: int) -> tuple[str, int]:
    """从 match_start 开始提取完整的 { } 块（含嵌套）"""
    brace_count = 0
    started = False
    block_start = match_start

    # 找到第一个 {
    for i in range(match_start, len(content)):
        if content[i] == "{":
            if not started:
                block_start = i
                started = True
            brace_count += 1
        elif content[i] == "}" and started:
            brace_count -= 1
            if brace_count == 0:
                # 跳过可能的 `as const;`
                end = i + 1
                rest = content[end:end + 20].strip()
                if rest.startswith("as const"):
                    end = content.index(";", end) + 1 if ";" in content[end:end + 30] else end + len("as const;")
                elif rest.startswith(";"):
                    end += 1
                return content[block_start:end], end

    return "", match_start


def parse_translations_from_block(block_text: str) -> dict[str, dict[str, str]]:
    """
    从 TypeScript 对象字面量中提取翻译。
    简化解析：逐行正则匹配 key: 'value' 模式。
    """
    translations: dict[str, dict[str, str]] = {loc: {} for loc in LOCALES}

    current_locale = None
    for line in block_text.split("\n"):
        line = line.strip()

        # 检测单行 locale: zh: { key: 'val', key2: 'val2' },
        single_line_match = re.match(
            r"['\"]?(zh-TW|zh|en|th)['\"]?\s*:\s*\{([^}]+)\}", line
        )
        if single_line_match:
            loc = single_line_match.group(1)
            inner = single_line_match.group(2)
            # 提取所有 key: 'value' 对
            for kv in re.finditer(r"(\w+)\s*:\s*['\"]([^'\"]*)['\"]", inner):
                translations[loc][kv.group(1)] = kv.group(2)
            continue

        # 检测多行 locale 开始: zh: {, 'zh-TW': {, en: {, th: {
        locale_match = re.match(r"['\"]?(zh-TW|zh|en|th)['\"]?\s*:\s*\{", line)
        if locale_match:
            loc = locale_match.group(1)
            current_locale = loc
            continue

        # 检测 locale 结束
        if line.startswith("},") or line == "}":
            current_locale = None
            continue

        # 在多行 locale 块内提取 key: 'value' 或 key: "value"
        if current_locale:
            # 简单 key-value: key: 'value',
            kv_match = re.match(r"(\w+)\s*:\s*['\"]([^'\"]*)['\"]", line)
            if kv_match:
                key = kv_match.group(1)
                value = kv_match.group(2)
                translations[current_locale][key] = value
                continue

            # 带反引号模板: key: `value ${var}` → 跳过（函数式，需手动处理）
            if "`" in line:
                kv_match = re.match(r"(\w+)\s*:\s*`([^`]*)`", line)
                if kv_match:
                    key = kv_match.group(1)
                    # 模板字符串转为 next-intl 占位符
                    value = kv_match.group(2)
                    value = re.sub(r"\$\{[^}]+\}", "{param}", value)
                    translations[current_locale][key] = value

            # 函数式: key: (n) => `...` → 标记为需手动处理
            if "=>" in line:
                func_match = re.match(r"(\w+)\s*:", line)
                if func_match:
                    translations[current_locale][func_match.group(1)] = "__MANUAL__"

    return translations


def migrate_file(filepath: Path) -> dict[str, Any]:
    """迁移单个文件，返回提取的翻译"""
    content = filepath.read_text(encoding="utf-8")

    # 查找 dict 定义
    dict_match = DICT_PATTERN.search(content)
    if not dict_match:
        return {}

    dict_name = dict_match.group(1)
    dict_line_start = dict_match.start()

    # 找到 const XXX = { 的完整行开始
    line_start = content.rfind("\n", 0, dict_line_start) + 1

    # 提取整个字典块
    block_text, block_end = extract_dict_block(content, dict_line_start)
    if not block_text:
        print(f"  ⚠ 无法解析字典块: {filepath}")
        return {}

    # 解析翻译
    translations = parse_translations_from_block(block_text)

    # 推导 namespace
    namespace = derive_namespace(filepath)

    # 检查是否有函数式值（需手动处理）
    manual_keys = [k for k, v in translations.get("zh", {}).items() if v == "__MANUAL__"]
    if manual_keys:
        print(f"  ⚠ 含函数式翻译 key（需手动处理）: {manual_keys}")

    # 过滤掉 __MANUAL__ 的 key
    clean_translations = {}
    for loc in LOCALES:
        clean_translations[loc] = {
            k: v for k, v in translations.get(loc, {}).items() if v != "__MANUAL__"
        }

    if not clean_translations.get("zh"):
        print(f"  ⚠ 未提取到翻译 key: {filepath}")
        return {}

    if DRY_RUN:
        print(f"  [dry-run] namespace={namespace}, keys={list(clean_translations['zh'].keys())[:5]}...")
        return {"namespace": namespace, "translations": clean_translations}

    # === 修改文件 ===

    new_content = content

    # 1. 删除整个字典块（从 const 行到 block_end）
    # 也删除可能的注释行（// ── 内联 I18N ──...）
    comment_start = line_start
    prev_lines = content[:line_start].rstrip()
    if prev_lines.endswith("//"):
        # 有注释行，一起删除
        comment_start = prev_lines.rfind("\n") + 1

    # 往前找连续的注释/空行
    while comment_start > 0:
        prev_line_end = content.rfind("\n", 0, comment_start)
        prev_line = content[prev_line_end + 1:comment_start].strip()
        if prev_line.startswith("//") or prev_line == "":
            comment_start = prev_line_end + 1
        else:
            break

    dict_full_text = content[comment_start:block_end]
    new_content = new_content.replace(dict_full_text, "", 1)

    # 2. 删除 locale lookup 行
    lookup_match = LOOKUP_PATTERN.search(new_content)
    if lookup_match:
        # 删除整行
        line_s = new_content.rfind("\n", 0, lookup_match.start())
        line_e = new_content.find("\n", lookup_match.end())
        new_content = new_content[:line_s] + new_content[line_e:]

    # 3. 替换 import: useLocale → useTranslations
    if USE_LOCALE_IMPORT.search(new_content):
        # 如果还有其他地方用 useLocale（如 formatDate），保留 useLocale 并追加 useTranslations
        locale_usages = len(re.findall(r"\buseLocale\b", new_content)) - len(re.findall(r"import.*useLocale", new_content))
        if locale_usages > 0:
            # 保留 useLocale，追加 useTranslations
            new_content = re.sub(
                r"(import\s*\{[^}]*)(useLocale)([^}]*\}\s*from\s*'next-intl')",
                r"\1\2, useTranslations\3",
                new_content,
                count=1,
            )
        else:
            # 替换 useLocale 为 useTranslations
            new_content = re.sub(
                r"(import\s*\{[^}]*)useLocale([^}]*\}\s*from\s*'next-intl')",
                r"\1useTranslations\2",
                new_content,
                count=1,
            )
    else:
        # 没有 next-intl import，添加
        first_import = re.search(r"^import\s", new_content, re.MULTILINE)
        if first_import:
            new_content = (
                new_content[:first_import.start()]
                + "import { useTranslations } from 'next-intl';\n"
                + new_content[first_import.start():]
            )

    # 4. 添加 const t = useTranslations('namespace') 在组件函数体内
    # 找到 useLocale() 调用并替换
    new_content = re.sub(
        r"const\s+locale\s*=\s*useLocale\(\)\s*;?",
        f"const t = useTranslations('{namespace}');",
        new_content,
        count=1,
    )

    # 如果没有 useLocale()，在函数体第一行添加
    if f"useTranslations('{namespace}')" not in new_content:
        # 找第一个 function 或 => { 之后插入
        func_match = re.search(r"(export\s+(?:default\s+)?function\s+\w+[^{]*\{)", new_content)
        if func_match:
            insert_pos = func_match.end()
            new_content = (
                new_content[:insert_pos]
                + f"\n  const t = useTranslations('{namespace}');"
                + new_content[insert_pos:]
            )

    # 5. 替换 t.key → t('key')
    for key in clean_translations.get("zh", {}):
        # t.key 在 JSX 和 JS 中的各种用法
        new_content = re.sub(rf"\bt\.{key}\b", f"t('{key}')", new_content)

    # 6. 清理多余空行
    new_content = re.sub(r"\n{3,}", "\n\n", new_content)

    # 写回文件
    filepath.write_text(new_content, encoding="utf-8")

    return {"namespace": namespace, "translations": clean_translations}


def update_messages(all_translations: dict[str, dict[str, dict[str, str]]]):
    """更新 messages JSON 文件"""
    for locale in LOCALES:
        msg_file = MESSAGES_DIR / f"{locale}.json"
        if msg_file.exists():
            messages = json.loads(msg_file.read_text(encoding="utf-8"))
        else:
            messages = {}

        for namespace, trans in all_translations.items():
            locale_trans = trans.get(locale, {})
            if not locale_trans:
                continue

            if namespace not in messages:
                messages[namespace] = {}

            for key, value in locale_trans.items():
                if key not in messages[namespace]:
                    messages[namespace][key] = value

        if not DRY_RUN:
            msg_file.write_text(
                json.dumps(messages, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            print(f"  ✓ {msg_file.name}: +{sum(len(t.get(locale, {})) for t in all_translations.values())} keys")


def main():
    if SINGLE_FILE:
        files = [SINGLE_FILE.resolve()]
    else:
        # 找到所有含内联 i18n 的 .tsx 文件
        files = []
        for pattern in ["components/**/*.tsx", "app/**/*.tsx"]:
            for f in FRONTEND_DIR.glob(pattern):
                if "node_modules" in str(f) or ".next" in str(f):
                    continue
                content = f.read_text(encoding="utf-8")
                if DICT_PATTERN.search(content):
                    files.append(f)

    print(f"=== i18n 迁移: {len(files)} 个文件 {'(dry-run)' if DRY_RUN else ''} ===\n")

    all_translations: dict[str, dict[str, dict[str, str]]] = {}
    migrated = 0
    failed = 0

    for filepath in sorted(files):
        rel = filepath.relative_to(FRONTEND_DIR)
        print(f"[{migrated + 1}/{len(files)}] {rel}")

        try:
            result = migrate_file(filepath)
            if result:
                ns = result["namespace"]
                if ns in all_translations:
                    # 合并到已有 namespace
                    for loc in LOCALES:
                        existing = all_translations[ns].get(loc, {})
                        new = result["translations"].get(loc, {})
                        existing.update(new)
                        all_translations[ns][loc] = existing
                else:
                    all_translations[ns] = result["translations"]
                migrated += 1
            else:
                failed += 1
        except Exception as e:
            print(f"  ✗ 错误: {e}")
            failed += 1

    # 更新 messages JSON
    if all_translations:
        print(f"\n=== 更新 messages JSON ===")
        update_messages(all_translations)

    print(f"\n=== 完成: {migrated} 迁移, {failed} 失败/跳过 ===")


if __name__ == "__main__":
    main()
