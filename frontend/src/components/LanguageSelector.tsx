import React from 'react';
import { useTranslation } from '../context/LanguageContext';

interface LanguageSelectorProps {
  floating?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ floating = false }) => {
  const { language, setLanguage } = useTranslation();

  const containerClasses = floating
    ? 'fixed right-4 top-4 z-50 flex items-center gap-0.5 rounded-full border border-line bg-paper/90 p-1 shadow-soft backdrop-blur-md'
    : 'flex items-center gap-0.5 rounded-full border border-line/80 bg-paper/60 p-1';

  return (
    <div className={containerClasses}>
      {(['en', 'sr'] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLanguage(value)}
          className={`rounded-full px-2.5 py-1.5 text-[9px] font-extrabold tracking-[0.08em] transition ${
            language === value
              ? 'bg-brand-400 text-white shadow-sm'
              : 'text-muted hover:bg-brand-100/60 hover:text-espresso'
          }`}
        >
          {value.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LanguageSelector;
