/**
 * @file errorMessage.ts
 * @description Helper utility to sanitize technical backend or network errors into clean,
 * user-friendly error messages with zero technical jargon.
 */

export function getFriendlyErrorMessage(
  err: unknown,
  defaultMessage = "An error occurred. Please try again."
): string {
  if (!err) return defaultMessage;

  let rawMessage = "";

  if (typeof err === "string") {
    rawMessage = err;
  } else if (err instanceof Error) {
    rawMessage = err.message;
  } else if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, any>;
    if (typeof obj.detail === "string") {
      rawMessage = obj.detail;
    } else if (Array.isArray(obj.detail)) {
      const first = obj.detail[0];
      if (first && first.msg) {
        const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : "";
        rawMessage = field ? `${field}: ${first.msg}` : first.msg;
      }
    } else if (obj.message) {
      rawMessage = String(obj.message);
    }
  }

  if (!rawMessage || typeof rawMessage !== "string") {
    return defaultMessage;
  }

  const trimmed = rawMessage.trim();

  // Strip technical HTTP / network / stack trace patterns
  if (/failed to fetch|network\s*error|err_connection|econnrefused/i.test(trimmed)) {
    return "Unable to connect to the server. Please check your network connection.";
  }

  if (/500|internal\s*server\s*error/i.test(trimmed)) {
    return "A server error occurred. Please try again later.";
  }

  if (/404|not\s*found/i.test(trimmed)) {
    return "The requested record could not be found.";
  }

  if (/401|unauthorized|invalid\s*token/i.test(trimmed)) {
    return "Your session has expired or is invalid. Please sign in again.";
  }

  if (/403|forbidden|permission/i.test(trimmed)) {
    return "You do not have permission to perform this action.";
  }

  if (/duplicate\s*key|unique\s*constraint/i.test(trimmed)) {
    return "This record already exists with the same unique information.";
  }

  if (/foreign\s*key\s*constraint|integrityerror|sqlalchemy/i.test(trimmed)) {
    return "Operation could not be completed because of related records.";
  }

  if (/traceback|exception|file\s*"[^"]+"/i.test(trimmed)) {
    return "An unexpected system error occurred. Please try again.";
  }

  // Clean raw HTTP status code prefix if present (e.g. "HTTP 400: Bad Request")
  const clean = trimmed.replace(/^HTTP\s*\d+[:\s]*/i, "");
  return clean || defaultMessage;
}
