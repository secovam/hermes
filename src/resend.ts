import { z } from "zod";

type ResendResult =
  | { kind: "accepted"; id: string }
  | { kind: "retryable" }
  | { kind: "rejected"; needsReview: boolean }
  | { kind: "uncertain" };

const Accepted = z.object({ id: z.string().trim().min(1) });
const ProviderError = z.object({ name: z.string() });

export const sendResendEmail = async ({
  apiKey,
  bodyJson,
  idempotencyKey,
}: {
  apiKey: string;
  bodyJson: string;
  idempotencyKey: string;
}): Promise<ResendResult> => {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      body: bodyJson,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status === 429) {
      return { kind: "retryable" };
    }
    if (response.status >= 500) {
      return { kind: "uncertain" };
    }
    if (response.status === 409) {
      const error = ProviderError.safeParse(await response.json());
      if (error.success && error.data.name === "concurrent_idempotent_requests") {
        return { kind: "retryable" };
      }
      return { kind: "rejected", needsReview: true };
    }
    if (response.status >= 400) {
      return { kind: "rejected", needsReview: false };
    }
    if (!response.ok) {
      return { kind: "uncertain" };
    }
    const parsed = Accepted.safeParse(await response.json());
    return parsed.success ? { id: parsed.data.id, kind: "accepted" } : { kind: "uncertain" };
  } catch {
    return { kind: "uncertain" };
  }
};
