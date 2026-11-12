/** 后端接口封装：统一超时、错误处理与降级判定。 */

import type {
  ApiError,
  HealthResult,
  TranslateResult,
  VoicesResult,
} from "../types";

const DEFAULT_TIMEOUT = 30000;

export class ApiFailure extends Error {
  code: string;
  hint: string;
  status: number;

  constructor(status: number, payload: ApiError) {
    super(payload.error || `HTTP ${status}`);
    this.name = "ApiFailure";
    this.status = status;
    this.code = payload.code || "UNKNOWN";
    this.hint = payload.hint || "";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
  try {
    const response = await fetch(path, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    });
    if (!response.ok) {
      let payload: ApiError = {
        error: `HTTP ${response.status}`,
        code: "HTTP_ERROR",
        hint: "",
      };
      try {
        payload = { ...payload, ...(await response.json()) };
      } catch {
        /* 非 JSON 错误响应保持默认 */
      }
      throw new ApiFailure(response.status, payload);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiFailure) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiFailure(408, {
        error: "请求超时",
        code: "TIMEOUT",
        hint: "网络较慢或翻译引擎响应超时，请稍后重试或切换发音源",
      });
    }
    throw new ApiFailure(0, {
      error: "无法连接服务",
      code: "NETWORK_ERROR",
      hint: "请确认后端已启动（默认 http://localhost:8000）",
    });
  } finally {
    window.clearTimeout(timer);
  }
}

export function translateText(text: string): Promise<TranslateResult> {
  return request<TranslateResult>("/api/translate", {
    method: "POST",
    body: JSON.stringify({ text, source: "zh", target: "ko" }),
  });
}

export function fetchVoices(): Promise<VoicesResult> {
  return request<VoicesResult>("/api/voices");
}

export function fetchHealth(): Promise<HealthResult> {
  return request<HealthResult>("/api/health");
}

/** 合成音频；返回 Blob。失败抛 ApiFailure（503 时前端降级浏览器语音）。 */
export async function synthesizeSpeech(
  text: string,
  voice: string,
  rate: number,
): Promise<Blob> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, rate }),
    });
    if (!response.ok) {
      let payload: ApiError = {
        error: "服务端发音不可用",
        code: "NO_TTS",
        hint: "将改用浏览器语音",
      };
      try {
        payload = { ...payload, ...(await response.json()) };
      } catch {
        /* 忽略非 JSON */
      }
      throw new ApiFailure(response.status, payload);
    }
    return await response.blob();
  } catch (error) {
    if (error instanceof ApiFailure) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiFailure(408, {
        error: "语音合成超时",
        code: "TIMEOUT",
        hint: "将改用浏览器语音",
      });
    }
    throw new ApiFailure(0, {
      error: "语音服务不可达",
      code: "NETWORK_ERROR",
      hint: "将改用浏览器语音",
    });
  } finally {
    window.clearTimeout(timer);
  }
}
