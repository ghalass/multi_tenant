"use client";

import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { LANGUAGES } from "@/lib/constantes";
import { useChangeLocale, useCurrentLocale } from "@/locales/client";

export default function LanguageSelector() {
  const changeLocale = useChangeLocale()
  const locale = useCurrentLocale()

  const selectedLanguage = LANGUAGES.find(lang => lang.locale === locale)!

  return (
    <div className="flex">

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <selectedLanguage.flag className="w-5 h-4 rounded-sm" />
            <span>{selectedLanguage.name}</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-30 p-1 gap-0.5">
          {LANGUAGES.map((lang) => (
            <Button
              key={lang.locale}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => changeLocale(lang.locale)}
            >
              <lang.flag className="w-5 h-4 rounded-sm" />
              <span>{lang.name}</span>
            </Button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
};
