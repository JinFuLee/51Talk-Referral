"""OCR 金额提取 — 从钉钉支付截图中读取 THB 金额

支付截图格式（51Talk 付费成功页）：
  การชำระเงินสำเร็จ / Payment successful
  ...
  จำนวนเงินที่ได้ชำระ::    THB 35099.00
  Amount due:              THB 29999.00
"""
from __future__ import annotations

import io
import logging
import re
import urllib.request
from pathlib import Path

logger = logging.getLogger("order-ocr")


def extract_thb_from_image(image_bytes: bytes) -> float | None:
    """从付费截图中 OCR 提取 THB 金额。

    Returns:
        THB 金额（float），提取失败返回 None
    """
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        logger.warning("pytesseract/Pillow 未安装，跳过 OCR")
        return None

    try:
        img = Image.open(io.BytesIO(image_bytes))

        # OCR（英文+泰文）
        text = pytesseract.image_to_string(img, lang="eng+tha")
        logger.info("OCR 文本: %s", text[:200].replace("\n", " | "))

        return _parse_thb_from_text(text)

    except Exception as e:
        logger.error("OCR 失败: %s", e)
        return None


def _parse_thb_from_text(text: str) -> float | None:
    """从 OCR 文本中提取 THB 金额。

    匹配模式（按优先级）：
    1. "THB 35,099.00" / "THB 35099.00" / "THB35,099"
    2. "Amount due: THB 29999.00"
    3. "จำนวนเงินที่ได้ชำระ:: THB 35099.00"
    4. 任意 "THB" 后跟数字
    """
    # 清理 OCR 噪音（Tesseract 常见误识别）
    cleaned = text
    for wrong in ("THE ", "THe ", "TH8 ", "THS ", "THG "):
        cleaned = cleaned.replace(wrong, "THB ")

    # 模式（按优先级）
    patterns = [
        # "THB 35099.00" / "THB 35,099.00" / "THB35099"
        r"THB\s*([\d,]+(?:[.,]\d{1,2})?)",
        # "฿35,099" / "฿ 35099.00"
        r"฿\s*([\d,]+(?:[.,]\d{1,2})?)",
        # "Amount due" 行
        r"(?:amount|Amount)\s*(?:due)?\s*[:\-]?\s*(?:THB)?\s*([\d,]+(?:[.,]\d{1,2})?)",
    ]

    amounts: list[float] = []
    for pattern in patterns:
        for m in re.finditer(pattern, cleaned, re.IGNORECASE):
            try:
                val = float(m.group(1).replace(",", ""))
                if val > 100:  # 过滤太小的数（可能是误识别）
                    amounts.append(val)
            except ValueError:
                continue

    if not amounts:
        logger.info("OCR 未找到 THB 金额")
        return None

    # 取最大值（付费金额通常是最大的数字，排除 0.00 余额）
    # 但要排除 THB 0.00（จำนวนเงินชำระที่เหลืออยู่ = 剩余应付）
    non_zero = [a for a in amounts if a > 0]
    if not non_zero:
        return None

    result = max(non_zero)
    logger.info("OCR 提取金额: ฿%.2f (候选: %s)", result, amounts)
    return result


def _get_dingtalk_access_token(app_key: str, app_secret: str) -> str | None:
    """获取钉钉 access_token（有效期 2 小时，不缓存）"""
    import json as _json
    url = "https://api.dingtalk.com/v1.0/oauth2/accessToken"
    payload = _json.dumps({
        "appKey": app_key,
        "appSecret": app_secret,
    }).encode("utf-8")
    try:
        req = urllib.request.Request(
            url, data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = _json.loads(resp.read().decode("utf-8"))
            token = result.get("accessToken")
            if token:
                logger.info("获取 access_token 成功")
                return token
    except Exception as e:
        logger.error("获取 access_token 失败: %s", e)
    return None


def download_dingtalk_image(
    download_code: str,
    robot_code: str,
    app_key: str,
    app_secret: str,
) -> bytes | None:
    """从钉钉下载 richText 中的图片。

    流程：获取 access_token → POST /v1.0/robot/messageFiles/download → 下载图片
    """
    import json as _json

    token = _get_dingtalk_access_token(app_key, app_secret)
    if not token:
        return None

    url = "https://api.dingtalk.com/v1.0/robot/messageFiles/download"
    payload = _json.dumps({
        "downloadCode": download_code,
        "robotCode": robot_code,
    }).encode("utf-8")

    try:
        req = urllib.request.Request(
            url, data=payload,
            headers={
                "Content-Type": "application/json",
                "x-acs-dingtalk-access-token": token,
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = _json.loads(resp.read().decode("utf-8"))
            download_url = result.get("downloadUrl")
            if download_url:
                logger.info("图片下载 URL: %s", download_url[:80])
                return download_image_url(download_url)
            else:
                logger.warning("API 无 downloadUrl: %s", result)
    except Exception as e:
        logger.error("图片下载失败: %s", e)

    return None


def download_image_url(url: str) -> bytes | None:
    """直接从 URL 下载图片。"""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "DingTalk-Bot"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read()
    except Exception as e:
        logger.error("图片 URL 下载失败: %s", e)
        return None
