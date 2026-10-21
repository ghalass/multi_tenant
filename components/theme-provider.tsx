
"use client";

import {
  ThemeProvider as ThemesProvider,
} from "@wrksz/themes/next";

export function ThemeProvider(
  props: React.ComponentProps<typeof ThemesProvider>,
) {
  return <ThemesProvider {...props} />;
}
