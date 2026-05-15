export class MediaError extends Error {
  constructor(
    message: string,
    public readonly code: MediaErrorCode,
  ) {
    super(message);
    this.name = "MediaError";
  }
}

export type MediaErrorCode =
  | "unsupported_type"
  | "too_large"
  | "not_found"
  | "invalid_input";
