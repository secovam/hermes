import { createHmac, timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import type { EvlogVariables } from "evlog/hono";

const { GITHUB_WEBHOOK_SECRET } = process.env;

if (!GITHUB_WEBHOOK_SECRET) {
  throw new Error("GITHUB_WEBHOOK_SECRET not configured");
}

type Variables = EvlogVariables & {
  rawBody: string;
};

export const verifyGitHubSignature: MiddlewareHandler<{ Variables: Variables }> = async (
  c,
  next,
) => {
  // Skip verification in development
  if (process.env.NODE_ENV === "development") {
    const rawBody = await c.req.raw.text();
    c.set("rawBody", rawBody);
    await next();
    return;
  }

  const signature = c.req.header("x-hub-signature-256");

  if (!signature) {
    return c.json({ error: "Missing signature" }, 401);
  }

  const rawBody = await c.req.raw.text();

  const hmac = createHmac("sha256", GITHUB_WEBHOOK_SECRET);
  hmac.update(rawBody);
  const expectedSignature = `sha256=${hmac.digest("hex")}`;

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  c.set("rawBody", rawBody);
  await next();
};
