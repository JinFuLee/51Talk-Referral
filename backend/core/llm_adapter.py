"""
Gemini LLM 适配器
- 从 key/gemini.json 加载 API keys
- Round-robin key 轮换 + 失败自动换下一个 key
- 模型：gemini-2.5-flash（从 json 读取 recommended_model）
- 所有 key 失败时优雅降级返回空字符串
"""
from __future__ import annotations

import json
import logging
import threading
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# 项目根目录（backend/core/ -> backend/ -> project_root/）
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_GEMINI_KEY_FILE = _PROJECT_ROOT / "key" / "gemini.json"


class GeminiAdapter:
    """
    Gemini API 适配器，支持多 key 轮换。

    用法：
        adapter = GeminiAdapter()
        text = adapter.generate("请分析以下数据：...")
    """

    def __init__(self, key_file: Optional[Path] = None) -> None:
        self._key_file = key_file or _GEMINI_KEY_FILE
        self._keys: list[str] = []
        self._model_name: str = "gemini-2.5-flash"
        self._lock = threading.Lock()
        self._current_index: int = 0
        self._load_keys()

    def _load_keys(self) -> None:
        """从 gemini.json 加载所有 keys（paid + free）"""
        if not self._key_file.exists():
            logger.warning(f"Gemini key 文件不存在: {self._key_file}")
            return
        try:
            with open(self._key_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            # 优先 paid keys，然后 free keys
            paid_keys: list[str] = data.get("keys", [])
            free_keys: list[str] = data.get("free_keys", [])
            self._keys = paid_keys + free_keys
            # 读取推荐模型
            self._model_name = data.get("recommended_model", "gemini-2.5-flash")
            logger.info(
                f"Gemini 加载 {len(paid_keys)} paid + {len(free_keys)} free keys，"
                f"模型: {self._model_name}"
            )
        except Exception as e:
            logger.error(f"加载 Gemini key 文件失败: {e}")
            self._keys = []

    def _next_key(self) -> Optional[str]:
        """Round-robin 取下一个 key（线程安全）"""
        with self._lock:
            if not self._keys:
                return None
            key = self._keys[self._current_index % len(self._keys)]
            self._current_index = (self._current_index + 1) % len(self._keys)
            return key

    def generate(self, prompt: str, max_tokens: int = 2000) -> str:
        """
        调用 Gemini 生成文本。
        Round-robin 轮换所有 key，全部失败时返回空字符串（graceful degradation）。

        Args:
            prompt:     输入 prompt（中文）
            max_tokens: 最大输出 token 数

        Returns:
            生成的文本字符串，失败时返回空字符串
        """
        if not self._keys:
            logger.warning("Gemini keys 为空，跳过 LLM 调用")
            return ""

        import google.generativeai as genai  # type: ignore

        tried: set[str] = set()
        total = len(self._keys)

        for _ in range(total):
            key = self._next_key()
            if key is None or key in tried:
                continue
            tried.add(key)
            try:
                genai.configure(api_key=key)
                model = genai.GenerativeModel(
                    model_name=self._model_name,
                    generation_config=genai.GenerationConfig(
                        max_output_tokens=max_tokens,
                        temperature=0.7,
                    ),
                )
                response = model.generate_content(prompt)
                text = response.text.strip() if response.text else ""
                logger.info(
                    f"Gemini 生成成功（key 尾4位: ...{key[-4:]}），"
                    f"输出 {len(text)} 字符"
                )
                return text
            except Exception as e:
                logger.warning(f"Gemini key ...{key[-4:]} 调用失败: {e}，尝试下一个 key")
                continue

        logger.error("所有 Gemini keys 均失败，返回空字符串")
        return ""

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def key_count(self) -> int:
        return len(self._keys)


# 模块级单例（懒加载）
_default_adapter: Optional[GeminiAdapter] = None
_adapter_lock = threading.Lock()


def get_adapter() -> GeminiAdapter:
    """获取全局 GeminiAdapter 单例（线程安全懒加载）"""
    global _default_adapter
    if _default_adapter is None:
        with _adapter_lock:
            if _default_adapter is None:
                _default_adapter = GeminiAdapter()
    return _default_adapter


def generate(prompt: str, max_tokens: int = 2000) -> str:
    """模块级快捷调用"""
    return get_adapter().generate(prompt, max_tokens=max_tokens)
