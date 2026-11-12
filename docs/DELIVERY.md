# 交付配置与流程状态

> 本文记录本次交付流水线的**真实配置与真实执行结果**。未配置、未执行的项目明确标注为
> 「待人工」或「受阻」，绝不把「已创建 / 已本地提交」写成「已合并 / 已部署」。
> 本文不包含任何密码、令牌或私钥值，只记录凭据的**安全引用名称**。

## 1. 项目信息

| 字段 | 值 | 来源 |
| --- | --- | --- |
| 项目名称 | 中文译韩文（中→韩 翻译发音台） | 需求给定 |
| 技术栈（必填） | React 18 + TypeScript 5 + Vite 5 + Tailwind CSS 3.4；Python 3.11 + FastAPI + Uvicorn；GitHub Actions；Docker / Docker Compose；GHCR | 由现有工程真实确定 |
| 仓库完整网址 | `https://github.com/jingtianla/korean-translate-tts`（private） | GitHub API `POST /user/repos` → 201 |
| 仓库克隆地址 | `https://github.com/jingtianla/korean-translate-tts.git`（已配置为 `origin`） | API 返回 + `git remote -v` |
| 本地工作目录 | `d:/AI/11.韩语20261111` | 真实路径 |
| 默认分支 | `main`（`git init -b main` 已建立） | 决策 + 真实命令 |
| 本次改动内容与范围 | 仅交付链路配置：CI 工作流、发布镜像工作流、按 Digest 部署/回滚/健康检查脚本、密钥扫描、交付文档；**不改业务代码** | 决策 |
| 验收标准 | 见本文第 3 节 | 决策 |
| CI 工作流名称或入口 | `CI` → `.github/workflows/ci.yml`；`Release image` → `.github/workflows/release.yml` | 本次新建 |
| 镜像仓库完整地址 | `ghcr.io/jingtianla/korean-translate-tts`（工作流内用 `github.repository` 自动解析，不硬编码） | 仓库已创建的真实推导 |
| 镜像名称 | `zh-ko-translate-tts`（GHCR 沿用仓库名） | 决策 |
| 镜像标签规则 | `sha-<完整 Commit SHA>` + `main`；正式候选仅在合并到 `main` 后构建；环境间一律按 `@sha256:<digest>` 引用 | 决策 |
| 测试环境完整网址 | **待人工**：未提供；预检 `http://120.26.33.211:8000/api/health` 返回 502，不能认定为测试环境 | 真实探测 |
| 测试环境部署方式 | `deploy/docker-compose.prod.yml` + `deploy/deploy.sh <image@sha256:...>` | 决策 |
| 测试命令或入口 | `python server/scripts/smoke_test.py`；`npx tsc --noEmit`；`npm run build`；`python -m compileall -q server/app`；`python scripts/ci/secret_scan.py`；`deploy/healthcheck.sh` | 真实可执行 |
| 服务器连接方式 | SSH 别名 `aliyun-korean` → `root@120.26.33.211`，使用已配置的 `IdentityFile`；**认证已通过**：`ssh -o BatchMode=yes aliyun-korean` 返回 `SSH_OK / root / /root / Linux`，退出码 0 | 真实探测 |
| 服务器入口 | `120.26.33.211` | 需求给定 |
| 服务器项目目录 | `/opt/zh-ko-translate-tts`（预检确认**尚不存在**；服务器 Linux / Docker 29.9.3 / Compose v5.7.0 / 8000 端口空闲） | 真实只读预检 |
| 服务器部署方式或编排文件 | `deploy/docker-compose.prod.yml`，由 `deploy/deploy.sh` 按 Digest 拉取部署 | 决策 |
| 健康检查入口与通过条件 | `GET /api/health` 返回 200 且 `status ∈ {ok, degraded}` 且 `version` 非空；`GET /` 返回 200 | 决策 + 真实接口 |
| 回滚方式 | `deploy/rollback.sh` 切回 `.previous_image_ref` 中上一个已验证 Digest 并复跑健康检查；无历史 Digest 时**停止并交人工决策** | 决策 |
| 已配置凭据的安全引用 | **已验证可用**：本机 Git 凭据助手中的 `git:https://github.com`（API 验证 `AUTH_LOGIN=jingtianla`、`RATE_LIMIT=5000`）；SSH 别名 `aliyun-korean` 的 `IdentityFile`；CI 内置 `secrets.GITHUB_TOKEN`。**未配置**：`secrets.DEPLOY_SSH_KEY` 等部署 Secret。所有值均未读取、未输出、未入库 | 真实 API + SSH 验证 |

