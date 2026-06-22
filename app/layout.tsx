import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Hunter — Personal ATS",
  description: "A calm, focused workspace for managing your job search",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body className="bg-canvas text-text-primary antialiased">{children}</body>
    </html>
  );
}
