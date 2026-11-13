import { useMemo, useState } from "react";
import { Check, Copy, Languages, Sparkles, Info, BookMarked, AudioLines } from "lucide-react";
import { Card, CardHeader } from "./ui/Card";
import { Tabs } from "./ui/Tabs";
import { Button } from "./ui/Button";
import { romanizeSentence } from "../lib/hangul/romanize";
import type { TranslateResult } from "../types";

interface ResultPanelProps {
  result: TranslateResult | null;
  loading: boolean;
  error: string;
  children?: React.ReactNode;
}

type TabId = "roman" | "rules" | "polite";

export function ResultPanel({ result, loading, error, children }: ResultPanelProps) {
  const [tab, setTab] = useState<TabId>("roman");
  const [copied, setCopied] = useState(false);

  const analysis = useMemo(
    () => (result?.text ? romanizeSentence(result.text) : null),
    [result?.text],
  );

  const copy = async () => {
    if (!result?.text) return;
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const tabs = [
    { id: "roman", label: "罗马字", icon: <AudioLines className="h-3 w-3" /> },
    {
      id: "rules",
      label: `音变${analysis?.rules.length ? ` ${analysis.rules.length}` : ""}`,
      icon: <Sparkles className="h-3 w-3" />,
    },
    { id: "polite", label: "语体", icon: <BookMarked className="h-3 w-3" /> },
  ];

  return (
    <Card strong className="flex min-h-[520px] flex-col overflow-visible">
      <CardHeader
        title="韩语译文"
        subtitle="大号谚文 · 发音转写 · 音变提示"
        icon={<Languages className="h-4 w-4" />}
        action={
          result && (
            <Button variant="ghost" size="sm" onClick={copy} type="button">
              {copied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "已复制" : "复制"}
            </Button>
          )
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {loading ? (
          <div className="flex flex-1 flex-col justify-center gap-3" aria-label="翻译中">
            <div className="skeleton h-9 w-4/5 rounded-xl" />
            <div className="skeleton h-9 w-3/5 rounded-xl" />
            <div className="skeleton mt-3 h-4 w-2/5 rounded-lg" />
            <p className="mt-2 animate-pulse text-xs text-brand-500">正在连接翻译引擎…</p>
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
              <Info className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold text-ink-900">翻译没有成功</p>
            <p className="max-w-sm text-xs leading-6 text-ink-600">{error}</p>
          </div>
        ) : !result ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-400">
              <Languages className="h-8 w-8" />
              <span className="absolute inset-0 rounded-3xl border border-brand-200 animate-pulse-ring" />
            </div>
            <p className="text-sm font-semibold text-ink-900">等待你的第一句中文</p>
            <p className="max-w-xs text-xs leading-6 text-ink-400">
              左侧输入中文并点击「翻译成韩语」，这里会展示译文、实际读音罗马字与音变规则
            </p>
          </div>
        ) : (
          <div className="flex flex-1 animate-fade-up flex-col gap-4">
            <div className="rounded-2xl border border-brand-100 bg-white/90 p-5">
              <p className="eyebrow mb-2">한국어 번역 · 韩语译文</p>
              <p
                className="break-words text-[26px] font-bold leading-[1.55] tracking-tight text-ink-900 sm:text-[30px]"
                lang="ko"
              >
                {result.text}
              </p>
            </div>

            {result.warning && (
              <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50/70 px-3 py-2.5 text-[11px] leading-5 text-brand-800">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                <span>{result.warning}</span>
              </div>
            )}

            <Tabs items={tabs} active={tab} onChange={(id) => setTab(id as TabId)} />

            <div className="min-h-[112px] rounded-2xl bg-white/60 p-4">
              {tab === "roman" && analysis && (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap gap-y-1" lang="ko">
                    {analysis.segments.map((seg, index) => (
                      <span
                        key={`${seg.raw}-${index}`}
                        title={seg.changed ? `实际读作 ${seg.reading}` : seg.raw}
                        className={`rounded-md px-0.5 text-lg font-semibold ${
                          seg.changed ? "bg-brand-100 text-brand-700" : "text-ink-900"
                        }`}
                      >
                        {seg.changed ? seg.reading : seg.raw}
                      </span>
                    ))}
                  </div>
                  <p className="font-mono text-sm text-brand-600">{analysis.romanized || "—"}</p>
                  <p className="text-[11px] leading-5 text-ink-400">
                    高亮字为音变后的实际读音；罗马字按修订罗马字法转写，帮助理解「所见 ≠ 所读」。
                  </p>
                </div>
              )}

              {tab === "rules" && analysis && (
                <div className="space-y-2">
                  {analysis.rules.length === 0 ? (
                    <p className="text-xs leading-6 text-ink-400">
                      这句未检测到明显音变，按字面读音朗读即可。
                    </p>
                  ) : (
                    analysis.rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="group flex cursor-help items-start gap-2 rounded-xl border border-white/80 bg-white/70 p-2.5 transition-colors hover:border-brand-200"
                        title={rule.description}
                      >
                        <span
                          className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: rule.color }}
                        />
                        <div>
                          <p className="text-xs font-semibold text-ink-900">{rule.label}</p>
                          <p className="mt-0.5 text-[11px] leading-5 text-ink-600">
                            {rule.description}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === "polite" && analysis && (
                <div className="space-y-2">
                  <span className="inline-flex rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                    {analysis.politeness.label}
                  </span>
                  <p className="text-[11px] leading-6 text-ink-600">
                    {analysis.politeness.description}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-400">
              <span>引擎 <b className="font-semibold text-ink-600">{result.provider}</b></span>
              <span>耗时 <b className="font-semibold text-ink-600">{result.elapsedMs}ms</b></span>
              {result.cached && <span className="text-ok">缓存命中</span>}
              {result.viaPivot && <span className="text-warn">经英语中转</span>}
            </div>
          </div>
        )}

        {children && (
          <div className="sticky bottom-12 z-20 -mx-1 mt-auto px-1 pb-1">
            {children}
          </div>
        )}
      </div>
    </Card>
  );
}
