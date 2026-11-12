# vendor/ — 第三方开源仓库登记

本目录存放为「中文输入 → 韩语翻译 + 发音」平台克隆的 GitHub 仓库快照。
克隆方式：`git clone --depth 1`（浅克隆，仅取最新提交），克隆日期 2026-11-12。

> **集成原则**：本工程**不把任何第三方源码拷贝进自研代码**。Python 侧一律通过 `pip install`
> 作为独立依赖调用；前端谚文/音变/罗马化逻辑参照公开语言学算法自行实现。
> 原因见下方「许可证核验结论」。

## 仓库清单

| 仓库 | 上游 URL | 版本 | 许可证（已核验） | 在本平台的用途 | 实际集成方式 |
| --- | --- | --- | --- | --- | --- |
| `argos-translate/` | https://github.com/argosopentech/argos-translate | 1.11.1 | **MIT**（`LICENSE` 第 1 行 `MIT License`，`setup.py:40` MIT 分类器） | 离线中译韩引擎；`zh→en` + `en→ko` 自动 pivot | `pip install argostranslate`，在 `server/app/providers/argos_provider.py` 中 import 调用；源码仅作 API 与 pivot 逻辑参考 |
| `edge-tts/` | https://github.com/rany2/edge-tts | 7.3.1 | **LGPL-3.0-only**（`LICENSE:1-2` 明确「除 `srt_composer.py` 为 MIT 外，其余文件均为 LGPLv3」；`setup.cfg:14` LGPLv3 分类器）。`gpl-3.0.txt` 只是 LGPL 所引用的 GPLv3 全文，**不代表本项目采用 GPL-3.0** | 韩语神经语音合成，语速可调 | `pip install edge-tts` 作为独立依赖，经 `Communicate(text, voice, rate=...)` 调用；不拷贝源码 |
| `Korean-Pronunciation-Helper/` | https://github.com/frankthinker/Korean-Pronunciation-Helper | 0.1.0 (`private: true`) | **无 LICENSE 文件**、package.json 无 `license` 字段 → 法律上「保留所有权利」 | 中文向韩语学习产品的**交互与算法思路参考**（音变规则、罗马字、TTS 面板） | **不拷贝任何源码**。`web/src/lib/hangul/` 为参照公开谚文 Unicode 分解算法与标准发音规则自行实现 |

### 核验依据（关键文件）

- `argos-translate/LICENSE` — MIT 全文；`argos-translate/setup.py:40` — MIT 分类器。
- `edge-tts/LICENSE:1-2` — `The MIT license is used for 'src/edge_tts/srt_composer.py' only. All remaining files are licensed under the LGPLv3.`
- `edge-tts/src/edge_tts/srt_composer.py:12` — 该唯一 MIT 文件的版权头。
- `Korean-Pronunciation-Helper/` — 全库检索 `*LICEN*` / `COPYING*` 结果为 0；`package.json` 全文 24 行无 `license` 字段。

## 许可证核验结论与处置

1. **Korean-Pronunciation-Helper 无许可证 → 禁止代码复用。**
   其 `src/lib/` 下 5 个文件（`hangul.js`、`rules.js`、`lexicon.js`、
   `tensificationLexicon.js`、`romanizer.js`）技术上完全自包含（零第三方依赖、纯 Node 可跑），
   但直接拷贝仍构成复制受版权保护的代码；且 `README.md:46` 声明音变规则整理自知乎专栏
   《韩语发音规则全解》，规则表述可能另有来源。
   **处置**：只参考其「功能形态」（罗马字标签页、音变 chip、语速滑杆），
   算法按公开的谚文音节分解（Unicode `SBase = 0xAC00`）与韩语标准发音规则独立重写，
   并在 `docs/REPO_SELECTION.md` 记录该决策。如需直接复用，须先向作者取得书面授权。

