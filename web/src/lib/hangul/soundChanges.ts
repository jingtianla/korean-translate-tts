/** 韩语标准发音规则管线（独立实现）。

用于向中文学习者解释「字面拼写 ≠ 实际读音」：
连音、鼻音同化、流音化、紧音化、送气化、腭化、ㅎ 弱化。
规则参考公开的韩语标准发音法（표준 발음법），代码为自研，
未复用任何第三方仓库源码。

设计为逐音节单向管线：每步比较相邻音节，修改后写回并登记规则标注，
供 UI 高亮与悬浮讲解。
*/

import {
  CHOSEONG,
  FINAL_TO_INITIAL,
  REPRESENTATIVE_FINAL,
  SPLIT_FINAL,
  type Syllable,
  isVowelInitial,
} from "./decompose";

export interface RuleNote {
  id: string;
  label: string;
  description: string;
  index: number;
  color: string;
}

export const RULE_META: Record<string, { label: string; description: string; color: string }> = {
  liaison: {
    label: "连音",
    description: "前一个字的终声辅音移到后一个元音起始字的初声位置，例如「한국어」读作「한구거」。",
    color: "#6C5CE7",
  },
  nasalization: {
    label: "鼻音同化",
    description: "终声 ㄱ/ㄷ/ㅂ 遇到 ㄴ/ㅁ 时变为 ㅇ/ㄴ/ㅁ，例如「합니다」读作「함니다」。",
    color: "#4A90D9",
  },
  liquidization: {
    label: "流音化",
    description: "ㄴ 与 ㄹ 相邻时，ㄴ 变为 ㄹ，例如「신라」读作「실라」。",
    color: "#2BB673",
  },
  tensification: {
    label: "紧音化",
    description: "终声 ㄱ/ㄷ/ㅂ 之后的平音 ㄱ/ㄷ/ㅂ/ㅅ/ㅈ 变为紧音，例如「학교」读作「학꾜」。",
    color: "#F5A623",
  },
  aspiration: {
    label: "送气化",
    description: "ㅎ 与 ㄱ/ㄷ/ㅈ 相遇时合并为送气音 ㅋ/ㅌ/ㅊ，例如「좋다」读作「조타」。",
    color: "#E5484D",
  },
  palatalization: {
    label: "腭化",
    description: "终声 ㄷ/ㅌ 后接 이 时，读成 지/치，例如「같이」读作「가치」。",
    color: "#B06BE0",
  },
  hWeakening: {
    label: "ㅎ 弱化",
    description: "ㅎ 在元音或响音前通常不发音，例如「좋아요」读作「조아요」。",
    color: "#7C8AA5",
  },
};

const STOPS = new Set([1, 7, 17]); // 代表音 ㄱ ㄷ ㅂ
const TENSE_PAIR: Record<number, number> = { 0: 1, 3: 4, 7: 8, 9: 10, 12: 13 };
const ASPIRATE_PAIR: Record<number, number> = { 0: 15, 3: 16, 12: 14, 18: 14 };
const NASAL_PAIR: Record<number, number> = { 1: 21, 7: 4, 17: 16 };

function note(id: string, index: number): RuleNote {
  const meta = RULE_META[id];
  return { id, label: meta.label, description: meta.description, color: meta.color, index };
}

function adjacent(
  list: Syllable[],
  index: number,
): { current: Syllable; next: Syllable } | null {
  const current = list[index];
  const next = list[index + 1];
  if (!current || !next || !current.isHangul || !next.isHangul) return null;
  return { current, next };
}

/** 连音：复合终声拆分后把第二个辅音移到下字初声。 */
function applyLiaison(list: Syllable[], notes: RuleNote[]): void {
  for (let i = 0; i < list.length - 1; i += 1) {
    const pair = adjacent(list, i);
    if (!pair) continue;
    const { current, next } = pair;
    if (!current.final || !isVowelInitial(next)) continue;
    if (current.final === 21) continue; // ㅇ 不连音

    const split = SPLIT_FINAL[current.final];
    if (split) {
      current.final = split[0];
      const moved = FINAL_TO_INITIAL[split[1]];
      if (moved >= 0) next.initial = moved;
    } else {
      const moved = FINAL_TO_INITIAL[current.final];
      if (moved >= 0) next.initial = moved;
      current.final = 0;
    }
    notes.push(note("liaison", i));
  }
}

