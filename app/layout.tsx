import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Malli & Co. | Premium Men's & Kids' Clothing",
  description: "Curated premium apparel for men and kids.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
