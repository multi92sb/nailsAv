import { useState, useEffect, useCallback } from 'react';
import { api, type GalleryItem } from '../api/apiClient';
import { useTranslation } from '../context/LanguageContext';
import SiteHeader from '../components/SiteHeader';

export default function GalleryPage() {
  const [media, setMedia] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const { t } = useTranslation();

  const loadMedia = useCallback(() => {
    setLoading(true);
    setFailed(false);
    api
      .getMedia()
      .then((data) => setMedia(data.media))
      .catch((err) => {
        console.error(err);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  return (
    <div className="min-h-screen bg-ivory">
      <SiteHeader current="gallery" />

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-16">
        <div className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">{t('navGallery')}</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.04em] text-espresso sm:text-6xl">
              {t('ourWorkTitle')}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-7 text-muted">{t('ourWorkSubtitle')}</p>
          </div>
          {!loading && !failed && media.length > 0 && (
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted/55">
              {media.length.toString().padStart(2, '0')} {t('navGallery')}
            </span>
          )}
        </div>

        {loading && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`animate-pulse rounded-3xl bg-cream ${i % 3 === 0 ? 'aspect-[4/5]' : 'aspect-square'}`}
              />
            ))}
          </div>
        )}

        {!loading && failed && (
          <div role="alert" className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 px-6 py-10 text-center text-red-700">
            <p className="font-serif text-2xl">{t('galleryLoadError')}</p>
            <button type="button" onClick={loadMedia} className="btn-primary mt-5">
              {t('galleryRetry')}
            </button>
          </div>
        )}

        {!loading && !failed && media.length === 0 && (
          <div className="mt-8 rounded-[2rem] border border-line bg-paper px-6 py-16 text-center">
            <p className="font-serif text-2xl text-espresso">{t('noPhotosYet')}</p>
          </div>
        )}

        {!loading && !failed && media.length > 0 && (
          <div className="mt-8 columns-2 gap-3 sm:columns-3 sm:gap-4 [&>*]:mb-3 sm:[&>*]:mb-4">
            {media.map((item, index) => (
              <figure
                key={item.id}
                className="group relative break-inside-avoid overflow-hidden rounded-3xl bg-cream"
              >
                <img
                  src={item.url}
                  alt={item.caption || 'Nail art'}
                  className={`w-full object-cover transition duration-700 group-hover:scale-[1.03] ${
                    index % 5 === 0 ? 'aspect-[4/5]' : index % 3 === 0 ? 'aspect-[5/6]' : 'aspect-square'
                  }`}
                  loading="lazy"
                />
                {item.caption && (
                  <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-espresso/70 to-transparent px-4 pb-4 pt-10 text-xs font-semibold text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    {item.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
