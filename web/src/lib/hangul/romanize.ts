/** 罗马字转写与学习性分析（独立实现）。

输入韩语译文，输出：
- 按修订罗马字规则的实际读音转写
- 逐音节分片（含原字、音变后读音、命中的规则），供 UI 高亮
- 去重后的规则清单与语体提示
*/

import {
  FINAL_ROMAN,
  INITIAL_ROMAN,
  MEDIAL_ROMAN,
  REPRESENTATIVE_FINAL,
  compose,
  tokenizeSyllables,
  type Syllable,
} from "./decompose";
import {
  applySoundChanges,
  type RuleNote,
} from "./soundChanges";

export interface RomanSegment {
  raw: string;
  reading: string;
  roman: string;
  rules: RuleNote[];
  changed: boolean;
}

export interface RomanizationResult {
  romanized: string;
  reading: string;
  segments: RomanSegment[];
  rules: RuleNote[];
  politeness: Politeness;
}

export interface Politeness {
  level: string;
  label: string;
  description: string;
}

/** 依据句尾终结词尾判断语体，帮助中文学习者理解「敬语」差异。 */
export function detectPoliteness(text: string): Politeness {
  const tail = text.trim().slice(-14);
  if (/습니다|ㅂ니다|십시오|습니까/.test(tail)) {
    return {
      level: "formal",
      label: "합쇼체 · 格式体敬语",
      description: "最正式、最礼貌，常用于新闻播报、演讲、对长辈或正式场合。词尾多为 -습니다 / -ㅂ니다。",
    };
  }
  if (/어요|아요|해요|세요|네요|죠|에요|예요/.test(tail)) {
    return {
      level: "polite",
      label: "해요체 · 非格式体敬语",
      description: "日常最常用，礼貌又自然。适合与不熟的人、同事、店员交流，初学者优先掌握。",
    };
  }
  if (/한다|된다|이다|야$|\b해$|어$|아$/.test(tail)) {
    return {
      level: "plain",
      label: "해라체 / 반말 · 非敬语",
      description: "用于亲密朋友、对晚辈或书面叙述。对不熟的人使用会显得失礼，请注意语境。",
    };
  }
  return {
    level: "unknown",
    label: "语体待判断",
    description: "未能从词尾明确判断语体。机器翻译常不区分敬语，实际使用时建议按对话对象调整。",
  };
}

function romanOf(syllable: Syllable): string {
  if (!syllable.isHangul) return "";
  const initial = INITIAL_ROMAN[syllable.initial] ?? "";
  const medial = MEDIAL_ROMAN[syllable.medial] ?? "";
  const finalIndex = REPRESENTATIVE_FINAL[syllable.final] ?? 0;
  const final = FINAL_ROMAN[finalIndex] ?? "";
  return `${initial}${medial}${final}`;
}

function readingOf(syllable: Syllable): string {
  if (!syllable.isHangul) return syllable.raw;
  const rep = REPRESENTATIVE_FINAL[syllable.final] ?? 0;
  return compose({ ...syllable, final: rep }) || syllable.raw;
}

export function romanizeSentence(koreanText: string): RomanizationResult {
  const original = tokenizeSyllables(koreanText);
  const { syllables, notes } = applySoundChanges(original);

  const segments: RomanSegment[] = syllables.map((syllable, index) => {
    const raw = original[index]?.raw ?? "";
    const reading = readingOf(syllable);
    const own = notes.filter((n) => n.index === index);
    const inherited = notes.filter((n) => n.index === index - 1 && n.id === "liaison");
    return {
      raw,
      reading,
      roman: syllable.isHangul ? romanOf(syllable) : "",
      rules: [...own, ...inherited],
      changed: syllable.isHangul && reading !== raw,
    };
  });

  // 按词拼罗马字：谚文段落内音节直连，空格/标点保留分隔
  let romanized = "";
  for (const seg of segments) {
    romanized += seg.roman;
    if (!seg.roman && seg.raw) {
      if (/\s/.test(seg.raw)) {
        romanized = romanized.trimEnd() + " ";
      } else if (/[.,!?~…]/.test(seg.raw)) {
        romanized = romanized.trimEnd() + seg.raw + " ";
      }
    }
  }

  const uniqueRules = Array.from(
    new Map(notes.map((note) => [note.id, note])).values(),
  );

  return {
    romanized: romanized.replace(/\s+/g, " ").trim(),
    reading: segments.map((s) => s.reading).join(""),
    segments,
    rules: uniqueRules,
    politeness: detectPoliteness(koreanText),
  };
}
