import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/apiClient';

interface MediaItem {
  key: string;
  url: string;
}

export default function GalleryPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMedia()
      .then((data) => setMedia(data.media))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-rose-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-xl font-bold text-rose-700">💅 NailsAv</span>
          <Link to="/home" className="text-sm text-gray-600 hover:text-rose-600 transition">
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Our Work</h2>
        <p className="text-gray-400 text-sm mb-8">A selection of our latest nail art</p>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && media.length === 0 && (
          <p className="text-gray-400 text-center py-16">No photos yet — check back soon!</p>
        )}

        {!loading && media.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {media.map((item) => (
              <div
                key={item.key}
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
