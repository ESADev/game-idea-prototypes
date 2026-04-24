import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Build-Your-Ship Invaders Prototype",
  description: "Space Invaders prototype where you collect dropped alien parts to build your ship live.",
};

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
