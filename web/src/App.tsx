import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "./components/Header";
import { InputPanel } from "./components/InputPanel";
import { ResultPanel } from "./components/ResultPanel";
import { SpeechControls } from "./components/SpeechControls";
import { StatusBar } from "./components/StatusBar";
import { HelpDialog } from "./components/HelpDialog";
import { ApiFailure, fetchHealth, fetchVoices, translateText } from "./lib/api";
import { SpeechController } from "./lib/speech/controller";
import type { SpeechSnapshot } from "./lib/speech/types";
import type {
  HealthResult,
  SpeechSource,
  TranslateResult,
  VoiceItem,
} from "./types";

const DEFAULT_VOICES: VoiceItem[] = [
  { id: "ko-KR-SunHiNeural", label: "선희 · 女声", gender: "female" },
  { id: "ko-KR-InJoonNeural", label: "인준 · 男声", gender: "male" },
];
const MAX_TEXT_LENGTH = 2000;

export default function App() {
  const [text, setText] = useState("你好，很高兴认识你。今天天气真好。");
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rate, setRate] = useState(1.0);
  const [voice, setVoice] = useState(DEFAULT_VOICES[0].id);
  const [voices, setVoices] = useState<VoiceItem[]>(DEFAULT_VOICES);
  const [source, setSource] = useState<SpeechSource>("server");
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [speech, setSpeech] = useState<SpeechSnapshot>({
    state: "idle",
    source: "server",
    message: "",
    downloaded: false,
    degraded: false,
  });

  const controllerRef = useRef<SpeechController | null>(null);
  if (!controllerRef.current) controllerRef.current = new SpeechController();
  const controller = controllerRef.current;

  useEffect(() => {
    const unsubscribe = controller.subscribe(setSpeech);
    return () => {
      unsubscribe();
      controller.dispose();
    };
  }, [controller]);

  useEffect(() => {
    let alive = true;
    fetchHealth()
      .then((data) => alive && setHealth(data))
      .catch(() => alive && setHealth(null));
    fetchVoices()
      .then((data) => alive && data.voices.length && setVoices(data.voices))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const request = useMemo(
    () => ({ text: result?.text || "", voice, rate, source }),
    [result?.text, voice, rate, source],
  );

  const handleTranslate = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    controller.stop();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await translateText(trimmed);
      setResult(data);
    } catch (err) {
      const failure = err as ApiFailure;
      setError(
        failure instanceof ApiFailure
          ? `${failure.message}${failure.hint ? ` · ${failure.hint}` : ""}`
          : "翻译失败，请稍后重试",
      );
    } finally {
      setLoading(false);
    }
  }, [text, loading, controller]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void handleTranslate();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleTranslate]);

  const handleRateChange = (next: number) => {
    setRate(next);
    controller.previewRate(next);
    controller.scheduleResynthesize({ ...request, rate: next });
  };

  const handleSourceChange = (next: SpeechSource) => {
    setSource(next);
    controller.setSource(next);
    controller.stop();
  };

  const handleDownload = () => {
    const blob = controller.getBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `korean-${Date.now()}.mp3`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const effectiveSource = speech.source;
  const statusMessage = speech.message || health?.warnings?.[0] || "";

  return (
    <div className="relative min-h-screen">
      <div className="aurora left-[-8rem] top-20 h-80 w-80 bg-brand-300 animate-float" />
      <div className="aurora right-[-6rem] top-1/4 h-72 w-72 bg-sky-soft animate-float" style={{ animationDelay: "2s" }} />

      <Header source={source} onSourceChange={handleSourceChange} onHelp={() => setHelpOpen(true)} />

      <main className="relative z-10 mx-auto max-w-[1360px] px-4 pb-20 pt-20 sm:px-6">
        <section className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-white/80 px-3 py-1 text-[11px] font-semibold text-brand-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              面向中文母语者的韩语学习工具
            </p>
            <h2 className="text-[26px] font-bold leading-[1.2] tracking-[-0.02em] text-ink-900 sm:text-[34px]">
              看懂译文，<span className="text-brand-600">听懂发音</span>
            </h2>
            <p className="mt-2 max-w-xl text-xs leading-6 text-ink-600 sm:text-[13px]">
              输入中文即可得到韩语译文、真实口语罗马字与音变规则，并可自由放慢语速跟读。
            </p>
          </div>
          <div className="hidden gap-2 lg:flex">
            {[
              { label: "离线可用", sub: "自托管翻译" },
              { label: "零付费", sub: "无必需密钥" },
              { label: "自动降级", sub: "多引擎兜底" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/90 bg-white/70 px-3 py-2 shadow-sm backdrop-blur-sm"
              >
                <p className="text-[11px] font-semibold text-ink-900">{item.label}</p>
                <p className="mt-0.5 text-[10px] text-ink-400">{item.sub}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <InputPanel
            value={text}
            onChange={setText}
            onTranslate={() => void handleTranslate()}
            loading={loading}
            maxLength={MAX_TEXT_LENGTH}
          />
          <ResultPanel result={result} loading={loading} error={error}>
            <SpeechControls
              disabled={!result?.text}
              state={speech.state}
              rate={rate}
              onRateChange={handleRateChange}
              onRateCommit={() => controller.scheduleResynthesize({ ...request, rate }, 260)}
              voice={voice}
              onVoiceChange={setVoice}
              voices={voices}
              source={source}
              effectiveSource={effectiveSource}
              onPlay={() => void controller.play(request)}
              onStop={() => controller.stop()}
              onReplay={() => void controller.play(request)}
              onDownload={handleDownload}
              canDownload={Boolean(controller.getBlob())}
            />
          </ResultPanel>
        </div>

        <p className="mt-5 text-center text-[11px] leading-5 text-ink-400">
          音变与罗马字按公开韩语标准发音规则自研实现 · 译文由开源引擎生成，学习使用请结合语境核对
        </p>
      </main>

      <StatusBar health={health} message={statusMessage} degraded={speech.degraded} />
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
