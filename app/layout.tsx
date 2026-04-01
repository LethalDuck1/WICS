import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WICS Compare",
  description: "Compare two weekly schedule PDFs and see added, removed, unchanged, and possible-matching shows.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
