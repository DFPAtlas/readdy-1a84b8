// ── Readable billing errors ──
// supabase.functions.invoke reports any non-2xx as "Edge Function returned a
// non-2xx status code", which means nothing to a customer. The billing
// functions send a short reason in the JSON body; use it where it is safe to
// show, and plain wording otherwise.

const SERVER_FALLBACK = "We couldn't reach our payment provider. Please try again in a moment.";

interface InvokeErrorLike {
  message?: string;
  context?: { status?: number; json?: () => Promise<unknown>; clone?: () => { json: () => Promise<unknown> } };
}

export async function billingErrorMessage(error: unknown, fallback = SERVER_FALLBACK): Promise<string> {
  const err = (error || {}) as InvokeErrorLike;
  const status = err.context?.status;

  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return "You don't have permission to change billing for this wedding.";
  if (typeof status === 'number' && status >= 500) return fallback;

  if (typeof status === 'number' && status >= 400) {
    try {
      const source = err.context?.clone ? err.context.clone() : err.context;
      const body = (await source?.json?.()) as { error?: unknown } | undefined;
      const reason = typeof body?.error === 'string' ? body.error.trim() : '';
      if (reason && reason.length <= 160) return reason.endsWith('.') ? reason : `${reason}.`;
    } catch {
      // Body was not JSON: fall through.
    }
    return fallback;
  }

  // Network failure (no response) or an unexpected throw.
  if (err.message && !/non-2xx|edge function/i.test(err.message)) {
    if (/failed to fetch|network/i.test(err.message)) return 'A network error occurred. Please check your connection and try again.';
  }
  return fallback;
}
