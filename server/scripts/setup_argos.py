"""安装 Argos 离线翻译语言包（zh→en + en→ko，自动 pivot 出 zh→ko）。

用法：
    python server/scripts/setup_argos.py            # 在线下载并安装包
    python server/scripts/setup_argos.py --check   # 只检查已装包与翻译路径

说明：
- 这一步需要联网访问 argospm-index 与模型下载地址；装完后平台即可完全离线翻译。
- 模型包许可独立于 MIT 的 Argos 本体，部署前请核验其署名要求（见 vendor/README.md）。
- 若服务器处于内网，可在联网机器预装后把 ARGOS_PACKAGES_DIR 指向的目录整体拷贝过去。
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server"))

REQUIRED_PAIRS = [("zh", "en"), ("en", "ko")]


def main() -> int:
    check_only = "--check" in sys.argv
    try:
        import argostranslate.package as pkg
        import argostranslate.translate as at
    except ImportError:
        print("[X] 未安装 argostranslate")
        print("    pip install -r server/requirements-optional.txt")
        return 1

    print("[1/3] 读取已安装语言包…")
    try:
        installed = pkg.get_installed_packages()
    except Exception as exc:  # noqa: BLE001
        print(f"[!] 读取失败：{exc}")
        installed = []
    have = {(p.from_code, p.to_code) for p in installed}
    for pair in REQUIRED_PAIRS:
        print(f"    {pair[0]}→{pair[1]}: {'已安装' if pair in have else '缺失'}")

    if check_only:
        at.get_installed_languages.cache_clear()
        path = at.get_translation_from_codes("zh", "ko")
        print("[2/3] zh→ko 路径：", "可用" if path is not None else "不可用")
        if path is not None:
            print("    类型：", type(path).__name__, "（CompositeTranslation 表示经英语中转）")
            print("[3/3] 试译：", at.translate("你好，很高兴认识你。", "zh", "ko"))
            return 0
        return 1

    print("[2/3] 更新模型索引（联网）…")
    try:
        pkg.update_package_index()
        available = pkg.get_available_packages()
    except Exception as exc:  # noqa: BLE001
        print(f"[X] 索引更新失败：{exc}")
        print("    可手动下载 .argosmodel 后用 --install <路径> 离线安装")
        return 1

    for from_code, to_code in REQUIRED_PAIRS:
        if (from_code, to_code) in have:
            continue
        match = next(
            (
                p
                for p in available
                if p.from_code == from_code and p.to_code == to_code
            ),
            None,
        )
        if match is None:
            print(f"[X] 索引中找不到 {from_code}→{to_code} 语言包")
            return 1
        print(f"    下载并安装 {from_code}→{to_code} …")
        try:
            pkg.install_from_path(match.download())
        except Exception as exc:  # noqa: BLE001
            print(f"[X] 安装失败：{exc}")
            return 1

    print("[3/3] 刷新语言图并试译…")
    at.get_installed_languages.cache_clear()
    path = at.get_translation_from_codes("zh", "ko")
    if path is None:
        print("[X] 语言包已装但 zh→ko 仍未连通")
        return 1
    print("    路径类型：", type(path).__name__)
    print("    试译：", at.translate("你好，很高兴认识你。", "zh", "ko"))
    print("[OK] 离线翻译就绪。重启后端服务以生效。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
