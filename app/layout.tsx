import type { Metadata } from "next";
// Next.js processes this global stylesheet; TypeScript has no module declaration for CSS.
// @ts-ignore
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import QueryProvider from "@/components/QueryProviser";
import { APP_NAME } from "@/lib/constantes";

import localFont from "next/font/local";

const cairo = localFont({
  src: [
    {
      path: "../public/fonts/Cairo/static/Cairo-Regular.ttf",
      weight: "400",
    },
    {
      path: "../public/fonts/Cairo/static/Cairo-Medium.ttf",
      weight: "500",
    },
    {
      path: "../public/fonts/Cairo/static/Cairo-Bold.ttf",
      weight: "700",
    },
  ],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Desc App",
  authors: {
    name: "GHALASS",
    url: "ghalass.com",
  },
  icons: {
    icon: "/images/wrench.png",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning className={cairo.variable}>
      <body>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <Toaster position="bottom-right" />
            {children}
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
