import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, type GalleryItem } from '../api/apiClient';
import { useTranslation } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

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
    <div className="min-h-screen bg-rose-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <span className="text-xl font-bold text-rose-700">{t('appLogo')}</span>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link to="/home" className="text-gray-600 hover:text-rose-600 transition">
              {t('backToHome')}
            </Link>
            <LanguageSelector />
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('ourWorkTitle')}</h2>
        <p className="text-gray-400 text-sm mb-8">{t('ourWorkSubtitle')}</p>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && failed && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-6 rounded-lg text-center"
          >
            <p>{t('galleryLoadError')}</p>
            <button
              type="button"
              onClick={loadMedia}
              className="mt-3 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm hover:bg-rose-700 transition"
            >
              {t('galleryRetry')}
            </button>
          </div>
        )}

        {!loading && !failed && media.length === 0 && (
          <p className="text-gray-400 text-center py-16">{t('noPhotosYet')}</p>
        )}

        {!loading && !failed && media.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {media.map((item) => (
              <div
                key={item.id}
                className="aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-sm"
              >
                <img
                  src={item.url}
                  alt="Nail art"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
