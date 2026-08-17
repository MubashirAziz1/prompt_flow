export const AI_ERROR_CODES = {
  MISSING_API_KEY: "missing_api_key",
  INVALID_API_KEY: "invalid_api_key",
  PROVIDER: "provider_error",
  MODEL: "model_error",
  RATE_LIMITED: "rate_limited",
  NETWORK: "network_error",
  API: "api_error",
};

export class AiError extends Error {
  constructor(code, message, options = {}) {
    super(message, { cause: options.cause });
    this.name = "AiError";
    this.code = code;
    this.status = options.status ?? null;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function toUserMessage(error) {
  if (error instanceof AiError) {
    return error.message;
  }

  return "Something went wrong. Try again.";
}
