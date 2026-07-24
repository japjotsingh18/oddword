import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "Oddword — Find the odd one out",
    description: "A fast, clever multiplayer party game about clues, bluffing, and finding the player with the odd word.",
    openGraph: {
      title: "Oddword — Same vibe. Different word.",
      description: "Give one-word clues, read the room, and catch the player with the oddword.",
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "Oddword — Same vibe. Different word." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Oddword — Same vibe. Different word.",
      description: "Give one-word clues, read the room, and catch the player with the oddword.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
