/** 谚文音节分解与合成。

算法基于 Unicode 韩文音节标准（公开规范）：
  SBase = 0xAC00, LCount = 19, VCount = 21, TCount = 28,
  NCount = VCount * TCount = 588, SCount = LCount * NCount = 11172
  SIndex = code - SBase
  L = SIndex / NCount, V = (SIndex % NCount) / TCount, T = SIndex % TCount
本文件为独立实现，未复用任何第三方仓库源码。
*/

export const S_BASE = 0xac00;
export const S_COUNT = 11172;
export const L_COUNT = 19;
export const V_COUNT = 21;
export const T_COUNT = 28;
export const N_COUNT = V_COUNT * T_COUNT;

export const CHOSEONG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

export const JUNGSEONG = [
  "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ",
  "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ",
];

export const JONGSEONG = [
  "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ",
  "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

/** 修订罗马字（Revised Romanization of Korean）转写表。 */
export const INITIAL_ROMAN = [
  "g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s",
  "ss", "", "j", "jj", "ch", "k", "t", "p", "h",
];

export const MEDIAL_ROMAN = [
  "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa",
  "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i",
];

export const FINAL_ROMAN = [
  "", "k", "k", "k", "n", "n", "n", "t", "l", "k",
  "m", "l", "l", "l", "l", "l", "m", "p", "p", "t",
  "t", "ng", "t", "t", "k", "t", "p", "t",
];

/** 终声索引 → 对应初声索引（连音时用）。-1 表示无对应。 */
export const FINAL_TO_INITIAL = [
  -1, 0, 1, 0, 2, 2, 2, 3, 5, 5,
  5, 5, 5, 5, 5, 5, 6, 7, 7, 9,
  10, 11, 12, 14, 15, 16, 17, 18,
];

/** 复合终声 → [留在终声的, 移作下字初声的]。 */
export const SPLIT_FINAL: Record<number, [number, number]> = {
  3: [1, 19], 5: [4, 22], 6: [4, 27], 9: [8, 1],
  10: [8, 16], 11: [8, 17], 12: [8, 19], 13: [8, 25],
  14: [8, 26], 15: [8, 27], 18: [17, 19],
};

/** 终声的「代表音」：韩语终声只发 ㄱㄴㄷㄹㅁㅂㅇ 七种。 */
export const REPRESENTATIVE_FINAL = [
  0, 1, 1, 1, 4, 4, 4, 7, 8, 1,
  16, 8, 8, 8, 8, 8, 16, 17, 17, 7,
  7, 21, 7, 7, 1, 7, 17, 7,
];

export interface Jamo {
  initial: number;
  medial: number;
  final: number;
}

export interface Syllable extends Jamo {
  raw: string;
  isHangul: boolean;
}

export function isHangulChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= S_BASE && code < S_BASE + S_COUNT;
}

export function decompose(char: string): Jamo | null {
  if (!char || !isHangulChar(char)) return null;
  const sIndex = char.charCodeAt(0) - S_BASE;
  return {
    initial: Math.floor(sIndex / N_COUNT),
    medial: Math.floor((sIndex % N_COUNT) / T_COUNT),
    final: sIndex % T_COUNT,
  };
}

export function compose(jamo: Jamo): string {
  if (jamo.initial < 0 || jamo.medial < 0) return "";
  const index =
    S_BASE +
    (jamo.initial * V_COUNT + jamo.medial) * T_COUNT +
    Math.max(0, jamo.final);
  return String.fromCharCode(index);
}

/** 把整句切成音节单元，非谚文字符原样保留为独立单元。 */
export function tokenizeSyllables(text: string): Syllable[] {
  const result: Syllable[] = [];
  for (const char of Array.from(text)) {
    const jamo = decompose(char);
    if (jamo) {
      result.push({ ...jamo, raw: char, isHangul: true });
    } else {
      result.push({ initial: -1, medial: -1, final: 0, raw: char, isHangul: false });
    }
  }
  return result;
}

/** 判断某音节是否「元音起始」（初声为无声 ㅇ，索引 11）。 */
export function isVowelInitial(syllable: Syllable): boolean {
  return syllable.isHangul && syllable.initial === 11;
}

export function jamoLabel(syllable: Syllable): string {
  if (!syllable.isHangul) return syllable.raw;
  return (
    CHOSEONG[syllable.initial] +
    JUNGSEONG[syllable.medial] +
    (syllable.final ? JONGSEONG[syllable.final] : "")
  );
}
