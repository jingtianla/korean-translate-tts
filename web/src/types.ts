/** 与后端 schemas.py 一一对应的共享类型。 */

export interface TranslateResult {
  text: string;
  provider: string;
  viaPivot: boolean;
  cached: boolean;
  degraded: boolean;
  warning: string | null;
  elapsedMs: number;
  segments: string[];
  romanized?: string | null;
}

export interface VoiceItem {
  id: string;
  label: string;
  gender: string;
}

export interface VoicesResult {
  voices: VoiceItem[];
  provider: string;
  browserFallback: boolean;
}

export interface ProviderState {
  name: string;
  available: boolean;
  detail: string;
}

export interface HealthResult {
  status: "ok" | "degraded" | "error";
  version: string;
  uptimeSeconds: number;
  translateChain: ProviderState[];
  tts: ProviderState;
  cache: Record<string, number | boolean>;
  warnings: string[];
}

export interface ApiError {
  error: string;
  code: string;
  hint: string;
}

export type SpeechSource = "server" | "browser";

export type PlaybackState = "idle" | "loading" | "playing" | "paused" | "error";

export interface SpeechOptions {
  voice: string;
  rate: number;
  source: SpeechSource;
}
