"""通知推送系统 — 邮件 + LINE Notify"""
import json
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from typing import List, Optional
from urllib.request import urlopen, Request
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

class Notifier:
    def __init__(self, config_path: str = None):
        if config_path is None:
            config_path = str(Path(__file__).resolve().parent.parent / "config" / "notify.json")
        self.config = self._load_config(config_path)

    def _load_config(self, path) -> dict:
        defaults = {
            "email": {"enabled": False},
            "line": {"enabled": False},
            "alert_threshold": {"付费缺口": -0.20, "出席付费率下降": 0.15}
        }
        try:
            with open(path, 'r') as f:
                loaded = json.load(f)
            defaults.update(loaded)
        except FileNotFoundError:
            logger.info(f"通知配置不存在: {path}，通知功能禁用")
        return defaults

    def send(self, report_path: str, alerts: list = None):
        """发送报告完成通知"""
        message = self._format_report_message(report_path, alerts)
        if self.config.get("email", {}).get("enabled"):
            self._send_email("51Talk 转介绍日报已生成", message, report_path)
        if self.config.get("line", {}).get("enabled"):
            self._send_line(message)
        if not self.config.get("email", {}).get("enabled") and not self.config.get("line", {}).get("enabled"):
            logger.info("[通知] email/LINE 均未启用，跳过通知")

    def send_alert(self, high_alerts: list):
        """发送高级别预警"""
        message = self._format_alert_message(high_alerts)
        if self.config.get("email", {}).get("enabled"):
            self._send_email("🔴 51Talk 转介绍预警", message)
        if self.config.get("line", {}).get("enabled"):
            self._send_line("🔴 " + message)

    def _format_report_message(self, report_path: str, alerts: list = None) -> str:
        lines = [f"📊 报告已生成: {Path(report_path).name}"]
        if alerts:
            high = [a for a in alerts if "🔴" in a.get("级别", "")]
            if high:
                lines.append(f"\n⚠️ {len(high)} 个高级别预警：")
                for a in high[:3]:
                    lines.append(f"  - {a.get('风险项')}: {a.get('量化影响')}")
        return "\n".join(lines)

    def _format_alert_message(self, alerts: list) -> str:
        lines = ["紧急预警通知："]
        for a in alerts[:5]:
            lines.append(f"- [{a.get('级别')}] {a.get('风险项')}: {a.get('量化影响')}")
            lines.append(f"  应对: {a.get('应对方案')}")
        return "\n".join(lines)

    def _send_email(self, subject: str, body: str, attachment_path: str = None):
        """SMTP 邮件发送"""
        email_config = self.config.get("email", {})
        try:
            # 加载凭证
            cred_file = email_config.get("credentials_file", "")
            if cred_file:
                cred_path = Path(__file__).resolve().parent.parent / cred_file
                with open(cred_path, 'r') as f:
                    creds = json.load(f)
            else:
                logger.warning("[邮件] 未配置凭证文件")
                return

            msg = MIMEMultipart()
            msg["From"] = email_config.get("from", creds.get("username", ""))
            msg["To"] = ", ".join(email_config.get("to", []))
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain", "utf-8"))

            with smtplib.SMTP(email_config.get("smtp_host", "smtp.gmail.com"), email_config.get("smtp_port", 587)) as server:
                server.starttls()
                server.login(creds.get("username"), creds.get("password"))
                server.send_message(msg)
            logger.info(f"[邮件] 发送成功: {subject}")
        except Exception as e:
            logger.warning(f"[邮件] 发送失败: {e}")

    def _send_line(self, message: str):
        """LINE Notify 推送"""
        line_config = self.config.get("line", {})
        token = line_config.get("token", "")
        if not token:
            # 尝试从凭证文件加载
            cred_file = line_config.get("credentials_file", "")
            if cred_file:
                try:
                    cred_path = Path(__file__).resolve().parent.parent / cred_file
                    with open(cred_path, 'r') as f:
                        creds = json.load(f)
                    token = creds.get("token", "")
                except Exception:
                    pass
        if not token:
            logger.warning("[LINE] 未配置 token")
            return
        try:
            url = "https://notify-api.line.me/api/notify"
            data = urlencode({"message": message}).encode("utf-8")
            req = Request(url, data=data, headers={"Authorization": f"Bearer {token}"})
            urlopen(req)
            logger.info(f"[LINE] 推送成功")
        except Exception as e:
            logger.warning(f"[LINE] 推送失败: {e}")
