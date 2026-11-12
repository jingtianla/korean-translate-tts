/** 统一发音控制器。

职责：
1. 按 SpeechSource 选择服务端 edge-tts 或浏览器 Web Speech；
2. 服务端 503 / 网络失败时自动降级到浏览器语音，并回报 degraded；
3. 语速滑块拖动时用 audio.playbackRate 即时预览，避免每次拖动都重新合成；
4. 显式「重新合成」或防抖结束后才请求后端，减少 TTS 调用；
5. 缓存最近一次音频 Blob，供「下载」按钮复用。
*/

import { synthesizeSpeech } from "../api";
import { cancelWebSpeech, isWebSpeechAvailable, speakWithWebSpeech, listKoreanVoices } from "./webSpeech";
import type { SpeechListener, SpeechRequest, SpeechSnapshot } from "./types";
import type { SpeechSource } from "../../types";

export class SpeechController {
  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private lastBlob: Blob | null = null;
  private listeners = new Set<SpeechListener>();
  private requestToken = 0;
  private synthesizedRate = 1;
  private debounceTimer: number | null = null;
  private snapshot: SpeechSnapshot = {
    state: "idle",
    source: "server",
    message: "",
    downloaded: false,
    degraded: false,
  };

  subscribe(listener: SpeechListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  private emit(patch: Partial<SpeechSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener(this.snapshot));
  }

  getSnapshot(): SpeechSnapshot {
    return this.snapshot;
  }

  getBlob(): Blob | null {
    return this.lastBlob;
  }

  /** 拖动滑块时即时改变播放速率；不触发网络请求。 */
  previewRate(rate: number): void {
    if (this.audio && this.synthesizedRate > 0) {
      this.audio.playbackRate = Math.min(4, Math.max(0.25, rate / this.synthesizedRate));
    }
  }

  /** 松手后防抖重合成，使音高自然（合成参数而非播放速率）。 */
  scheduleResynthesize(request: SpeechRequest, delay = 700): void {
    if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null;
      if (this.snapshot.state === "playing" || this.snapshot.state === "loading") {
        void this.play(request);
      }
    }, delay);
  }

  async play(request: SpeechRequest): Promise<void> {
    const token = ++this.requestToken;
    this.stopPlayback();
    this.emit({
      state: "loading",
      source: request.source,
      message: "正在准备语音…",
      degraded: false,
    });

    if (request.source === "browser") {
      this.playInBrowser(request, token);
      return;
    }

    try {
      const blob = await synthesizeSpeech(request.text, request.voice, request.rate);
      if (token !== this.requestToken) return;
      this.lastBlob = blob;
      this.synthesizedRate = request.rate;
      this.playBlob(blob, request, token);
    } catch (error) {
      if (token !== this.requestToken) return;
      const reason = error instanceof Error ? error.message : "未知错误";
      if (!isWebSpeechAvailable()) {
        this.emit({ state: "error", message: `发音失败：${reason}` });
        return;
      }
      this.emit({
        source: "browser",
        degraded: true,
        message: `服务端发音不可用，已切换浏览器语音（${reason}）`,
      });
      this.playInBrowser({ ...request, source: "browser" }, token);
    }
  }

  private playBlob(blob: Blob, request: SpeechRequest, token: number): void {
    this.releaseObjectUrl();
    this.objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(this.objectUrl);
    audio.playbackRate = 1;
    audio.onended = () => {
      if (token === this.requestToken) {
        this.emit({ state: "idle", message: "播放完成" });
      }
    };
    audio.onerror = () => {
      if (token === this.requestToken) {
        this.emit({ state: "error", message: "音频播放失败，请重试或切换发音源" });
      }
    };
    this.audio = audio;
    void audio.play().then(() => {
      if (token === this.requestToken) {
        this.emit({ state: "playing", downloaded: true, message: "正在朗读" });
      }
    }).catch(() => {
      if (token === this.requestToken) {
        this.emit({ state: "error", message: "浏览器阻止了自动播放，请再次点击播放" });
      }
    });
    void request;
  }

  private playInBrowser(request: SpeechRequest, token: number): void {
    const voices = listKoreanVoices();
    const preferred = voices.find(
      (voice) => voice.name === request.voice || voice.voiceURI === request.voice,
    );
    speakWithWebSpeech(request.text, request.rate, preferred?.voiceURI || request.voice, {
      onStart: () => {
        if (token === this.requestToken) {
          this.emit({ state: "playing", message: "正在用浏览器语音朗读" });
        }
      },
      onEnd: () => {
        if (token === this.requestToken) this.emit({ state: "idle", message: "播放完成" });
      },
      onError: (message) => {
        if (token === this.requestToken) {
          // 部分浏览器在缺少韩语语音时仍会朗读，此时只提示不判为失败
          this.emit({ message, state: this.snapshot.state === "loading" ? "playing" : this.snapshot.state });
        }
      },
    });
  }

  stop(): void {
    ++this.requestToken;
    this.stopPlayback();
    this.emit({ state: "idle", message: "已停止" });
  }

  private stopPlayback(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio = null;
    }
    cancelWebSpeech();
    this.releaseObjectUrl();
  }

  private releaseObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  setSource(source: SpeechSource): void {
    this.emit({ source });
  }

  dispose(): void {
    if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
    this.stopPlayback();
    this.lastBlob = null;
    this.listeners.clear();
  }
}
