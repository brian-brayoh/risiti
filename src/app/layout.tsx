import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Risiti", template: "%s · Risiti" },
  description: "Every M-Pesa payment becomes a KRA eTIMS invoice - automatically.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
