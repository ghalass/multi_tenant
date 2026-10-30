// app/[locale]/layout.tsx

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { APP_NAME } from "@/lib/constantes";

import localFont from "next/font/local";
import { I18nProviderClient } from "@/locales/client";
import QueryProvider from "@/components/QueryProviser";

const cairo = localFont({
  src: [
    {
      path: "../../public/fonts/Cairo/static/Cairo-Regular.ttf",
      weight: "400",
    },
    {
      path: "../../public/fonts/Cairo/static/Cairo-Medium.ttf",
      weight: "500",
    },
    {
      path: "../../public/fonts/Cairo/static/Cairo-Bold.ttf",
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
    icon: "/images/wrench0.png",
  },
};

export default async function LocaleLayout({ params, children }: {
  params: Promise<{ locale: string }>;
  children: ReactNode;
}): Promise<import("react").JSX.Element> {
  const { locale } = await params;
  const direction = locale === "ar" ? "rtl" : "ltr";

  return (
    <div
      dir={direction}
      className={cairo.variable}
      style={{ display: "contents" }} // Permet de ne pas casser le CSS global
    >
      <QueryProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster position="bottom-right" />
          <I18nProviderClient locale={locale}>
            {children}
          </I18nProviderClient>
        </ThemeProvider>
      </QueryProvider>
    </div>
  );
}
