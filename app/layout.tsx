import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steplet — AI PT Coach",
  description: "Your AI physical therapy coach. Say any exercise and get guided through it with animations, pose tracking, and voice coaching.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
