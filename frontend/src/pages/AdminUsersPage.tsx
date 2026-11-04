import { useEffect, useState } from 'react';
import { api, type AdminLoyaltyUser } from '../api/apiClient';
import { useTranslation } from '../context/LanguageContext';

interface AdminUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
  role: 'USER' | 'ADMIN';
}

export default function AdminUsersPage() {
  const { t, language } = useTranslation();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loyaltyByUser, setLoyaltyByUser] = useState<Record<string, AdminLoyaltyUser>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setError(null);
      setLoading(true);
      const [res, loyaltyRes] = await Promise.all([api.getUsers(), api.getAdminLoyalty()]);
      setUsers(res.users);
      setLoyaltyByUser(
        Object.fromEntries(loyaltyRes.users.map((entry) => [entry.userId, entry])),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRedeemLoyalty = async (userId: string) => {
    if (!window.confirm(t('loyaltyRedeemConfirm'))) return;
    setRedeemingId(userId);
    try {
      const res = await api.adminRedeemLoyalty(userId);
      setLoyaltyByUser((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], ...res.loyalty },
      }));
      window.alert(t('loyaltyRedeemSuccess'));
    } catch {
      window.alert(t('loyaltyRedeemNone'));
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
            {t('adminPanel')}
          </p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-[-0.045em] text-studio-ink sm:text-3xl">
            {t('registeredUsersTitle')}
          </h1>
          <p className="mt-1.5 text-xs text-zinc-500">
            {loading ? t('loadingUsers') : `${users.length} ${t('navUsers').toLowerCase()}`}
          </p>
        </div>
        <button
          type="button"
          onClick={loadUsers}
          className="rounded-lg bg-coral px-4 py-2.5 text-[10px] font-extrabold text-white shadow-[0_8px_18px_rgba(225,29,72,.2)] transition hover:bg-red-700"
        >
          {t('refresh')}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <div className="admin-card p-6 text-sm text-zinc-500">{t('noUsersFound')}</div>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-[9px] font-extrabold uppercase tracking-[0.1em] text-zinc-400">
                <tr>
                  <th className="px-5 py-3.5">{t('tableUser')}</th>
                  <th className="px-5 py-3.5">{t('emailLabel')}</th>
                  <th className="px-5 py-3.5">{t('tablePhone')}</th>
                  <th className="px-5 py-3.5">{t('tableRole')}</th>
                  <th className="px-5 py-3.5">{t('tableCreated')}</th>
                  <th className="px-5 py-3.5 text-right">{t('loyaltyAdminColumn')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const loyalty = loyaltyByUser[user.userId];
                  return (
                    <tr key={user.userId} className="border-t border-studio-line/80">
                      <td className="px-5 py-4 font-semibold text-zinc-800">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">{user.email}</td>
                      <td className="px-5 py-4 text-zinc-600">{user.phone}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] ${
                            user.role === 'ADMIN'
                              ? 'bg-[#FFF1F3] text-coral'
                              : 'bg-zinc-100 text-zinc-500'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-zinc-500">
                        {new Date(user.createdAt).toLocaleString(language === 'sr' ? 'sr-Latn-RS' : 'en-US')}
                      </td>
                      <td className="min-w-[190px] px-5 py-4">
                        {user.role === 'USER' && loyalty ? (
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="flex w-24 gap-1" aria-hidden="true">
                                {Array.from({ length: loyalty.visitsRequired }).map((_, index) => (
                                  <span
                                    key={index}
                                    className={`h-1.5 flex-1 rounded-full ${
                                      index < (loyalty.rewardsAvailable > 0 ? loyalty.visitsRequired : loyalty.progress)
                                        ? 'bg-brand-400'
                                        : 'bg-zinc-200'
                                    }`}
                                  />
                                ))}
                              </div>
                              <p className="mt-1 text-[9px] font-semibold text-zinc-400">
                                {loyalty.progress} / {loyalty.visitsRequired} ·{' '}
                                {t('loyaltyTotalVisits', { count: loyalty.completedVisits })}
                              </p>
                            </div>
                            {loyalty.rewardsAvailable > 0 && (
                              <button
                                type="button"
                                onClick={() => handleRedeemLoyalty(user.userId)}
                                disabled={redeemingId === user.userId}
                                className="shrink-0 rounded-full border border-rose-200 px-3 py-1.5 text-[8px] font-extrabold text-coral transition hover:bg-[#FFF1F3] disabled:opacity-50"
                              >
                                {redeemingId === user.userId ? '…' : t('loyaltyRedeemButton')}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[9px] text-zinc-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
