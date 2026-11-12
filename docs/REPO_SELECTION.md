# 开源仓库选型与风险说明

> 面向「中文输入 → 韩语翻译 + 发音（语速可调）」网页平台。约束：**轻量、零付费、可部署到服务器供访问**。
> 调研日期 2026-11-12；三个核心仓库已浅克隆到 `vendor/`，许可证经源码核验（见 `vendor/README.md`）。

## 一、结论速览

| 层 | 主推 | 备选 | 兜底 / 降级 |
| --- | --- | --- | --- |
| 中译韩 | **Argos Translate 1.11.1（MIT，离线 CPU）**，装 `zh→en` + `en→ko` 自动 pivot | LibreTranslate（AGPL，HTTP 对接）、在线免费接口 | provider 链自动降级；失败时前端给出明确提示 |
| 韩语发音 | **edge-tts 7.3.1（LGPL-3.0，无本地模型）**，`ko-KR-SunHiNeural` / `InJoonNeural`，`rate` 可调 | MeloTTS（MIT，完全离线，默认关闭） | **浏览器 Web Speech API**（零依赖，`ko-KR` + `rate`） |
| 前端 | React + TS + Vite + Tailwind，静态产物由后端同源托管 | — | — |
| 学习性展示 | **自研谚文分解 / 罗马字 / 音变提示**（参照公开算法） | — | — |

**一句话取舍**：用「MIT 离线翻译 + LGPL 在线神经语音 + 自建薄 API」换取零费用与许可证干净，
代价是中译韩需经英语中转、质量不如 Papago/DeepL，且发音依赖境外端点，故必须保留浏览器语音兜底。

## 二、逐仓库评估

### 2.1 中译韩文本翻译

| 仓库 / 项目 | 能力范围 | 适用场景 | 依赖 | 集成难度 | 维护活跃度 | 许可证 |
| --- | --- | --- | --- | --- | --- | --- |
| **argosopentech/argos-translate** | Python 离线 NMT；`translate(q,"zh","ko")`；无直连包时自动经英语 pivot 合成两跳翻译 | 内网/离线、隐私敏感、零预算 | `ctranslate2 4.x`、`spacy`、`sentencepiece`、`sacremoses`、`minisbd`；无 torch，但二进制依赖数百 MB | **中**：API 简单，难点是语言包下载/离线分发、`lru_cache` 清理、Python 3.11 兼容 | 活跃（1.11.1，持续发布） | **MIT** |
| **LibreTranslate/LibreTranslate** | 基于 Argos 的 Flask REST API + 自带 Web UI，`POST /translate` | 想直接拿一套 HTTP 翻译服务 | Python + Flask + Argos 模型 | **低**（HTTP 一行调用） | **高**：约 17.3k stars、100+ 贡献者、v1.9.6（2026）仍有提交 | **AGPL-3.0** ⚠ |
| **facebook/nllb-200-distilled-600M** | 200 语言，`zho_Hans → kor_Hang` **可直译**，规避中转 | 追求译文质量、有 GPU/内存 | transformers + torch，约 2.4 GB 权重 | 高 | 模型发布后基本静态 | **CC-BY-NC-4.0 禁商用** ⚠ |
| **Helsinki-NLP/Opus-MT** | Marian-NMT，1000+ 预训练语言对 | 自训练/科研 | Marian / ctranslate2 | 高（需自行选模型） | 低活跃 | CC-BY 4.0 |
| **在线免费接口**（MyMemory / Google 免费端点） | 免部署、译文质量较好、中韩直译 | 快速验证、离线包未就绪时兜底 | 仅 HTTP；需外网 | **低** | 不受控、随时可能限流或封禁 | 服务条款灰色 ⚠ |
| **Papago / DeepL / LLM API** | 韩语质量最佳，敬语与语体处理更好 | 有预算的产品 | 密钥 + 计费 | 低 | 官方维护 | 商业条款 |

### 2.2 韩语发音与语速调节

