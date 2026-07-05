import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Paisa — Business Finance, Simplified",
  description:
    "The modern accounting platform for Indian businesses. Track every rupee, simplify GST, manage inventory and payroll — all in one place.",
  openGraph: {
    title: "Paisa — Business Finance, Simplified",
    description: "The modern accounting platform for Indian businesses.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} h-full scroll-smooth`}>
      <body className="min-h-full flex flex-col bg-white text-zinc-900 antialiased" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
