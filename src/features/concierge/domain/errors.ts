/**
 * Concierge domain errors. Each is a typed value object so the application
 * layer can react to specific failure modes without parsing strings.
 */

export class ConciergeError extends Error {
  override readonly name = "ConciergeError";
  constructor(
    message: string,
    readonly code:
      | "invalid_input"
      | "rate_limited"
      | "upstream_failure"
      | "upstream_unauthorized"
      | "missing_config",
  ) {
    super(message);
  }
}
