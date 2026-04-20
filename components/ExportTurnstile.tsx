"use client";

import Turnstile from "react-turnstile";

type ExportTurnstileProps = {
  siteKey: string;
  /** Bump after export to mount a fresh widget (tokens are single-use). */
  widgetKey: number;
  onToken: (token: string | null) => void;
};

export function ExportTurnstile({
  siteKey,
  widgetKey,
  onToken,
}: ExportTurnstileProps) {
  return (
    <div className="flex min-h-[65px] items-center justify-center">
      <Turnstile
        key={widgetKey}
        sitekey={siteKey}
        theme="dark"
        fixedSize
        refreshExpired="auto"
        onVerify={(token) => onToken(token)}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
      />
    </div>
  );
}