2. **edge-tts 为 LGPL-3.0 → 保持进程/依赖边界。**
   把 LGPL 源码并入自研服务并对外分发，会触发源码提供与修改声明义务。
   **处置**：以 pip 独立依赖方式调用（保留可替换性），并在 `README.md` 与页面底部标注
   `edge-tts` 及其 LGPL-3.0 许可；不 vendor 其源码到 `server/app/`。

3. **Argos 本体 MIT，但模型包许可独立。**
   `.argosmodel`（来自 `argospm-index`）各有自己的模型许可/署名要求，
   部署离线包时须逐个核验；`ctranslate2` / `spacy` / `sentencepiece` 亦各有条款。

4. **Korean-Pronunciation-Helper 把 `node_modules/` 与 `dist/` 提交进了 git**
   （`.git/index` 约 845 KB 且含 `node_modules` 路径，无 `.gitignore`），
   约 7000 个文件带来体积与供应链风险。**处置**：仅作只读参考，
   不执行其构建脚本、不引入其依赖树，其 `node_modules/` 已在根 `.gitignore` 中忽略。

## 可复用能力清单（供开发参考，非源码拷贝）

| 仓库 | 关键文件 | 可复用能力 | 集成难度 |
| --- | --- | --- | --- |
| argos-translate | `argostranslate/translate.py` | `translate(q, from_code, to_code)`、`get_translation_from_codes()`、`get_installed_languages()`；`get_installed_languages()` 内自动构建 `CompositeTranslation` 实现 pivot | 低（pip 依赖）／中（语言包离线分发、ctranslate2 二进制） |
| argos-translate | `argostranslate/package.py` | `install_from_path(Path)` 离线安装 `.argosmodel`，装完需 `get_installed_languages.cache_clear()` | 低 |
| edge-tts | `src/edge_tts/communicate.py` | `Communicate(text, voice, rate, volume, pitch)`、`stream()`、`save()` | 低（pip 依赖） |
| edge-tts | `src/edge_tts/data_classes.py` | `rate` 必须为 `^[+-]\d+%$`（如 `"+0%"` / `"-20%"`），需带显式符号 | 低 |
| edge-tts | `src/edge_tts/voices.py` | `list_voices()` 运行时从微软端点拉取，仓库内**没有**硬编码语音表 | 低 |
| Korean-Pronunciation-Helper | `src/lib/romanizer.js` | `romanizeSentence()` 的规则管线形态（连音／紧音化／鼻音化／ㄴ添加等） | 仅思路参考，**不拷贝** |
| Korean-Pronunciation-Helper | `src/components/TtsPanel.jsx`、`server/edgeTtsMiddleware.js` | 语音选择、语速滑杆、`POST /api/tts` 代理的交互形态 | 仅思路参考，**不拷贝** |

## 关键事实记录

- Argos 中文代码 `zh`、韩语代码 `ko`；**无 `zh→ko` 直连包时自动经英语中转**，
  由 `translate.py:624-642` 的 pivot 循环合成两跳翻译，质量有损失。
- Argos 依赖（`requirements.txt`）：`ctranslate2>=4.0,<5`、`sentencepiece`、`spacy`、
  `packaging`、`sacremoses`、`minisbd`；**无 torch**，但二进制依赖较重。
  `setup.py:24` 声明 `>=3.5`，实际源码用了 `from __future__ import annotations`（≥3.7），
  建议按 **Python 3.10 ~ 3.11** 部署（Docker 镜像已固定 3.11）。
- edge-tts 韩语语音名 `ko-KR-SunHiNeural` / `ko-KR-InJoonNeural` 只是透传给服务端的字符串，
  仓库内无定义；其端点 `speech.platform.bing.com` 与 `TrustedClientToken` 写在
  `src/edge_tts/constants.py`，属非公开接口，随时可能因 Token / Chromium 版本变更而失效。
- `references/` 记录未整体引入、仅参考设计要点的其他仓库，见该目录下 README。