| 项目 | 能力范围 | 适用场景 | 依赖 | 集成难度 | 维护活跃度 | 许可证 |
| --- | --- | --- | --- | --- | --- | --- |
| **rany2/edge-tts** | 微软 Edge 在线神经语音；韩语 `ko-KR-SunHiNeural`(女) / `InJoonNeural`(男)；`rate/volume/pitch` 可调（格式 `"+0%"` / `"-20%"`）；可出 MP3 与词级字幕 | 零本地模型、音质好、要语速调节 | `aiohttp` + 境外 `speech.platform.bing.com` 可达 | **低**（`Communicate(...).save()`） | **高**：约 12.5k stars、v7.3.1（2026-10），但约 97% 提交集中于单一维护者 | **LGPL-3.0-only** ⚠（核验修正：非 MIT / 非 GPL-3.0） |
| **Web Speech API** | 浏览器原生 `speechSynthesis`；`lang='ko-KR'`、`rate` 0.1–10（常用 0.5–1.5）、`pitch`/`volume` | 零后端兜底、离线、隐私 | 客户端 OS 需装韩语语音 | **极低** | W3C 标准，Baseline Widely available | — |
| **myshell-ai/MeloTTS** | 离线韩语 TTS，`tts_to_file(..., speed=0.5~2.0)`，CPU 可实时 | 完全离线、不许出网 | `unidic`、`nltk`、MeCab 类字典、数百 MB 权重 | 中高 | 约 7.4k stars，近期活跃度需实测 | **MIT** |
| **rhasspy/piper** | 轻量离线 TTS | — | — | — | **2025-10-06 已归档只读** | — |
| **coqui-ai/TTS** | xTTS 多语言含韩语 | — | PyTorch | — | 公司 2023/2024 关闭、原仓库停更；社区 fork `idiap/coqui-ai-TTS` 有非商用限制 | 混合 |

**语速语义差异（重要）**：Web Speech `rate` 是**播放速率**（可能变调），edge-tts `rate` 与
MeloTTS `speed` 是**合成参数**（更自然）。本平台在前端统一抽象为 `0.5x ~ 1.5x` 倍速滑块，
由 provider 适配层分别映射到 `%` 百分比与 `rate` 数值，并对齐实际听感。

### 2.3 前端集成与中文向韩语学习项目

| 仓库 | 能力范围 | 适用场景 | 集成难度 | 维护活跃度 | 许可证 |
| --- | --- | --- | --- | --- | --- |
| **frankthinker/Korean-Pronunciation-Helper** | React + Vite，简体中文界面；全套音变规则（连音/紧音化/鼻音化/ㄴ添加）、真实口语拉丁转写、彩色 chip 与悬浮讲解；`POST /api/tts` 代理 + Edge Neural 语音 + 语速 `-80%~+60%` | 与本平台目标**最契合**的产品形态参照 | 低（技术上 `src/lib/` 5 个纯 JS 文件零依赖自包含） | **低**：个人项目、约 1 star、作者近一年 7 次贡献 | **无 LICENSE** ⚠ |
| `summerscar/korean-studio` | 系统化课程、TOPIK、韩语键盘、发音评测、多语言界面 | 完整学习平台 | 高（Next.js 15 + Keystone 6 + PostgreSQL） | 中 | 需核验 |
| `NB-XX/korean-analyzer` | 面向中文学习者，Gemini 做句法/词性/读音/释义 | 句子深度解析 | 中 | 中 | 需核验（依赖 LLM 密钥） |
| `Mu-L/illa-helper`、`2023Anita/magic-language-genie` | 浏览器扩展，20+ 语言、双 TTS、音标、悬浮框 | 沉浸式阅读 | 中 | 中 | 需核验 |
| `maxwux/smile` | 零依赖静态 HTML 单词卡、韩语四十音 | 极轻量学习工具 | 极低 | 低 | 需核验 |

## 三、组合成平台的可行方案

### 主推（本工程采用）

```
浏览器（React + Vite 静态产物，同源托管）
   │  中文输入 → POST /api/translate → 韩语译文
   │  播放   → POST /api/tts（语音 + 0.5x~1.5x 倍速）→ MP3
   │  失败时 → 前端 Web Speech API 兜底发音
   ▼
FastAPI 轻量服务（单进程）
   ├─ 缓存层：译文按 text+src+dst、音频按 text+voice+rate 做 LRU
   ├─ TranslatorProvider 工厂：argos（默认）→ libretranslate / 在线免费（降级）
   └─ TtsProvider 工厂：edge-tts（默认）→ 前端 Web Speech（降级）；MeloTTS 默认关闭
```

- **为什么不用 LibreTranslate 内嵌**：平台要放服务器对外访问，AGPL-3.0 网络服务条款有源码公开义务。
  自建薄 API 代码量很小，换来 MIT（Argos）+ 独立 LGPL 依赖（edge-tts）的清晰许可边界。
