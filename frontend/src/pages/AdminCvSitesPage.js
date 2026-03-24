import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { cvPlatformAPI } from '../services/api';

const STATUS_OPTIONS = [
  { value: 'all', labelKey: 'admin.cvSitesStatusAll' },
  { value: 'pending', labelKey: 'admin.cvSitesStatusPending' },
  { value: 'approved', labelKey: 'admin.cvSitesStatusApproved' },
  { value: 'rejected', labelKey: 'admin.cvSitesStatusRejected' },
  { value: 'suspended', labelKey: 'admin.cvSitesStatusSuspended' },
];

const AdminCvSitesPage = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [sites, setSites] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSlug, setCreateSlug] = useState('');
  const [createUserEmail, setCreateUserEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const qRef = useRef(q);
  qRef.current = q;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cvPlatformAPI.listCvSites({ status, q: qRef.current });
      setSites(Array.isArray(data?.sites) ? data.sites : []);
      setTotal(typeof data?.total === 'number' ? data.total : 0);
    } catch (err) {
      const msg = err?.message || t('admin.cvSitesLoadFail');
      setError(msg);
      setSites([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [status, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (id) => {
    try {
      await cvPlatformAPI.approveCvSite(id);
      void load();
    } catch {
      /* toast from api */
    }
  };

  const suspend = async (id) => {
    try {
      await cvPlatformAPI.suspendCvSite(id);
      void load();
    } catch {
      /* toast */
    }
  };

  const confirmReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    try {
      await cvPlatformAPI.rejectCvSite(rejectId, rejectReason.trim());
      setRejectId(null);
      setRejectReason('');
      void load();
    } catch {
      /* toast */
    }
  };

  const submitCreate = async () => {
    const slug = createSlug.trim().toLowerCase();
    const userEmail = createUserEmail.trim();
    if (!slug || !userEmail) return;
    setCreating(true);
    try {
      await cvPlatformAPI.createCvSiteForUser({ slug, userEmail });
      setCreateOpen(false);
      setCreateSlug('');
      setCreateUserEmail('');
      void load();
    } catch {
      /* toast from api */
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101922] text-[#0d141b] dark:text-white font-display overflow-x-hidden min-h-screen flex flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={t('admin.cvSitesPageTitle')}
          icon="language"
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => {}}
        />
        <div className="flex-1 flex justify-center py-6 px-4 md:px-8 overflow-y-auto">
          <div className="max-w-[1200px] flex-1 flex flex-col gap-6 w-full">
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                to="/admin/dashboard"
                className="text-gray-500 dark:text-slate-400 font-medium hover:text-primary dark:hover:text-blue-300 transition-colors"
              >
                {t('admin.admin')}
              </Link>
              <span className="text-gray-500 dark:text-slate-400 font-medium">/</span>
              <span className="text-[#0d141b] dark:text-white font-semibold">{t('admin.cvSitesBreadcrumb')}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
              <div className="flex flex-col gap-2">
                <h1 className="text-[#111418] dark:text-white text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em]">
                  {t('admin.cvSitesHeading')}
                </h1>
                <p className="text-[#4c739a] dark:text-slate-400 text-base font-normal">{t('admin.cvSitesSubtitle')}</p>
              </div>
              <div className="flex items-center gap-2 self-start">
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  {t('admin.cvSitesAddSite')}
                </button>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="flex items-center gap-2 bg-white dark:bg-[#15202b] border border-[#cfdbe7] dark:border-slate-700 text-[#0d141b] dark:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">refresh</span>
                  {t('admin.refresh')}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row flex-wrap gap-4 p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t('admin.cvSitesFilterStatus')}</label>
                <select
                  className="rounded-lg border border-[#cfdbe7] dark:border-slate-600 bg-white dark:bg-slate-900 text-sm px-3 py-2 text-[#0d141b] dark:text-white min-w-[180px]"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {t(o.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t('admin.cvSitesSearchLabel')}</label>
                <input
                  className="rounded-lg border border-[#cfdbe7] dark:border-slate-600 bg-white dark:bg-slate-900 text-sm px-3 py-2 text-[#0d141b] dark:text-white"
                  placeholder={t('admin.cvSitesSearchPlaceholder')}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void load()}
                />
              </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-slate-400">
              {t('admin.cvSitesTotal', { count: total })}
            </p>

            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
              {loading ? (
                <p className="p-6 text-gray-500 dark:text-slate-400">{t('admin.cvSitesLoading')}</p>
              ) : sites.length === 0 ? (
                <p className="p-6 text-gray-500 dark:text-slate-400">{t('admin.cvSitesEmpty')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-slate-900/80 text-gray-600 dark:text-slate-300 border-b border-gray-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3 font-semibold">{t('admin.cvSitesColSlug')}</th>
                        <th className="px-4 py-3 font-semibold">{t('admin.cvSitesColOwner')}</th>
                        <th className="px-4 py-3 font-semibold">{t('admin.cvSitesColStatus')}</th>
                        <th className="px-4 py-3 font-semibold">{t('admin.cvSitesColRequested')}</th>
                        <th className="px-4 py-3 font-semibold text-right">{t('admin.cvSitesColActions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sites.map((s) => (
                        <tr key={s.id} className="border-b border-gray-100 dark:border-slate-700 last:border-0">
                          <td className="px-4 py-3 font-mono text-[#0d141b] dark:text-white">{s.slug}</td>
                          <td className="px-4 py-3">{s.ownerEmail ?? '—'}</td>
                          <td className="px-4 py-3">{s.status}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-slate-400">
                            {s.requestedAt ? new Date(s.requestedAt).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                            {s.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void approve(s.id)}
                                  className="inline-flex items-center px-2 py-1 rounded-md bg-primary text-white text-xs font-medium hover:opacity-90"
                                >
                                  {t('admin.cvSitesApprove')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRejectId(s.id)}
                                  className="inline-flex items-center px-2 py-1 rounded-md bg-red-600 text-white text-xs font-medium hover:opacity-90"
                                >
                                  {t('admin.cvSitesReject')}
                                </button>
                              </>
                            )}
                            {s.status === 'approved' && (
                              <button
                                type="button"
                                onClick={() => void suspend(s.id)}
                                className="inline-flex items-center px-2 py-1 rounded-md border border-gray-300 dark:border-slate-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-slate-700"
                              >
                                {t('admin.cvSitesSuspend')}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {rejectId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-[#111418] dark:text-white mb-3">{t('admin.cvSitesRejectTitle')}</h2>
            <textarea
              className="w-full rounded-lg border border-[#cfdbe7] dark:border-slate-600 bg-white dark:bg-slate-900 text-sm px-3 py-2 text-[#0d141b] dark:text-white min-h-[100px]"
              placeholder={t('admin.cvSitesRejectPlaceholder')}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void confirmReject()}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {t('admin.cvSitesReject')}
              </button>
            </div>
          </div>
        </div>
      )}
      {createOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-[#111418] dark:text-white mb-4">{t('admin.cvSitesAddSiteTitle')}</h2>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t('admin.cvSitesAddSiteUserEmail')}</label>
                <input
                  className="rounded-lg border border-[#cfdbe7] dark:border-slate-600 bg-white dark:bg-slate-900 text-sm px-3 py-2 text-[#0d141b] dark:text-white"
                  value={createUserEmail}
                  onChange={(e) => setCreateUserEmail(e.target.value)}
                  placeholder={t('admin.cvSitesAddSiteUserEmailPlaceholder')}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400">{t('admin.cvSitesColSlug')}</label>
                <input
                  className="rounded-lg border border-[#cfdbe7] dark:border-slate-600 bg-white dark:bg-slate-900 text-sm px-3 py-2 text-[#0d141b] dark:text-white"
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value.toLowerCase())}
                  placeholder={t('admin.cvSitesAddSiteSlugPlaceholder')}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  if (creating) return;
                  setCreateOpen(false);
                  setCreateSlug('');
                  setCreateUserEmail('');
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void submitCreate()}
                disabled={creating || !createSlug.trim() || !createUserEmail.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50"
              >
                {creating ? t('common.processing') : t('admin.cvSitesAddSiteSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCvSitesPage;
