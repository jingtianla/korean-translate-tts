/** 浏览器 Web Speech API 兜底发音。

零依赖、离线可用，但语音由客户端操作系统提供：
Windows 上若未安装韩语语音包，可能没有 ko-KR voice，此时给出明确提示。
长文本按句切分排队朗读，规避约 32768 字符上限与浏览器截断。
*/

import { toWebSpeechRate } from "./types";

export function isWebSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function listKoreanVoices(): SpeechSynthesisVoice[] {
  if (!isWebSpeechAvailable()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith("ko"));
}

function splitForSpeech(text: string): string[] {
  const parts = text.match(/[^.!?。！？\n]+[.!?。！？\n]?/g) || [text];
  return parts.map((p) => p.trim()).filter(Boolean);
}

export interface WebSpeechCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

export function speakWithWebSpeech(
  text: string,
  rate: number,
  voiceId: string,
  callbacks: WebSpeechCallbacks,
): void {
  if (!isWebSpeechAvailable()) {
    callbacks.onError?.("当前浏览器不支持语音合成，请使用 Chrome / Edge / Safari");
    return;
  }
  window.speechSynthesis.cancel();

  const voices = listKoreanVoices();
  const exact = voices.find((voice) => voice.voiceURI === voiceId || voice.name === voiceId);
  const chunks = splitForSpeech(text);
  let started = false;

  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = "ko-KR";
    utterance.rate = toWebSpeechRate(rate);
    utterance.pitch = 1;
    utterance.volume = 1;
    if (exact) utterance.voice = exact;
    else if (voices.length > 0) utterance.voice = voices[0];

    utterance.onstart = () => {
      if (!started) {
        started = true;
        callbacks.onStart?.();
      }
    };
    utterance.onend = () => {
      if (index === chunks.length - 1) callbacks.onEnd?.();
    };
    utterance.onerror = (event) => {
      if (event.error !== "interrupted" && event.error !== "canceled") {
        callbacks.onError?.(`浏览器朗读失败：${event.error}`);
      }
    };
    window.speechSynthesis.speak(utterance);
  });

  if (voices.length === 0) {
    callbacks.onError?.(
      "系统未检测到韩语语音包，音色可能不准；Windows 可在「设置 → 时间和语言 → 语言」添加 한국어",
    );
  }
}

export function cancelWebSpeech(): void {
  if (isWebSpeechAvailable()) window.speechSynthesis.cancel();
}
