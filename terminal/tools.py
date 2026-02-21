"""
terminal/tools.py
OpenAPI → Claude tool_use 格式转换器，以及工具执行器。

主要功能：
  - fetch_openapi_spec：从后端获取 /openapi.json
  - openapi_to_claude_tools：将 OpenAPI paths 映射为 Claude tools 参数
  - execute_tool：根据 tool_name 还原 HTTP 请求并调用 FastAPI
"""
from __future__ import annotations

import json
import re
from typing import Any

import httpx

# ── 过滤不适合 AI 调用的端点 ────────────────────────────────────────────────
_EXCLUDED_PATH_PATTERNS: list[re.Pattern] = [
    re.compile(r"^/api/health"),
    re.compile(r"^/openapi"),
    re.compile(r"^/docs"),
    re.compile(r"^/redoc"),
    re.compile(r"^/api/system/logs"),      # 大量原始日志，不适合 AI 消费
]

# 允许的 HTTP 方法（过滤掉 OPTIONS/HEAD 等）
_ALLOWED_METHODS = {"get", "post", "put", "patch", "delete"}

# tool name 最大长度（Claude 限制 64 字符）
_MAX_TOOL_NAME_LEN = 64


def _path_to_snake(method: str, path: str) -> str:
    """
    将 HTTP method + URL path 转换为 snake_case tool name。
    e.g. GET /api/analysis/summary → get_api_analysis_summary
    """
    # 将 {param} 占位符替换为 by_param
    clean = re.sub(r"\{(\w+)\}", lambda m: f"by_{m.group(1)}", path)
    # 将非字母数字字符替换为下划线
    clean = re.sub(r"[^a-zA-Z0-9]+", "_", clean)
    clean = clean.strip("_")
    name = f"{method.lower()}_{clean}"
    # 截断到最大长度
    if len(name) > _MAX_TOOL_NAME_LEN:
        name = name[:_MAX_TOOL_NAME_LEN].rstrip("_")
    return name


def _is_excluded(path: str) -> bool:
    return any(p.match(path) for p in _EXCLUDED_PATH_PATTERNS)


def _build_input_schema(operation: dict[str, Any]) -> dict[str, Any]:
    """
    从 OpenAPI operation 对象构建 Claude tool 的 input_schema (JSON Schema)。
    合并 path parameters + query parameters + requestBody。
    """
    properties: dict[str, Any] = {}
    required: list[str] = []

    # Path/Query parameters
    for param in operation.get("parameters", []):
        name = param.get("name", "")
        if not name:
            continue
        schema = param.get("schema", {})
        prop: dict[str, Any] = {
            "type": schema.get("type", "string"),
            "description": param.get("description", f"{name} 参数"),
        }
        if "enum" in schema:
            prop["enum"] = schema["enum"]
        if "default" in schema:
            prop["default"] = schema["default"]
        properties[name] = prop
        if param.get("required", False):
            required.append(name)

    # requestBody（JSON 格式）
    req_body = operation.get("requestBody", {})
    if req_body:
        content = req_body.get("content", {})
        json_schema = content.get("application/json", {}).get("schema", {})
        # 展开 body 的 properties
        body_props = json_schema.get("properties", {})
        body_required = json_schema.get("required", [])
        for k, v in body_props.items():
            properties[k] = v
        required.extend(r for r in body_required if r not in required)

    schema: dict[str, Any] = {"type": "object", "properties": properties}
    if required:
        schema["required"] = required
    return schema


async def fetch_openapi_spec(backend_url: str) -> dict[str, Any]:
    """从后端 /openapi.json 获取 OpenAPI 3.x spec。"""
    url = f"{backend_url.rstrip('/')}/openapi.json"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


