import type { Metadata, Viewport } from "next";
import "./globals.css";

const APP_URL = "https://app-reveal-studio.yencheng.dev";

export const viewport: Viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "App Reveal Studio",
  description:
    "Create app reveal videos with editable titles, icons, timing, and color controls, then download them to promote your product.",
  openGraph: {
    type: "website",
    url: `${APP_URL}/`,
    title: "App Reveal Studio",
    description:
      "Create app reveal videos with editable titles, icons, timing, and color controls, then download them to promote your product.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "App Reveal Studio – Create app reveal videos",
      },
    ],
    siteName: "App Reveal Studio",
  },
  twitter: {
    card: "summary_large_image",
    title: "App Reveal Studio",
    description:
      "Create app reveal videos with editable titles, icons, timing, and color controls, then download them to promote your product.",
    images: "/og-image.png",
  },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: "/favicon.png",
  },
  alternates: {
    canonical: `${APP_URL}/`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "App Reveal Studio",
  url: `${APP_URL}/`,
  description:
    "Create app reveal videos with editable titles, icons, timing, and color controls, then download them to promote your product.",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  isAccessibleForFree: true,
  featureList: [
    "App reveal animation generator",
    "Customizable titles and icons",
    "Adjustable timing and color controls",
    "Video download",
    "App Store and Google Play badge support",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
