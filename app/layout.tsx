import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Reveal Studio",
  description:
    "Create app reveal videos with editable titles, icons, timing, and color controls, then download them to promote your product.",
  keywords:
    "app reveal video, app promo video, app showcase animation, product promo video, app reveal generator",
  openGraph: {
    type: "website",
    url: "https://app-reveal-studio.yencheng.dev/",
    title: "App Reveal Studio",
    description:
      "Create app reveal videos with editable titles, icons, timing, and color controls, then download them to promote your product.",
    images: "https://app-reveal-studio.yencheng.dev/og-image.png",
    siteName: "App Reveal Studio",
  },
  twitter: {
    card: "summary_large_image",
    title: "App Reveal Studio",
    description:
      "Create app reveal videos with editable titles, icons, timing, and color controls, then download them to promote your product.",
    images: "https://app-reveal-studio.yencheng.dev/og-image.png",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/favicon.png",
  },
  alternates: {
    canonical: "https://app-reveal-studio.yencheng.dev/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
