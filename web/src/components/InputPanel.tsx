import { useMemo } from "react";
import { PenLine, WandSparkles, Trash2, Shuffle, ArrowRight } from "lucide-react";
import { Card, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";

const EXAMPLES = [
  "你好，很高兴认识你。今天天气真好。",
  "请问地铁站在哪里？我想去明洞。",
  "这份文件请在今天下班前发给我。",
  "我正在学习韩语，请说慢一点。",
  "谢谢你的帮助，祝你有美好的一天！",
  "春天来了，公园里的樱花都开了。",
];

interface InputPanelProps {
  value: string;
  onChange: (value: string) => void;
  onTranslate: () => void;
  loading: boolean;
  maxLength: number;
}

export function InputPanel({
  value,
  onChange,
  onTranslate,
  loading,
  maxLength,
}: InputPanelProps) {
  const count = useMemo(() => Array.from(value).length, [value]);
  const tooLong = count > maxLength;

  const pickExample = () => {
    const next = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
    onChange(next === value ? EXAMPLES[(EXAMPLES.indexOf(next) + 1) % EXAMPLES.length] : next);
  };

  return (
    <Card strong className="flex h-full min-h-[420px] flex-col overflow-hidden">
      <CardHeader
        title="中文输入"
        subtitle="输入句子或段落，一键得到韩语译文"
        icon={<PenLine className="h-4 w-4" />}
        action={
          <span
            className={`rounded-lg px-2 py-1 text-[11px] font-semibold tabular-nums ${
              tooLong ? "bg-danger/10 text-danger" : "bg-brand-50 text-brand-600"
            }`}
          >
            {count} / {maxLength}
          </span>
        }
      />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="group relative flex-1">
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="例如：你好，很高兴认识你。今天天气真好。"
            aria-label="中文输入"
            spellCheck={false}
            className={`h-full min-h-[240px] w-full rounded-2xl border bg-white/70 p-4 text-[15px] leading-7 text-ink-900 outline-none transition-all duration-200 placeholder:text-ink-400/70 focus:bg-white focus:ring-4 focus:ring-brand-100/70 ${
              tooLong
                ? "border-danger/60 focus:border-danger"
                : "border-brand-100 focus:border-brand-400"
            }`}
          />
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-brand-400 to-transparent transition-transform duration-500 group-focus-within:scale-x-100" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={pickExample} type="button">
            <Shuffle className="h-3.5 w-3.5" />
            随机例句
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            disabled={!value}
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
            清空
          </Button>
          <div className="ml-auto hidden text-[11px] text-ink-400 sm:block">
            Ctrl / ⌘ + Enter 快速翻译
          </div>
        </div>

        <Button
          size="lg"
          loading={loading}
          disabled={!value.trim() || tooLong}
          onClick={onTranslate}
          className="w-full"
          type="button"
        >
          {!loading && <WandSparkles className="h-4 w-4" />}
          {loading ? "正在翻译…" : "翻译成韩语"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>

        <p className="text-center text-[11px] leading-5 text-ink-400">
          默认使用离线开源引擎；不可用时自动切换免费在线接口
        </p>
      </div>
    </Card>
  );
}
