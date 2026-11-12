import { Languages, Headphones, Github, BookOpen, Sparkles } from "lucide-react";
import type { SpeechSource } from "../types";
import { Select } from "./ui/Select";

interface HeaderProps {
  source: SpeechSource;
  onSourceChange: (source: SpeechSource) => void;
  onHelp: () => void;
}

export function Header({ source, onSourceChange, onHelp }: HeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl gradient-brand text-white shadow-glow">
            <Languages className="h-5 w-5" />
            <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-warn" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold tracking-tight text-ink-900 sm:text-base">
              中→韩 <span className="text-gradient">翻译发音台</span>
            </h1>
            <p className="hidden truncate text-[11px] text-ink-400 sm:block">
              中文输入 · 韩语译文 · 真实发音 · 自由调速
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-xl bg-brand-50/80 px-2 py-1 text-[11px] font-medium text-brand-700 md:flex">
            <Headphones className="h-3.5 w-3.5" />
            <span>发音源</span>
          </div>
          <Select
            aria-label="发音源"
            value={source}
            onChange={(event) => onSourceChange(event.target.value as SpeechSource)}
            className="w-[122px] sm:w-[150px]"
            options={[
              { value: "server", label: "服务端神经语音" },
              { value: "browser", label: "浏览器语音" },
            ]}
          />
          <button
            type="button"
            onClick={onHelp}
            aria-label="使用说明"
            title="使用说明"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-100 bg-white/70 text-ink-600 transition-all hover:border-brand-300 hover:text-brand-600 hover:-translate-y-0.5 focus-visible:focus-ring"
          >
            <BookOpen className="h-4 w-4" />
          </button>
          <a
            href="https://github.com/argosopentech/argos-translate"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="开源仓库"
            title="开源仓库"
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-brand-100 bg-white/70 text-ink-600 transition-all hover:border-brand-300 hover:text-brand-600 hover:-translate-y-0.5 sm:flex"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
