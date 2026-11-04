import type { ReactNode } from 'react';
import Brand from './Brand';
import LanguageSelector from './LanguageSelector';
import { useTranslation } from '../context/LanguageContext';
import background from '../assets/background.png';

export default function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(430px,.92fr)]">
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-6 lg:px-12">
          <Brand to="/login" />
          <LanguageSelector />
        </header>
        <main className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <footer className="px-6 pb-8 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-muted/60">
          NailsAv · by appointment only
        </footer>
      </div>

      <aside className="relative hidden overflow-hidden bg-espresso p-12 text-ivory lg:flex lg:flex-col lg:justify-between">
        <img
          src={background}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-soft-light saturate-50"
        />
        <div className="absolute -right-28 -top-24 h-96 w-96 rounded-full bg-brand-400/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-[32rem] w-[32rem] rounded-full bg-gold/20 blur-3xl" />
        <div className="absolute inset-x-12 bottom-40 h-px bg-ivory/20" />

        <div className="relative z-10 flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-[0.22em] text-ivory/65">
          <span className="h-px w-7 bg-gold" />
          {t('brandEyebrow')}
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="font-serif text-6xl font-medium leading-[.98] tracking-[-0.045em] xl:text-7xl">
            {t('brandTitle')}
            <br />
            <em className="font-normal text-brand-300">{t('brandTitleAccent')}</em>
          </h2>
          <p className="mt-7 max-w-sm text-sm leading-7 text-ivory/65">{t('brandSubtitle')}</p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.16em] text-ivory/45">
          <span>Belgrade · RS</span>
          <span>Est. 2026</span>
        </div>
      </aside>
    </div>
  );
}
