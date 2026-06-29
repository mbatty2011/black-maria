import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Black Maria 2.0 — the production brain",
  description:
    "A generator-agnostic orchestration brain for AI filmmaking. Shared memory, a canonical asset registry, consistency injection, and change propagation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-mono antialiased">{children}</body>
    </html>
  );
}
