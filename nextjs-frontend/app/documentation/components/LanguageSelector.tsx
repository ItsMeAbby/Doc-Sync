"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LanguageSelectorProps {
  languages: string[];
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  languages,
  selectedLanguage,
  onLanguageChange,
}) => {
  const handleValueChange = (value: string) => {
    onLanguageChange(value);
  };

  const getLanguageDisplay = (code: string): string => {
    const languageMap: Record<string, string> = {
      en: "English",
      ja: "Japanese",
      // Add more languages as needed
    };

    return languageMap[code] || code;
  };

  return (
    <div className="flex items-center space-x-2 w-full sm:w-auto">
      <label
        htmlFor="language-select"
        className="text-sm font-medium hidden sm:inline"
      >
        Language:
      </label>
      <Select value={selectedLanguage} onValueChange={handleValueChange}>
        <SelectTrigger id="language-select" className="w-full sm:w-[180px]">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang} value={lang}>
              {getLanguageDisplay(lang)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSelector;
