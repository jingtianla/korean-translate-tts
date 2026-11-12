# references/ — 未整体引入的参考仓库

以下仓库**不克隆、不引入代码**，仅记录其在本平台设计中被参考的要点。
它们要么技术栈过重，要么需要付费密钥，要么与「轻量免费、放服务器访问」的约束冲突。

| 仓库 | 上游 URL | 技术栈 | 参考了什么 | 不引入的原因 |
| --- | --- | --- | --- | --- |
| `summerscar/korean-studio` | https://github.com/summerscar/korean-studio | Next.js 15 + Keystone 6 + PostgreSQL + Tailwind + next-intl + MDX | 中文界面术语、系统化学习路径、韩语键盘与发音规则指导的产品形态 | 需数据库与 CMS，对个人学习工具过重 |
| `NB-XX/korean-analyzer` | https://github.com/NB-XX/korean-analyzer | Next.js + Gemini 2.5 Flash | 面向中文学习者的「词性／读音／释义」分栏展示方式 | 依赖 LLM API 密钥，与零密钥约束冲突 |
| `Mu-L/illa-helper` | https://github.com/Mu-L/illa-helper | 浏览器扩展 | 双 TTS、音标显示、悬浮框、深浅色主题等发音交互 | 扩展形态，不适用于独立网页 |
| `2023Anita/magic-language-genie` | https://github.com/2023Anita/magic-language-genie | 浏览器扩展 | 自动语言检测 + AI 词义解释 + 发音的一站式交互 | 同上，且依赖 AI 服务 |
| `maxwux/smile` | https://github.com/maxwux/smile | 零依赖静态 HTML | 单词卡、韩语四十音、分类管理与导入导出的轻量组织方式 | 无翻译能力，仅作「零依赖也能做学习工具」的参照 |
| `NLarchive/language-matrix` | https://github.com/NLarchive/language-matrix | PWA | 中日韩词汇矩阵、音频播放、离线优先缓存 | 词汇矩阵不是本平台主场景 |
| `LibreTranslate/LibreTranslate` | https://github.com/LibreTranslate/LibreTranslate | Python + Flask | `/translate` REST 契约与 Web UI 形态 | **AGPL-3.0**，作为服务器对外服务有源码公开义务；本平台改为可选 provider，用 HTTP 对接而非内嵌 |
| `myshell-ai/MeloTTS` | https://github.com/myshell-ai/MeloTTS | Python + VITS | `tts_to_file(..., speed=)` 的离线韩语合成能力 | MIT 但依赖 `unidic` / `nltk` / MeCab 字典与数百 MB 权重，与轻量冲突；作为默认关闭的可选 provider |
| `facebook/nllb-200-distilled-600M` | https://huggingface.co/facebook/nllb-200-distilled-600M | Transformers + PyTorch | `zho_Hans → kor_Hang` 直译、可避开英语中转 | **CC-BY-NC-4.0 禁商用** + 约 2.4 GB 权重，不纳入默认 |
| `Helsinki-NLP/Opus-MT` | https://github.com/Helsinki-NLP/Opus-MT | Marian-NMT | 1000+ 语言对模型库 | 以英语为中心，zh-ko 直连模型不确定；CC-BY 4.0 |
| `rhasspy/piper` | https://github.com/rhasspy/piper | C++ / ONNX | 曾考虑作离线轻量 TTS | **2025-10-06 已归档只读**，不用于新项目 |
| `coqui-ai/TTS` | https://github.com/coqui-ai/TTS | PyTorch | 曾考虑 xTTS 韩语 | 公司 2023/2024 关闭、原仓库停更；社区 fork `idiap/coqui-ai-TTS` 有非商用限制 |
| `devjiwonchoi/papago-sdk` | https://github.com/devjiwonchoi/papago-sdk | Node.js (MIT) | 韩语质量最佳的翻译服务接入方式 | Papago 需 Naver Client ID/Secret 与注册，非「零配置免费」；仅作可选 provider 思路 |
| `stunstunstun/papago` | https://github.com/stunstunstun/papago | Python | 非官方 Papago 封装 | 38 stars、17 commits、多年停更，明确不采用 |

## 说明

- 本平台的可插拔 provider 设计允许后续把上述任一服务接入，而无需改动 UI：
  翻译侧实现 `TranslatorProvider.translate()`，发音侧实现 `TtsProvider.synthesize()`。
- 「维护活跃度」的完整对比见 `docs/REPO_SELECTION.md`。
