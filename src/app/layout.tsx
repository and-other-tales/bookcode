import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BookCode - Wave Code Generator",
  description: "Generate Spotify-style wave codes for book pages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
