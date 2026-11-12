"""扫描 Git 跟踪的文本文件，防止密钥、令牌、私钥进入仓库。

只输出「文件名 + 行号 + 命中规则名」，绝不打印匹配到的原文，
避免把敏感值写进日志。CI 与本地自检共用同一脚本。

用法： python scripts/ci/secret_scan.py [root]
退出码： 0 = 未发现；1 = 发现疑似凭据；2 = 无法读取 Git 文件列表。
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

# 规则名 -> 正则。仅检测高置信度的凭据形态，避免把示例变量误报。
PATTERNS: dict[str, re.Pattern[str]] = {
    "private_key_header": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
    "github_pat": re.compile(r"gh[pousr]_[A-Za-z0-9]{36,}"),
    "github_fine_grained_pat": re.compile(r"github_pat_[A-Za-z0-9_]{40,}"),
    "aws_access_key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "slack_token": re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b"),
    "generic_api_key_assignment": re.compile(
        r"(?i)\b(?:api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*"
        r"['\"][A-Za-z0-9_\-]{24,}['\"]"
    ),
}

SKIP_DIRS = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    "dist",
    "__pycache__",
    ".playwright-cli",
    ".codebuddy",
    "vendor",
    "screenshots",
}

SKIP_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf",
    ".woff", ".woff2", ".ttf", ".eot", ".mp3", ".wav", ".zip",
    ".gz", ".argosmodel", ".onnx", ".pth", ".pyc", ".lock",
}

# 仅对「通用赋值」这类易误报的规则做排除；高置信度规则（私钥头、PAT 等）
# 永不跳过，避免同一行里既有变量引用又藏真实凭据时漏报。
SAFE_REFERENCE = re.compile(r"(?i)secrets\.|\$\{\{|<[A-Z_]+>|占位|placeholder|示例|XXX|your[_-]")
LOW_CONFIDENCE_RULES = {"generic_api_key_assignment"}


def tracked_files(root: Path) -> list[Path]:
    result = subprocess.run(
        ["git", "-c", "core.quotepath=false", "ls-files", "-z"],
        cwd=root,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.decode("utf-8", "replace").strip())
    paths = []
    for raw in result.stdout.split(b"\0"):
        if not raw:
            continue
        # git ls-files -z 输出为原始字节（Windows 上通常是 UTF-8）
        text = raw.decode("utf-8", "replace")
        path = root / text
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix.lower() in SKIP_SUFFIXES:
            continue
        if path.is_file():
            paths.append(path)
    return paths


def main() -> int:
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
    try:
        files = tracked_files(root)
    except RuntimeError as exc:
        print(f"[secret-scan] ERROR: {exc}")
        return 2

    findings: list[str] = []
    for path in files:
        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for line_no, line in enumerate(content.splitlines(), start=1):
            for name, pattern in PATTERNS.items():
                if name in LOW_CONFIDENCE_RULES and SAFE_REFERENCE.search(line):
                    continue
                if pattern.search(line):
                    rel = path.relative_to(root)
                    findings.append(f"{rel}:{line_no} [{name}]")

    if findings:
        print(f"[secret-scan] FAIL: {len(findings)} potential credential(s)")
        for item in findings:
            print(f"  {item}")
        return 1
    print(f"[secret-scan] PASS: {len(files)} files scanned, no credentials found")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
