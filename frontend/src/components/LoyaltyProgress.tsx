import type { LoyaltyStatus } from '../api/apiClient';
import { useTranslation } from '../context/LanguageContext';

export default function LoyaltyProgress({
  loyalty,
  compact = false,
}: {
  loyalty: LoyaltyStatus;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const ready = loyalty.rewardsAvailable > 0;
  const filled = ready ? loyalty.visitsRequired : loyalty.progress;
  const nextCount = Math.max(0, loyalty.nextRewardIn);

  return (
    <section
      className={`rounded-3xl border p-5 sm:p-6 ${
        ready
          ? 'border-brand-200 bg-brand-50/70'
          : 'border-line bg-paper'
      } ${compact ? '' : 'shadow-soft'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{t('loyaltyTitle')}</p>
          <h2 className="mt-2 font-serif text-2xl font-medium tracking-[-0.03em] text-espresso">
            {ready
              ? t('loyaltyReady', { discount: loyalty.discountPercent })
              : t('loyaltyProgress', {
                  completed: loyalty.progress,
                  target: loyalty.visitsRequired,
                })}
          </h2>
          <p className="mt-2 text-xs leading-5 text-muted">
            {ready
              ? t('loyaltyReadyHint')
              : t('loyaltyNext', {
                  count: nextCount,
                  discount: loyalty.discountPercent,
                })}
          </p>
        </div>
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-xs font-extrabold ${
            ready ? 'bg-brand-400 text-white' : 'bg-brand-50 text-brand-700'
          }`}
        >
          {loyalty.discountPercent}%
        </span>
      </div>

      <div className="mt-5 flex gap-1.5" aria-hidden="true">
        {Array.from({ length: loyalty.visitsRequired }).map((_, index) => (
          <span
            key={index}
            className={`h-2 flex-1 rounded-full transition ${
              index < filled ? 'bg-brand-400' : 'bg-line'
            }`}
          />
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.1em] text-muted/60">
        <span>
          {loyalty.progress} / {loyalty.visitsRequired}
        </span>
        <span>{t('loyaltyTotalVisits', { count: loyalty.completedVisits })}</span>
      </div>
    </section>
  );
}
