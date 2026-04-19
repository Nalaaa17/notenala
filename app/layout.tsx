import type { Metadata, Viewport } from "next"; // Tambahkan Viewport di sini
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BackgroundWrapper from "./components/BackgroundWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 1. PINDAHKAN THEME COLOR KE SINI (Aturan Baru Next.js)
export const viewport: Viewport = {
  themeColor: "#2563eb",
};

// 2. METADATA TETAP DI SINI (Tanpa themeColor)
export const metadata: Metadata = {
  title: "NoteNala",
  description: "Platform simpan tugas dan catatan praktis",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NoteNala",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <BackgroundWrapper>
          {children}
        </BackgroundWrapper>
      </body>
    </html>
  );
}