## 2. 团队工作方式（未指定项由本次决策补齐）

| 字段 | 值 |
| --- | --- |
| 对应平台 | github |
| 编号来源 | **本地 Git 引用**（`git branch -a` / `git tag -l`）。原因：GitHub 平台无法查询（`gh` 缺失、API 不可达、无仓库），按「不得猜测编号」不编造 GitHub Issue 号 |
| 已有编号 | 真实查询结果：无分支、无标签 → 无已有编号 |
| 编号续编规则 | `YYYYMMDD-NNN`，当日无同前缀则从 `001` 起；创建前复查重号与同名 |
| 分支命名规则 | `feat/<YYYYMMDD>-<NNN>-<slug>` |
| PR 目标分支 / 默认分支 | `main` |
| 分支同步策略 | `rebase` 到 `main` 后再推送（禁止 force push） |
| PR 标题规则 | `feat: <改动摘要> (<分支编号>)` |
| 评审人规则 | 仓库管理员 / CODEOWNERS；**不得自我批准** |
| 最少审批人数 | 1 |
| 必需检查名称 | `Backend checks`、`Frontend checks`、`Secret scan` |
| 合并方式 | squash merge（需审核 + 必需检查全绿） |
| 验收人 | 需求提出人（待人工指定） |
| 验收结果入口 | 本文第 3 节逐项结果 + PR 评论 |
| 发布窗口或限制 | 仅 `main` 合并后允许发布；禁止未合并分支镜像作为正式候选 |
| 进度与完成报告方式 | 本文 + 最终完成报告（含真实 SHA / Digest / 流水线结果） |
| 目标流程调整 | 除「编号来源改用本地 Git 引用」外**无调整**；推送确认、合并门禁、先验收后发布三条底线不变 |

## 3. 验收标准与逐项结果

| 编号 | 验收项 | 判定方式 | 结果 |
| --- | --- | --- | --- |
| A1 | 后端语法与导入 | `compileall` + `from app.main import app` | **通过**：退出码 0；`APP_TITLE=中→韩 翻译发音台 API` |
| A2 | 前端类型与构建 | `tsc --noEmit` + `vite build` + `dist/index.html` 存在 | **通过**：退出码 0；构建 1600 模块，`dist/index.html` 存在 |
| A3 | 接口冒烟 | health 200、voices 200、translate / tts 有明确结果 | **通过**：health/voices/translate/tts 均 200；结果见 `server/scripts/smoke_result.json` |
| A4 | 无密钥入库 | `secret_scan.py` 退出码 0 | **通过**：扫描 58 个跟踪文件，未发现凭据 |
| A4b | 工作流与部署脚本语法 | YAML `on` 键解析 + `bash -n` | **通过**：`ci.yml` / `release.yml` 均 `ON_KEY_OK`；三个 sh 脚本 `bash -n` 退出码 0 |
| A5 | CI 必需检查 | push / PR 触发的三项检查全绿 | **受阻**：无远端、无 GitHub 登录 |
| A6 | 审核与合并 | 真实审核者批准 + 必需检查通过 + squash merge | **受阻**：无仓库 / 无 PR |
| A7 | 镜像唯一构建 & Digest 可追溯 | `main` 合并后构建一次；记录 Digest | **受阻**：Docker 未安装、无仓库 |
| A8 | 测试 / 验收 / 生产同一 Digest | 三处引用字符串完全一致 | **受阻**：测试环境与凭据未提供 |
| A9 | 部署健康检查 | `/api/health` 200 + 首页 200 + 版本核对 | **受阻**：SSH 认证失败 |
| A10 | 业务 / 界面人工验收 | 验收人明确「通过」 | **待人工** |

## 4. 人工闸门（必须停下等待）

