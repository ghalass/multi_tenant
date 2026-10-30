
"use client";

import {
  ThemeProvider as ThemesProvider,
} from "@wrksz/themes/next";
import type { ComponentProps, JSX } from "react";

export function ThemeProvider(
  props: ComponentProps<typeof ThemesProvider>,
): JSX.Element {
  return <ThemesProvider {...props} />;
}
