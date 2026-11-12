import { Play, Square, RotateCcw, Download, Gauge, Volume2, Repeat2, MonitorSpeaker } from "lucide-react";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import { Slider } from "./ui/Slider";
import { formatRate, RATE_MIN, RATE_MAX } from "../lib/speech/types";
import type { PlaybackState, SpeechSource, VoiceItem } from "../types";

interface SpeechControlsProps {
  disabled: boolean;
  state: PlaybackState;
  rate: number;
  onRateChange: (rate: number) => void;
  onRateCommit: () => void;
  voice: string;
  onVoiceChange: (voice: string) => void;
  voices: VoiceItem[];
  source: SpeechSource;
  effectiveSource: SpeechSource;
  onPlay: () => void;
  onStop: () => void;
  onReplay: () => void;
  onDownload: () => void;
  canDownload: boolean;
}

export function SpeechControls({
  disabled,
  state,
  rate,
  onRateChange,
  onRateCommit,
  voice,
  onVoiceChange,
  voices,
  source,
  effectiveSource,
  onPlay,
  onStop,
  onReplay,
  onDownload,
  canDownload,
}: SpeechControlsProps) {
  const playing = state === "playing";
  const loading = state === "loading";

  return (
    <div className="rounded-2xl border border-white/80 bg-white/55 p-3.5 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative shrink-0">
          {playing && (
            <span className="absolute inset-0 rounded-full bg-brand-400/60 animate-pulse-ring" />
          )}
          <button
            type="button"
            onClick={playing ? onStop : onPlay}
            disabled={disabled || loading}
            aria-label={playing ? "停止朗读" : "朗读译文"}
            title={playing ? "停止朗读" : "朗读译文"}
            className="relative flex h-12 w-12 items-center justify-center rounded-full gradient-brand text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:transform-none focus-visible:focus-ring"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : playing ? (
              <Square className="h-4 w-4 fill-current" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            )}
          </button>
        </div>

        <div className="min-w-[150px] flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-600">
              <Gauge className="h-3.5 w-3.5 text-brand-500" />
              语速
            </span>
            <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-brand-700">
              {formatRate(rate)}
            </span>
          </div>
          <Slider
            aria-label="语速"
            value={rate}
            min={RATE_MIN}
            max={RATE_MAX}
            step={0.05}
            disabled={disabled}
            onChange={(event) => onRateChange(Number(event.target.value))}
            onPointerUp={onRateCommit}
            onKeyUp={onRateCommit}
          />
          <div className="mt-1 flex justify-between text-[10px] text-ink-400">
            <span>0.5× 慢速跟读</span>
            <span>1.0× 常速</span>
            <span>1.5× 快速</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/70 pt-3">
        <Volume2 className="h-3.5 w-3.5 shrink-0 text-brand-500" />
        <Select
          aria-label="韩语语音"
          value={voice}
          onChange={(event) => onVoiceChange(event.target.value)}
          disabled={disabled || voices.length === 0}
          className="min-w-[160px] flex-1 sm:max-w-[210px]"
          options={voices.map((item) => ({ value: item.id, label: item.label }))}
        />

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onReplay} disabled={disabled || loading} type="button" title="按当前语速重新合成并播放">
            <Repeat2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">重新合成</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onStop} disabled={!playing && !loading} type="button" title="停止">
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">停止</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload} disabled={!canDownload} type="button" title="下载音频">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">下载</span>
          </Button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-ink-400">
        {effectiveSource === "browser" ? (
          <MonitorSpeaker className="h-3 w-3" />
        ) : (
          <Volume2 className="h-3 w-3" />
        )}
        <span>
          {effectiveSource === "browser"
            ? "浏览器 Web Speech 发音（零依赖兜底，音色取决于系统语音包）"
            : "服务端 Edge 神经语音（语速为合成参数，音高更自然）"}
          {source !== effectiveSource && " · 已自动降级"}
        </span>
      </div>
    </div>
  );
}