def openapi_to_claude_tools(spec: dict[str, Any]) -> list[dict[str, Any]]:
    """
    将 OpenAPI spec 转换为 Claude messages API 的 tools 参数格式。

    每个 endpoint 生成一个 tool：
      {
        "name": "get_api_analysis_summary",
        "description": "...",
        "input_schema": { "type": "object", "properties": {...} }
      }

    过滤：health check / openapi / docs / system logs 等不适合 AI 的端点。
    """
    tools: list[dict[str, Any]] = []
    paths = spec.get("paths", {})

    for path, path_item in paths.items():
        if _is_excluded(path):
            continue
        for method, operation in path_item.items():
            if method.lower() not in _ALLOWED_METHODS:
                continue
            if not isinstance(operation, dict):
                continue

            tool_name = _path_to_snake(method, path)
            summary = operation.get("summary") or ""
            description = operation.get("description") or ""
            tags = operation.get("tags", [])
            tag_str = f"[{'/'.join(tags)}] " if tags else ""
            full_desc = f"{tag_str}{summary or description or path}".strip()
            if not full_desc:
                full_desc = f"{method.upper()} {path}"

            # 附加路径信息，方便调试
            full_desc += f"\n路径: {method.upper()} {path}"

            tool = {
                "name": tool_name,
                "description": full_desc,
                "input_schema": _build_input_schema(operation),
                # 内部元数据（不传给 Claude，仅供 execute_tool 用）
                "_method": method.lower(),
                "_path": path,
            }
            tools.append(tool)

    return tools


def _tools_meta_map(tools: list[dict[str, Any]]) -> dict[str, dict[str, str]]:
    """
    从 tools 列表构建 {tool_name: {method, path}} 的查找表。
    """
    return {
        t["name"]: {"method": t["_method"], "path": t["_path"]}
        for t in tools
        if "_method" in t and "_path" in t
    }


def claude_tools_format(tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    返回适合传给 Claude API 的 tools 列表（去掉内部 _method/_path 字段）。
    """
    return [
        {k: v for k, v in t.items() if not k.startswith("_")}
        for t in tools
    ]


async def execute_tool(
    tool_name: str,
    tool_input: dict[str, Any],
    backend_url: str,
    tools_meta: dict[str, dict[str, str]],
) -> str:
    """
    根据 tool_name 查找 HTTP method + path，填充路径参数后调用 FastAPI。
    返回 JSON 字符串（成功）或错误描述字符串（失败）。
    """
    meta = tools_meta.get(tool_name)
    if not meta:
        return json.dumps({"error": f"未知工具: {tool_name}"}, ensure_ascii=False)

    method = meta["method"]
    path_template = meta["path"]

    # 填充路径参数（如 /api/analysis/kpi/{metric}）
    path = path_template
    path_params_used: set[str] = set()
    for match in re.finditer(r"\{(\w+)\}", path_template):
        param_name = match.group(1)
        if param_name in tool_input:
            path = path.replace(f"{{{param_name}}}", str(tool_input[param_name]))
            path_params_used.add(param_name)

    url = f"{backend_url.rstrip('/')}{path}"

    # 剩余参数：GET → query params；POST/PUT/PATCH → body
    remaining = {k: v for k, v in tool_input.items() if k not in path_params_used}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if method in ("get", "delete"):
                resp = await client.request(method.upper(), url, params=remaining)
            else:
                resp = await client.request(method.upper(), url, json=remaining)

            if resp.status_code >= 400:
                return json.dumps(
                    {"error": f"HTTP {resp.status_code}", "detail": resp.text},
                    ensure_ascii=False,
                )
            # 尝试解析 JSON，失败则返回纯文本
            try:
                return json.dumps(resp.json(), ensure_ascii=False, indent=2)
            except Exception:
                return resp.text
    except httpx.ConnectError:
        return json.dumps(
            {"error": "无法连接后端", "detail": f"请确认后端已启动：{backend_url}"},
            ensure_ascii=False,
        )
    except Exception as exc:
        return json.dumps({"error": f"工具执行异常: {type(exc).__name__}", "detail": str(exc)}, ensure_ascii=False)
