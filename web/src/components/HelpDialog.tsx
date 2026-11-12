import { X, Keyboard, Layers, ShieldCheck, CircleHelp } from "lucide-react";
import { Button } from "./ui/Button";

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/25 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-strong w-full max-w-lg animate-fade-up rounded-3xl p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="使用说明"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <CircleHelp className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink-900">使用说明</h2>
              <p className="text-[11px] text-ink-400">中文 → 韩语翻译与发音学习</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭" type="button">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 text-xs leading-6 text-ink-600">
          <section className="flex gap-3">
            <Keyboard className="mt-1 h-4 w-4 shrink-0 text-brand-500" />
            <div>
              <p className="font-semibold text-ink-900">基本操作</p>
              <p>左侧输入中文，点击「翻译成韩语」或按 Ctrl / ⌘ + Enter。右侧给出韩文、罗马字与音变提示。</p>
            </div>
          </section>
          <section className="flex gap-3">
            <Layers className="mt-1 h-4 w-4 shrink-0 text-brand-500" />
            <div>
              <p className="font-semibold text-ink-900">发音与语速</p>
              <p>
                拖动 0.5×~1.5× 滑块会立即用播放速率预览；松开后自动按新语速重新合成，音色更自然。
                点击「重新合成」可强制刷新。服务端发音不可用时自动切换浏览器语音。
              </p>
            </div>
          </section>
          <section className="flex gap-3">
            <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-brand-500" />
            <div>
              <p className="font-semibold text-ink-900">关于译文质量</p>
              <p>
                默认离线引擎在缺少中韩直连模型时会经英语中转，敬语与语体可能有偏差；
                页面会标注「经英语中转」。学习使用时请结合语境核对，重要场合建议人工确认。
              </p>
            </div>
          </section>
        </div>

        <div className="mt-6 rounded-xl bg-brand-50/80 p-3 text-[11px] leading-5 text-brand-700">
          本平台由 MIT 的 Argos Translate、LGPL-3.0 的 edge-tts 与浏览器 Web Speech API 组合而成，
          零付费、可自托管；各仓库能力、许可证与风险详见工程内 docs/REPO_SELECTION.md。
        </div>
      </div>
    </div>
  );
}
