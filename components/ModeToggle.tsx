"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@wrksz/themes/client";
import { Button } from "@/components/ui/button";

const subscribe = () => () => { };
const getSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

export default function ModeToggle(): React.JSX.Element {
  const { theme, setTheme } = useTheme();

  const mounted = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="w-10">
        <div className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = theme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative w-10 transition-all duration-300 hover:scale-105"
      aria-label={`Mode ${isDark ? "sombre" : "clair"}`}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}