| 闸门 | 触发条件 | 需要的人工动作 |
| --- | --- | --- |
| G1 推送确认 | **每一次 `git push` 之前** | 明确回复「确认推送 `<分支名>` `<提交哈希>`」 |
| G1 推送确认 | **每一次 `git push` 之前** | 明确回复「确认推送 `<分支名>` `<提交哈希>`」——**当前仍未满足** |
| G2 仓库与登录 | ~~创建远端、gh 登录、权限~~ | **已解除**：仓库已创建、API 认证已验证 |
| G3 必需审核 | PR 需真实审核者批准 | 由审核者在 PR 页面点击批准 |
| G3b 分支保护授权不足 | 私有仓库规则集返回 403 | **受阻**：需 GitHub Pro 或改为 public；改公开会改变代码可见性，须你决策 |
| G4 业务验收 | A10 | 验收人给出明确通过结论 |
| G5 授权不足 | ~~SSH 认证~~ / 部署 Secret | SSH **已解除**；`DEPLOY_SSH_KEY` 等仍待配置，不提供明文值 |
| G6 需求不清 | 测试环境网址、服务器项目目录确认 | 提供真实值 |
| G7 不可逆操作 | 删除数据、强制推送、覆盖他人分支 | 默认不执行，单独说明 |

## 4b. 本轮真实配置结果（2026-11-12）

| 动作 | 命令 / API | 真实结果 |
| --- | --- | --- |
| 查询已有仓库 | `GET /user/repos` | 3 个：`cloud-api2-knowledge-20261026`、`korean-master`、`xiaoxue-zongying-notes` |
| 检查重名 | `GET /repos/jingtianla/korean-translate-tts` | 404 → 无冲突 |
| 创建仓库 | `POST /user/repos` | **201**，`id=1455201362`，private，`default_branch=main`，`auto_init=false` |
| 配置远端 | `git remote add origin ...` | 成功；`git ls-remote --heads origin` 返回空 → **远端仍为空仓库，未推送** |
| Actions 权限 | `GET /actions/permissions` | `enabled=True`、`allowed_actions=all`、`default_workflow_permissions=read` |
| 分支保护规则集 | `POST /rulesets` | **403** `Upgrade to GitHub Pro or make this repository public` |
| 经典分支保护 | `GET /branches/main/protection` | **403** 同上；且空仓库尚无 `main` 引用 |
| 服务器只读预检 | `ssh aliyun-korean` | Linux / Docker 29.9.3 / Compose v5.7.0 / 8000 空闲 / 目标目录不存在 |

> 注意：仓库 `default_workflow_permissions=read`，但 `release.yml` 已显式声明
> `permissions: packages: write`，可覆盖该默认值；真实效果须由 CI 运行验证，不预先宣称成功。

## 5. 待人工操作的页面与按钮（不含任何凭据值）

1. ~~创建仓库 / 登录 / 配置远端~~ —— **本轮已真实完成**，见第 4b 节。
2. **分支保护（G3b，受阻）**：私有仓库免费版不支持规则集。二选一：
   - 升级 GitHub Pro 后由我重新调用 API 配置；或
   - 仓库 → **Settings** → **General** → 最底部 **Danger Zone** → **Change visibility**
     → 选 **Make public**（**注意：代码将公开，属需你确认的变更**），之后由我重新配置规则集。
   配置目标：`main`，1 approval、必需检查 `Backend checks` / `Frontend checks` / `Secret scan`、
   禁止 force push 与删除。
3. **推送确认（G1，当前唯一硬闸门）**：明确回复
   「确认推送 `feat/20261112-001-delivery-pipeline` `<提交哈希>`」。
4. **部署凭据**：仓库 → **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret**，按需创建 `DEPLOY_SSH_KEY` 等；值在网页中填写，**不要发到聊天里**。
5. **测试环境**：提供完整测试环境 URL（当前 `120.26.33.211:8000` 返回 502，端口实际空闲）。
6. **服务器项目目录确认**：`/opt/zh-ko-translate-tts` 为我选定的默认值，请确认或指定其他路径。
7. **验收人**：指定 A10 的验收人，并在 PR 中给出明确通过结论。
