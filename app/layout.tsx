import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Little Kicks Tracker",
  description: "Simple baby movement tracker by Haryo & Vika",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
