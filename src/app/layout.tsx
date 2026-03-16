import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inner Space Odyssey | 内太空漫游",
  description: "让 AI 替你试探难以启齿的身体偏好",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-mono">
        {children}
      </body>
    </html>
  );
}