/** 鼻音同化：阻塞音终声 + 鼻音初声 → 鼻音终声。 */
function applyNasalization(list: Syllable[], notes: RuleNote[]): void {
  for (let i = 0; i < list.length - 1; i += 1) {
    const pair = adjacent(list, i);
    if (!pair) continue;
    const { current, next } = pair;
    if (!current.final) continue;
    if (next.initial !== 2 && next.initial !== 6) continue;
    const rep = REPRESENTATIVE_FINAL[current.final];
    const replacement = NASAL_PAIR[rep];
    if (replacement === undefined) continue;
    current.final = replacement;
    notes.push(note("nasalization", i));
  }
}

/** 流音化：ㄴ + ㄹ / ㄹ + ㄴ → ㄹ + ㄹ。 */
function applyLiquidization(list: Syllable[], notes: RuleNote[]): void {
  for (let i = 0; i < list.length - 1; i += 1) {
    const pair = adjacent(list, i);
    if (!pair) continue;
    const { current, next } = pair;
    if (REPRESENTATIVE_FINAL[current.final] === 4 && next.initial === 5) {
      current.final = 8;
      notes.push(note("liquidization", i));
    } else if (
      REPRESENTATIVE_FINAL[current.final] === 8 &&
      next.initial === 2
    ) {
      next.initial = 5;
      notes.push(note("liquidization", i));
    }
  }
}

/** 紧音化：阻塞音终声 + 平音初声 → 紧音。 */
function applyTensification(list: Syllable[], notes: RuleNote[]): void {
  for (let i = 0; i < list.length - 1; i += 1) {
    const pair = adjacent(list, i);
    if (!pair) continue;
    const { current, next } = pair;
    if (!current.final || !STOPS.has(REPRESENTATIVE_FINAL[current.final])) continue;
    const tense = TENSE_PAIR[next.initial];
    if (tense === undefined) continue;
    next.initial = tense;
    notes.push(note("tensification", i));
  }
}

/** 腭化：ㄷ/ㅌ 终声 + 이 → 下字初声 ㅈ/ㅊ。 */
function applyPalatalization(list: Syllable[], notes: RuleNote[]): void {
  for (let i = 0; i < list.length - 1; i += 1) {
    const pair = adjacent(list, i);
    if (!pair) continue;
    const { current, next } = pair;
    if (current.final !== 7 && current.final !== 25) continue;
    if (next.medial !== 20 || next.initial !== 11) continue;
    next.initial = current.final === 7 ? 12 : 14;
    current.final = 0;
    notes.push(note("palatalization", i));
  }
}

/** 送气化：ㅎ 与平音相遇 → 送气音。 */
function applyAspiration(list: Syllable[], notes: RuleNote[]): void {
  for (let i = 0; i < list.length - 1; i += 1) {
    const pair = adjacent(list, i);
    if (!pair) continue;
    const { current, next } = pair;
    const rep = REPRESENTATIVE_FINAL[current.final] || 0;
    if (rep === 27 || current.final === 27) {
      const aspirated = ASPIRATE_PAIR[next.initial];
      if (aspirated !== undefined) {
        next.initial = aspirated;
        current.final = 0;
        notes.push(note("aspiration", i));
      }
    } else if (next.initial === 18) {
      const aspirated = ASPIRATE_PAIR_REVERSE[rep];
      if (aspirated !== undefined) {
        current.final = aspirated;
        next.initial = 11;
        notes.push(note("aspiration", i));
      }
    }
  }
}

const ASPIRATE_PAIR_REVERSE: Record<number, number> = {
  1: 24, 7: 25, 17: 26, 22: 23,
};

/** ㅎ 弱化：ㅎ 在元音前脱落。 */
function applyHWeakening(list: Syllable[], notes: RuleNote[]): void {
  for (let i = 0; i < list.length - 1; i += 1) {
    const pair = adjacent(list, i);
    if (!pair) continue;
    const { current, next } = pair;
    if (current.final === 27 && isVowelInitial(next)) {
      current.final = 0;
      notes.push(note("hWeakening", i));
    }
  }
}

export interface SoundChangeResult {
  syllables: Syllable[];
  notes: RuleNote[];
}

/** 按顺序执行规则管线，返回音变后的音节与规则标注。 */
export function applySoundChanges(origin: Syllable[]): SoundChangeResult {
  const list = origin.map((s) => ({ ...s }));
  const notes: RuleNote[] = [];
  applyHWeakening(list, notes);
  applyPalatalization(list, notes);
  applyAspiration(list, notes);
  applyLiaison(list, notes);
  applyNasalization(list, notes);
  applyLiquidization(list, notes);
  applyTensification(list, notes);
  return { syllables: list, notes };
}

export function describeJamo(syllable: Syllable): string {
  if (!syllable.isHangul) return "";
  return CHOSEONG[syllable.initial] ?? "";
}
