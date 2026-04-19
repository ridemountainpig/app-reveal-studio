/** Cloudflare Turnstile server-side verification. */
export async function verifyTurnstileToken(params: {
  secret: string;
  token: string;
  ip?: string;
}): Promise<boolean> {
  const body = new URLSearchParams();
  body.set("secret", params.secret);
  body.set("response", params.token);
  if (params.ip) {
    body.set("remoteip", params.ip);
  }

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!res.ok) {
    return false;
  }

  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

export function getClientIpFromRequest(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.headers.get("x-real-ip") ?? undefined;
}