- **为什么不用 NLLB / MeloTTS 作默认**：2 GB 级权重与字典依赖违背「轻量」，
  且 NLLB 是 CC-BY-NC 禁商用。二者保留为可选 provider（环境变量开关）。
- **为什么必须双层发音降级**：edge-tts 依赖非公开微软端点，Token / Chromium 版本变更即失效；
  浏览器语音零依赖，保证离线或端点不通时仍能发音（代价是音色依赖客户端系统）。

### 备选与演进路径

1. **质量优先**：把翻译 provider 切到在线免费接口或接入 Papago/LLM（需密钥），
   保留 Argos 作离线兜底；发音不变。
2. **完全离线**：Argos（`zh→en` + `en→ko` 离线包）+ MeloTTS（韩语权重），
   彻底不出网，代价是部署体积与冷启动。
3. **教学增强**：在译文卡片加「罗马字 / 音变 / 语体」标签页与分句跟读，
   参照 `korean-studio` 的课程结构扩展单词本（当前为单页工作台）。

## 四、风险点

| # | 风险 | 影响 | 缓解措施 |
| --- | --- | --- | --- |
| 1 | **中→韩无直连开源模型**，Argos 走 `zh→en→ko` 两跳 | 敬语/语体（해요체/합쇼체）、助词、汉字词易错，译文质量明显低于 Papago | 响应中返回 `viaPivot` 标识；UI 提示「经英语中转，供学习参考」；可切在线质量档；提供语体提示 |
| 2 | **许可证合规**（放服务器供访问，权重高） | LibreTranslate AGPL 网络服务源码公开义务；NLLB CC-BY-NC 禁商用；edge-tts LGPL 若并入源码需履行源码提供义务；`Korean-Pronunciation-Helper` 无 LICENSE 默认保留所有权利 | 只用 MIT 的 Argos + 自建薄 API；edge-tts 作**独立 pip 依赖**并在页面标注；**不拷贝无许可证仓库的任何源码**，音变/罗马化按公开算法自研；模型包许可单独核验 |
| 3 | **境外端点与网络** | `speech.platform.bing.com` 在国内服务器可能不通；在线翻译接口不稳定 | 发音双层降级；译文与音频缓存；超时/重试与健康检查；可选完全离线档 |
| 4 | **语速语义不一致** | 同一 1.0x 在不同发音源听感不同 | 统一 `0.5~1.5` 倍速契约 + provider 映射；滑块拖动先改 `playbackRate` 预览，松手/显式触发才重新合成（防抖） |
| 5 | **维护断层** | 个人项目（约 1 star）、已归档 Piper、停更 Coqui、非官方 Papago 封装都不宜硬依赖 | 可插拔 provider 抽象；第三方仅作依赖或思路参考，不 fork 整体框架；edge-tts 版本锁定 |
| 6 | **韩语学习特性** | 字面拼写 ≠ 实际读音（连音/紧音化/鼻音化）；长文本朗读易截断 | 展示罗马字与音变 chip；按句切分朗读；译文标注语体 |
| 7 | **部署与兼容** | Argos 的 `ctranslate2` 二进制对 Python 3.13 支持不确定；Windows 本地易装失败 | Docker 固定 Python 3.11；本地提供 venv 脚本并给出排障；语言包预装脚本与启动自检 |
| 8 | **供应链** | `Korean-Pronunciation-Helper` 把 `node_modules/` 与 `dist/` 提交进 git（约 7000 文件） | 只读参考、不执行其构建、不引入其依赖树；根 `.gitignore` 忽略 |

## 五、本工程的实际调整（相对初始设想）

1. 原计划「抽取 `Korean-Pronunciation-Helper` 的 `src/lib/` 并保留其 LICENSE」→
   **核验发现该仓库根本没有 LICENSE**，改为「只参考功能形态，`web/src/lib/hangul/` 完全自研」。
2. 原资料称 edge-tts 为 MIT 或 GPL-3.0 → **核验确认为 LGPL-3.0-only**
   （`srt_composer.py` 单独 MIT），据此采用 pip 独立依赖而非源码内嵌。
3. 原计划只做 Argos 单引擎 → 增加**翻译 provider 降级链**，
   保证语言包未下载时平台仍能出译文，满足「立即能跑」。
