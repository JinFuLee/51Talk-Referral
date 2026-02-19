"""Gemini API 客户端 — 支持 key 轮换、重试、JSON 验证、优雅降级"""
import json
import time
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

class GeminiClient:
    def __init__(self, keys_path: str = None):
        """初始化：加载 key 列表，优先用 free_keys"""
        if keys_path is None:
            keys_path = str(Path(__file__).resolve().parent.parent / "key" / "gemini.json")
        self.keys = []
        self.current_key_index = 0
        self.model_name = "gemini-2.5-flash"
        self._load_keys(keys_path)
        self._client = None

    def _load_keys(self, path):
        """从 JSON 文件加载 API keys"""
        try:
            with open(path, 'r') as f:
                data = json.load(f)
            # 优先使用 free_keys
            self.keys = data.get("free_keys", []) + data.get("keys", [])
            if self.keys:
                logger.info(f"Gemini: 加载 {len(self.keys)} 个 API key")
        except Exception as e:
            logger.warning(f"Gemini: key 文件加载失败: {e}")
            self.keys = []

    def _get_client(self):
        """获取/创建 Gemini client（延迟初始化）"""
        if not self.keys:
            return None
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.keys[self.current_key_index])
            return genai.GenerativeModel(self.model_name)
        except ImportError:
            logger.warning("google-generativeai 未安装，AI 功能禁用")
            return None
        except Exception as e:
            logger.warning(f"Gemini client 创建失败: {e}")
            return None

    def _rotate_key(self):
        """切换到下一个 key"""
        self.current_key_index = (self.current_key_index + 1) % len(self.keys)
        self._client = None  # 强制重新创建
        logger.info(f"Gemini: 切换到 key #{self.current_key_index + 1}")

    def generate_json(self, prompt: str, max_retries: int = 3) -> Optional[dict]:
        """生成 JSON 结构化输出，失败返回 None"""
        for attempt in range(max_retries):
            model = self._get_client()
            if model is None:
                return None
            try:
                response = model.generate_content(
                    prompt + "\n\n请严格输出 JSON 格式，不要包含 markdown 代码块标记。",
                    generation_config={
                        "response_mime_type": "application/json",
                        "temperature": 0.3,
                    }
                )
                text = response.text.strip()
                # 清理可能的 markdown 标记
                if text.startswith("```"):
                    text = text.split("\n", 1)[1] if "\n" in text else text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
                result = json.loads(text)
                logger.info(f"Gemini: JSON 生成成功 (attempt {attempt + 1})")
                return result
            except json.JSONDecodeError as e:
                logger.warning(f"Gemini: JSON 解析失败 (attempt {attempt + 1}): {e}")
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "quota" in error_str.lower():
                    logger.warning(f"Gemini: 限流，切换 key (attempt {attempt + 1})")
                    self._rotate_key()
                elif "403" in error_str or "invalid" in error_str.lower():
                    logger.warning(f"Gemini: key 无效，切换 (attempt {attempt + 1})")
                    self._rotate_key()
                else:
                    logger.warning(f"Gemini: 请求失败 (attempt {attempt + 1}): {e}")
            # 指数退避
            if attempt < max_retries - 1:
                wait = 2 ** attempt
                time.sleep(wait)
        logger.error("Gemini: 所有重试失败，返回 None（降级到规则模板）")
        return None

    def generate_text(self, prompt: str, max_retries: int = 3) -> Optional[str]:
        """生成纯文本输出，失败返回 None"""
        for attempt in range(max_retries):
            model = self._get_client()
            if model is None:
                return None
            try:
                response = model.generate_content(
                    prompt,
                    generation_config={"temperature": 0.3}
                )
                result = response.text.strip()
                logger.info(f"Gemini: 文本生成成功 (attempt {attempt + 1})")
                return result
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "quota" in error_str.lower():
                    self._rotate_key()
                elif "403" in error_str or "invalid" in error_str.lower():
                    self._rotate_key()
                else:
                    logger.warning(f"Gemini: 请求失败 (attempt {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
        return None
