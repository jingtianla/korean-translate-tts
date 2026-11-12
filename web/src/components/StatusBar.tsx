import { Activity, Heart, ExternalLink } from "lucide-react";
import type { HealthResult } from "../types";

interface StatusBarProps {
  health: HealthResult | null;
  message: string;
  degraded: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  ok: "bg-ok",
  degraded: "bg-warn",
  error: "bg-danger",
};

export function StatusBar({ health, message, degraded }: StatusBarProps) {
  const status = health?.status ?? "degraded";
  const active = health?.translateChain.find((p) => p.available)?.name ?? "—";
  const ttsReady = health?.tts.available ?? false;

  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-white/60 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex h-11 max-w-[1400px] items-center justify-between gap-3 px-4 text-[11px] sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${STATUS_COLOR[status]} opacity-60 ${status !== "ok" ? "animate-ping" : ""}`}
            />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${STATUS_COLOR[status]}`} />
          </span>
          <Activity className="h-3.5 w-3.5 shrink-0 text-brand-500" />
          <span className="hidden font-semibold text-ink-900 sm:inline">系统状态</span>
          <span className="truncate text-ink-600">
            {message || (health ? `翻译 ${active} · 发音 ${ttsReady ? "服务端就绪" : "浏览器兜底"}` : "正在检测服务…")}
          </span>
        </div>

        <div className="hidden shrink-0 items-center gap-3 text-ink-400 md:flex">
          {degraded && (
            <span className="rounded-md bg-warn/10 px-1.5 py-0.5 font-medium text-[#8A6212]">
              已降级
            </span>
          )}
          <span>v{health?.version ?? "1.0.0"}</span>
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3 w-3 text-danger/70" />
            开源致谢
          </span>
          <a
            href="/repo-docs/REPO_SELECTION.md"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 transition-colors hover:text-brand-600"
          >
            选型说明 <ExternalLink className="h-2.5 w-2.5" />
          </a>
          <a
            href="https://github.com/argosopentech/argos-translate"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 transition-colors hover:text-brand-600"
          >
            Argos · MIT <ExternalLink className="h-2.5 w-2.5" />
          </a>
          <a
            href="https://github.com/rany2/edge-tts"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 transition-colors hover:text-brand-600"
          >
            edge-tts · LGPL-3.0 <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
