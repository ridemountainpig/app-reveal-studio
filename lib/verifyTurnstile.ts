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
  const headerCandidates = [
    "cf-connecting-ip",
    "fly-client-ip",
    "x-real-ip",
    "x-forwarded-for",
  ];

  for (const header of headerCandidates) {
    const value = request.headers.get(header);
    if (!value) {
      continue;
    }

    const first = value.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return "127.0.0.1";
  }

  return undefined;
}
