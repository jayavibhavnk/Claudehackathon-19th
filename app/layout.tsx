import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steplet — PT Animations",
  description:
    "Turn any physical therapy prescription into animated step-by-step tutorials.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
