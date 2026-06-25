import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import { BackgroundMusic } from "@/components/background-music";
import "./globals.css";

const appSans = Be_Vietnam_Pro({
  variable: "--font-app-sans",
  subsets: ["vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WC 2026 Portal",
  description: "Dự đoán World Cup 2026 nội bộ",
  icons: {
    icon: "/bieutuong.png",
    apple: "/bieutuong.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${appSans.variable} ${geistMono.variable} h-full overflow-x-hidden antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-hidden">
        {children}
        <BackgroundMusic />
      </body>
    </html>
  );
}
