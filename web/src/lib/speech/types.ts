/** 发音子系统统一契约。 */

import type { PlaybackState, SpeechSource } from "../../types";

export interface SpeechRequest {
  text: string;
  voice: string;
  rate: number; // 统一 0.5 ~ 1.5 倍速
  source: SpeechSource;
}

export interface SpeechSnapshot {
  state: PlaybackState;
  source: SpeechSource;
  message: string;
  downloaded: boolean;
  degraded: boolean;
}

export type SpeechListener = (snapshot: SpeechSnapshot) => void;

export const RATE_MIN = 0.5;
export const RATE_MAX = 1.5;

export function formatRate(rate: number): string {
  return `${rate.toFixed(2).replace(/0$/, "").replace(/\.$/, "")}×`;
}

/** 把统一倍速映射到浏览器 Web Speech 的 rate（0.1~10）。 */
export function toWebSpeechRate(rate: number): number {
  return Math.min(10, Math.max(0.1, rate));
}
