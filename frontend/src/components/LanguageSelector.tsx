import React from 'react';
import { useTranslation } from '../context/LanguageContext';

interface LanguageSelectorProps {
  floating?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ floating = false }) => {
  const { language, setLanguage } = useTranslation();

  const containerClasses = floating
    ? 'fixed top-4 right-4 z-50 bg-white/90 backdrop-blur-sm shadow-md border border-rose-100 rounded-xl p-1 flex gap-0.5 items-center animate-in fade-in slide-in-from-top-3 duration-300'
    : 'bg-rose-50 border border-rose-100/50 rounded-xl p-1 flex gap-0.5 items-center transition hover:bg-rose-100/20';

  return (
    <div className={containerClasses}>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
          language === 'en'
            ? 'bg-rose-600 text-white shadow-sm'
            : 'text-rose-700/70 hover:text-rose-800 hover:bg-rose-100/40'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('sr')}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
          language === 'sr'
            ? 'bg-rose-600 text-white shadow-sm'
            : 'text-rose-700/70 hover:text-rose-800 hover:bg-rose-100/40'
        }`}
      >
        SR
      </button>
    </div>
  );
};
export default LanguageSelector;
