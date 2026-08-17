export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function chatCompletionResponse(text, extra = {}) {
  return jsonResponse({
    id: "chatcmpl-test",
    object: "chat.completion",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: "stop",
      },
    ],
    ...extra,
  });
}

export function createFakeFetch(handler) {
  const calls = [];

  async function fetchImpl(url, init = {}) {
    calls.push({ url: String(url), init });
    return handler({ url: String(url), init, calls });
  }

  fetchImpl.calls = calls;
  return fetchImpl;
}
