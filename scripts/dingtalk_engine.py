#!/usr/bin/env python3
"""钉钉多通道通知引擎

支持多群、多角色、多层级的推送路由。
框架配置：key/dingtalk-channels.json
内容配置：projects/referral/notification-config.json

用法：
  from scripts.dingtalk_engine import NotificationEngine
  engine = NotificationEngine()
  engine.run()                          # 推送所有 enabled 通道
  engine.run(channel_id="cc_all")       # 推送指定通道
  engine.run(dry_run=True)              # 只生成图片不发送
  engine.run(test=True)                 # 连通性测试
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CHANNELS_PATH = PROJECT_ROOT / "key" / "dingtalk-channels.json"
DEFAULT_CONFIG_PATH = (
    PROJECT_ROOT / "projects" / "referral" / "notification-config.json"
)
OUTPUT_DIR = PROJECT_ROOT / "output"
LOG_PATH = OUTPUT_DIR / "notification-log.jsonl"


class NotificationEngine:
    """通用通知引擎：读配置 → 按通道生成 → 发送 → 日志

    配置分层：
      channels_path（key/dingtalk-channels.json）
        — 机密层：webhook/secret/通道元数据
      config_path（projects/referral/notification-config.json）
        — 内容层：模块定义/路由规则
    """

    def __init__(
        self,
        channels_path: Path = DEFAULT_CHANNELS_PATH,
        config_path: Path = DEFAULT_CONFIG_PATH,
    ) -> None:
        self.channels_data = self._load_json(channels_path)
        self.config = self._load_json(config_path)
        self.channels: dict[str, dict] = self.channels_data.get("channels", {})
        self.defaults: dict[str, Any] = self.channels_data.get("defaults", {})
        self.api_base: str = self.defaults.get("api_base", "http://localhost:8100")
        self.routing: dict[str, list[str]] = self.config.get("routing", {})

    # ── 公共接口 ──────────────────────────────────────────────────────────────

    def run(
        self,
        channel_id: str | None = None,
        dry_run: bool = False,
        test: bool = False,
    ) -> None:
        """执行推送

        Args:
            channel_id: 指定通道 ID；None 表示所有 enabled 通道
            dry_run:    只生成图片，不上传不发送
            test:       发送连通性测试消息
        """
        targets = self._resolve_targets(channel_id)

        if not targets:
            print("没有可用的通道（检查 channels.json 和 enabled 状态）")
            return

        for ch_id, ch in targets:
            print(f"\n{'='*40}")
            print(
                f"通道: {ch_id} ({ch.get('group_name', '?')}) | "
                f"角色: {ch.get('role')} | "
                f"受众: {ch.get('audience')}"
            )
            print(f"{'='*40}")

            if test:
                self._send_test(ch)
                continue

            modules = self._get_modules(ch)
            print(f"内容模块: {', '.join(modules)}")

            results: list[dict] = []
            for mod_id in modules:
                result = self._process_module(mod_id, ch, dry_run)
                results.append(result)

            if not dry_run:
                self._log(ch_id, ch, modules, results)

        print(f"\n完成：{len(targets)} 个通道")

    # ── 内部：通道解析 ────────────────────────────────────────────────────────

    def _resolve_targets(self, channel_id: str | None) -> list[tuple[str, dict]]:
        """解析目标通道列表"""
        if channel_id:
            ch = self.channels.get(channel_id)
            if not ch:
                available = list(self.channels.keys())
                print(f"通道 {channel_id!r} 不存在，可用通道: {available}")
                return []
            return [(channel_id, ch)]
        # 全部 enabled 通道
        return [
            (cid, ch)
            for cid, ch in self.channels.items()
            if ch.get("enabled", False)
        ]

    def _get_modules(self, channel: dict) -> list[str]:
        """根据 audience 路由到内容模块列表"""
        audience = channel.get("audience", "all")
        return self.routing.get(audience, self.routing.get("all", []))

    # ── 内部：模块处理 ────────────────────────────────────────────────────────

    def _process_module(self, module_id: str, channel: dict, dry_run: bool) -> dict:
        """处理单个内容模块：获取数据 → 生成图片 → 发送"""
        result: dict[str, Any] = {
            "module": module_id,
            "status": "pending",
            "images_count": 0,
        }

        try:
            role = channel.get("role", "CC")
            data = self._fetch_data(role)
            if not data:
                result["status"] = "no_data"
                print(f"  [{module_id}] 无数据")
                return result

            images = self._generate_images(module_id, data, role)
            result["images_count"] = len(images)

            if not images:
                result["status"] = "no_images"
                print(f"  [{module_id}] 该模块暂无图片生成器（待后续迭代实现）")
                return result

            if dry_run:
                for title, img_bytes, path in images:
                    kb = len(img_bytes) / 1024
                    print(f"  [{module_id}] {title} → {path} ({kb:.0f} KB)")
                result["status"] = "dry_run"
                return result

            # 发送
            success = 0
            for title, img_bytes, path in images:
                if self._upload_and_send(img_bytes, title, channel, path.name):
                    success += 1
                time.sleep(1.5)  # 钉钉频率限制：相邻消息间隔

            result["status"] = "sent" if success == len(images) else "partial"
            result["sent"] = success

        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)
            print(f"  [{module_id}] 错误: {e}")

        return result

    # ── 内部：数据获取 ────────────────────────────────────────────────────────

    def _fetch_data(self, role: str) -> dict | None:
        """从后端 API 获取打卡排行数据（含重试）"""
        role_config = self.defaults.get("role_config")
        url = f"{self.api_base}/api/checkin/ranking"
        if role_config:
            encoded = urllib.parse.quote(json.dumps(role_config, ensure_ascii=False))
            url += f"?role_config={encoded}"

        last_exc: Exception | None = None
        for attempt in range(3):
            if attempt > 0:
                time.sleep(attempt * 1)
            try:
                req = urllib.request.Request(
                    url, headers={"Accept": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except Exception as e:
                last_exc = e
                print(f"  _fetch_data 第 {attempt + 1} 次失败: {e}")

        raise RuntimeError("_fetch_data 重试 3 次仍失败") from last_exc

    # ── 内部：图片生成 ────────────────────────────────────────────────────────

    def _generate_images(
        self,
        module_id: str,
        data: dict,
        role: str,
    ) -> list[tuple[str, bytes, Path]]:
        """生成图片，返回 [(title, image_bytes, save_path)]

        延迟 import dingtalk_daily 的图片函数，避免循环依赖。
        未实现的模块返回空列表，不报错（待后续迭代）。
        """
        # 延迟导入，避免循环依赖（engine 先加载，daily 后加载时不触发重入）
        import sys  # noqa: PLC0415

        _scripts_dir = str(Path(__file__).resolve().parent)
        if _scripts_dir not in sys.path:
            sys.path.insert(0, _scripts_dir)
        import dingtalk_daily as _daily_mod  # noqa: PLC0415
        generate_report_image = _daily_mod.generate_report_image
        generate_team_image = _daily_mod.generate_team_image

        OUTPUT_DIR.mkdir(exist_ok=True)
        date_tag = datetime.now().strftime("%Y%m%d")
        today_str = datetime.now().strftime("%d/%m")
        images: list[tuple[str, bytes, Path]] = []

        role_data = data.get("by_role", {}).get(role, {})

        if module_id == "team_ranking":
            img = generate_report_image(data)
            path = OUTPUT_DIR / f"checkin-overview-{role}-{date_tag}.png"
            path.write_bytes(img)
            images.append((f"{role} Check-in Overview {today_str}", img, path))

        elif module_id == "individual_ranking":
            persons: list[dict] = role_data.get("by_person", [])
            groups: list[dict] = role_data.get("by_group", [])

            # 按 group 分桶
            group_members: dict[str, list[dict]] = {}
            for p in persons:
                g = p.get("group", "") or "Unknown"
                group_members.setdefault(g, []).append(p)

            # 按 by_group 顺序排列，补充不在列表中的团队
            group_order = [g.get("group", "") for g in groups]
            ordered = [t for t in group_order if t in group_members]
            ordered += [t for t in group_members if t not in ordered]

            for team_name in ordered:
                members = group_members[team_name]
                if not members:
                    continue
                t_total = sum(m.get("students", 0) for m in members)
                t_checked = sum(m.get("checked_in", 0) for m in members)
                short = team_name.replace("TH-", "").replace("Team", "")

                img = generate_team_image(team_name, members, t_total, t_checked)
                path = OUTPUT_DIR / f"checkin-{short}-{date_tag}.png"
                path.write_bytes(img)
                images.append((f"{short} Check-in {today_str}", img, path))

        # result_metrics / achievement_metrics / process_metrics 等模块
        # 暂返回空列表，后续迭代实现对应 image generator
        else:
            pass

        return images

    # ── 内部：上传+发送 ───────────────────────────────────────────────────────

    def _upload_and_send(
        self,
        img_bytes: bytes,
        title: str,
        channel: dict,
        filename: str = "report.png",
    ) -> bool:
        """上传图床 → 发钉钉 Markdown；失败时对总览图做纯文本回退"""
        import sys  # noqa: PLC0415

        _scripts_dir = str(Path(__file__).resolve().parent)
        if _scripts_dir not in sys.path:
            sys.path.insert(0, _scripts_dir)
        import dingtalk_daily as _daily_mod  # noqa: PLC0415

        img_url = _daily_mod.upload_image(img_bytes, filename)
        if img_url:
            md = f"## {title}\n\n![report]({img_url})"
            result = self._send_dingtalk(title, md, channel)
            if result.get("errcode") == 0:
                print(f"  {title} 发送成功")
                return True
            print(f"  {title} 发送失败: {result}")
        else:
            print(f"  {title} 图床上传失败，尝试文本回退")

        # 总览图文本回退
        if "overview" in filename.lower() or "Overview" in title:
            try:
                role = channel.get("role", "CC")
                data = self._fetch_data(role)
                if data:
                    md_fallback = _daily_mod.build_text_markdown(data)
                    self._send_dingtalk(title, md_fallback, channel)
                    print(f"  {title} 文本回退完成")
            except Exception as fb_exc:
                print(f"  {title} 文本回退失败: {fb_exc}")

        return False

    # ── 内部：钉钉签名发送 ────────────────────────────────────────────────────

    def _send_dingtalk(self, title: str, markdown_text: str, channel: dict) -> dict:
        """钉钉加签模式发送 Markdown 消息"""
        webhook: str = channel["webhook"]
        secret: str = channel["secret"]

        timestamp = str(int(time.time() * 1000))
        sign_str = f"{timestamp}\n{secret}"
        hmac_code = hmac.new(
            secret.encode("utf-8"),
            sign_str.encode("utf-8"),
            digestmod=hashlib.sha256,
        ).digest()
        sign = urllib.parse.quote_plus(base64.b64encode(hmac_code).decode("utf-8"))
        url = f"{webhook}&timestamp={timestamp}&sign={sign}"

        payload = json.dumps(
            {
                "msgtype": "markdown",
                "markdown": {"title": title, "text": markdown_text},
            },
            ensure_ascii=False,
        ).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))

    # ── 内部：连通测试 ────────────────────────────────────────────────────────

    def _send_test(self, channel: dict) -> None:
        """向指定通道发送连通性测试消息"""
        md = (
            f"## ทดสอบระบบ\n\n"
            f"ระบบรายงานทำงานปกติ\n\n"
            f"- 通道: {channel.get('group_name', '?')}\n"
            f"- 角色: {channel.get('role', '?')}\n"
            f"- 受众: {channel.get('audience', '?')}\n\n"
            f"> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )
        result = self._send_dingtalk("ทดสอบ", md, channel)
        print(f"  测试结果: {json.dumps(result, ensure_ascii=False)}")

    # ── 内部：推送日志 ────────────────────────────────────────────────────────

    def _log(
        self,
        channel_id: str,
        channel: dict,
        modules: list[str],
        results: list[dict],
    ) -> None:
        """追加一条推送记录到 output/notification-log.jsonl"""
        LOG_PATH.parent.mkdir(exist_ok=True)
        entry = json.dumps(
            {
                "ts": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "channel": channel_id,
                "role": channel.get("role"),
                "audience": channel.get("audience"),
                "modules": modules,
                "results": results,
            },
            ensure_ascii=False,
        )
        with open(LOG_PATH, "a") as f:
            f.write(entry + "\n")

    # ── 静态工具 ──────────────────────────────────────────────────────────────

    @staticmethod
    def _load_json(path: Path) -> dict:
        """加载 JSON 配置文件"""
        with open(path) as f:
            return json.load(f)
