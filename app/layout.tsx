import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Senti — Brand perception, on demand",
  description:
    "Una lettura breve delle conversazioni pubbliche intorno a un brand.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
