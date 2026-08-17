import { AI_ERROR_CODES, AiError } from "../errors.js";

export const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

export function createOpenAiCompatibleProvider({
  id,
  label,
  defaultModel,
  baseUrl,
  extraHeaders = () => ({}),
  fetchImpl: defaultFetch,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
}) {
  return {
    id,
    label,
    defaultModel,
    async complete({
      apiKey,
      model,
      messages,
      fetchImpl = defaultFetch ?? globalThis.fetch,
    }) {
      const trimmedKey = String(apiKey ?? "").trim();
      if (!trimmedKey) {
        throw new AiError(
          AI_ERROR_CODES.MISSING_API_KEY,
          "Add an API key in Settings before enhancing a prompt."
        );
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);
      let response;

      try {
        response = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${trimmedKey}`,
            ...extraHeaders(),
          },
          body: JSON.stringify({ model, messages }),
          signal: controller.signal,
        });
      } catch (cause) {
        if (isAbortError(cause)) {
          throw new AiError(
            AI_ERROR_CODES.NETWORK,
            "The request timed out. Try again.",
            { cause }
          );
        }

        throw new AiError(
          AI_ERROR_CODES.NETWORK,
          "Could not reach the AI provider. Check your connection and try again.",
          { cause }
        );
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await readJson(response);

      if (!response.ok) {
        throw mapHttpError(response.status, data);
      }

      const text = data?.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim()) {
        throw new AiError(
          AI_ERROR_CODES.API,
          "The provider returned an empty response."
        );
      }

      return { text };
    },
  };
}

async function readJson(response) {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function mapHttpError(status, body) {
  if (status === 401 || status === 403) {
    return new AiError(
      AI_ERROR_CODES.INVALID_API_KEY,
      "The API key was rejected. Check it in Settings.",
      { status }
    );
  }

  if (status === 429) {
    return new AiError(
      AI_ERROR_CODES.RATE_LIMITED,
      "The provider rate-limited the request. Try again later.",
      { status }
    );
  }

  if (status === 404 || isModelError(body)) {
    return new AiError(
      AI_ERROR_CODES.MODEL,
      "The selected model was not found or is not available.",
      { status }
    );
  }

  return new AiError(
    AI_ERROR_CODES.API,
    "The provider could not complete the request. Try again.",
    { status }
  );
}

function isModelError(body) {
  const error = body?.error;
  if (!error) {
    return false;
  }

  if (error.param === "model") {
    return true;
  }

  const haystack = `${error.code ?? ""} ${error.message ?? ""}`;
  return /model/i.test(haystack);
}

function isAbortError(error) {
  return error?.name === "AbortError";
}
