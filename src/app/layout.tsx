import type { Metadata } from "next";
import { Geist_Mono, Julius_Sans_One, Lato } from "next/font/google";
import "./globals.css";

// The fonts used on the nursery's website.
const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const julius = Julius_Sans_One({
  variable: "--font-julius",
  subsets: ["latin"],
  weight: "400",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Montagu Square Day Nursery",
  description: "Staff portal",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${lato.variable} ${julius.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
