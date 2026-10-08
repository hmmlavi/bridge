import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bridge — Direct file transfer",
  description:
    "Scan. Connect. Send. Instant, private, device-to-device file transfer between your PC and phone — no accounts, no cloud.",
  manifest: "/manifest.webmanifest",
  applicationName: "Bridge",
  icons: [
    { rel: "icon", url: "/icon.svg", type: "image/svg+xml" },
    { rel: "apple-touch-icon", url: "/icon-192.png" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bridge",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#08080a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="stage antialiased">
        <div aria-hidden className="ambient left-[8%] top-[-14rem] h-[26rem] w-[42rem]" />
        <div aria-hidden className="ambient bottom-[-16rem] right-[-10%] h-[30rem] w-[38rem]" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
