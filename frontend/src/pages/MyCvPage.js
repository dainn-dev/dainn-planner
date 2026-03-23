import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { cvMeAPI } from '../services/api';
import { toast } from '../utils/toast';

const SECTIONS = ['profile', 'portfolio', 'skills', 'experience', 'education', 'certificates', 'services', 'facts', 'testimonials'];
const SLUG_RE = /^[a-z0-9-]{3,40}$/;
const THEMES = [
  { key: 'default', label: 'Light' },
  { key: 'midnight', label: 'Midnight' },
];

const MyCvPage = () => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [site, setSite] = useState(null);
  const [content, setContent] = useState({});
  const [slugInput, setSlugInput] = useState('');
  const [slugError, setSlugError] = useState(null);
  const [requestingSlug, setRequestingSlug] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  const [sectionDraft, setSectionDraft] = useState({});
  const [sectionErrors, setSectionErrors] = useState({});
  const [savingSection, setSavingSection] = useState({});
  const [savingTheme, setSavingTheme] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cvMeAPI.getMySite();
      setSite(data.site ?? null);
      setContent(data.content ?? {});
      if (data.site?.slug) setSlugInput(data.site.slug);
    } catch (err) {
      setError(err.message || 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRequestSite = async (slugVal) => {
    const s = slugVal.trim().toLowerCase();
    if (!SLUG_RE.test(s)) { setSlugError(t('myCv.slugInvalid')); return; }
    setSlugError(null);
    setRequestingSlug(true);
    try {
      await cvMeAPI.requestSite(s);
      toast.success(t('myCv.requestSuccess'));
      await load();
    } catch {
      // error toast auto-fired by apiRequest
    } finally {
      setRequestingSlug(false);
    }
  };

  const renderSiteStatus = () => {
    const inputRow = (labelKey, onSubmit) => (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-600 dark:text-slate-400">{t(labelKey)}</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={slugInput}
            onChange={(e) => { setSlugInput(e.target.value.toLowerCase()); setSlugError(null); }}
            placeholder={t('myCv.slugPlaceholder')}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => onSubmit(slugInput)}
            disabled={requestingSlug}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {requestingSlug ? t('common.processing') : t(site?.status === 'rejected' ? 'myCv.reRequest' : 'myCv.requestSite')}
          </button>
        </div>
        {slugError && <p className="text-xs text-red-500">{slugError}</p>}
      </div>
    );

    if (!site) return inputRow('myCv.noSite', handleRequestSite);

    const statusBadges = {
      pending: (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-sm font-medium">
          <span className="material-symbols-outlined text-base">hourglass_empty</span>
          {t('myCv.statusPending')}
        </span>
      ),
      approved: (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm font-medium">
            <span className="material-symbols-outlined text-base">check_circle</span>
            {t('myCv.statusApproved')}
          </span>
          <span className="text-sm text-gray-500 dark:text-slate-400">
            {t('myCv.visitSite')}: <span className="font-mono">{site.slug}</span>
          </span>
        </div>
      ),
      rejected: (
        <div className="flex flex-col gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm font-medium">
            <span className="material-symbols-outlined text-base">cancel</span>
            {t('myCv.statusRejected')}
          </span>
          {site.rejectionReason && (
            <p className="text-sm text-gray-600 dark:text-slate-400">
              <span className="font-medium">{t('myCv.rejectionReason')}:</span> {site.rejectionReason}
            </p>
          )}
          {inputRow('myCv.noSite', handleRequestSite)}
        </div>
      ),
      suspended: (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-sm font-medium">
          <span className="material-symbols-outlined text-base">block</span>
          {t('myCv.statusSuspended')}
        </span>
      ),
    };

    return statusBadges[site.status] ?? null;
  };

  const handleTheme = async (presetKey) => {
    if (!site || site.status !== 'approved' || savingTheme) return;
    setSavingTheme(true);
    try {
      await cvMeAPI.patchTheme(presetKey);
      setSite((prev) => ({ ...prev, themePresetKey: presetKey }));
    } catch {
      // error toast auto-fired
    } finally {
      setSavingTheme(false);
    }
  };

  const themeDisabled = !site || site.status !== 'approved';

  const renderThemePicker = () => (
    <div>
      <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">{t('myCv.theme')}</h2>
      {themeDisabled && (
        <p className="text-xs text-gray-500 dark:text-slate-500 mb-2">{t('myCv.themeDisabled')}</p>
      )}
      <div className="flex gap-3">
        {THEMES.map((th) => {
          const active = site?.themePresetKey === th.key;
          return (
            <button
              key={th.key}
              aria-disabled={themeDisabled}
              onClick={() => handleTheme(th.key)}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors
                ${themeDisabled ? 'pointer-events-none opacity-50 cursor-default' : 'cursor-pointer'}
                ${active
                  ? 'border-primary text-primary dark:border-blue-400 dark:text-blue-400 bg-blue-50 dark:bg-slate-800'
                  : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:border-primary dark:hover:border-blue-400'
                }`}
            >
              {th.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const toggleSection = (section) => {
    setOpenSection((prev) => {
      if (prev === section) return null;
      const val = content[section];
      const draft = val !== undefined && val !== null
        ? JSON.stringify(val, null, 2)
        : '{}';
      setSectionDraft((d) => ({ ...d, [section]: draft }));
      setSectionErrors((e) => ({ ...e, [section]: null }));
      return section;
    });
  };

  const handleSaveSection = async (section) => {
    const raw = sectionDraft[section] ?? '{}';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setSectionErrors((e) => ({ ...e, [section]: t('myCv.invalidJson') }));
      return;
    }
    setSectionErrors((e) => ({ ...e, [section]: null }));
    setSavingSection((s) => ({ ...s, [section]: true }));
    try {
      await cvMeAPI.putContent(section, parsed);
      setContent((prev) => ({ ...prev, [section]: parsed }));
      toast.success(t('myCv.saveSuccess'));
    } catch {
      // error toast auto-fired
    } finally {
      setSavingSection((s) => ({ ...s, [section]: false }));
    }
  };

  const renderAccordion = () => (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">{t('myCv.content')}</h2>
      {SECTIONS.map((section) => {
        const isOpen = openSection === section;
        return (
          <div key={section} className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection(section)}
              className="w-full flex items-center justify-between px-4 py-3 text-left bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="text-sm font-medium text-gray-800 dark:text-white">
                {t(`myCv.sections.${section}`)}
              </span>
              <span className="material-symbols-outlined text-gray-400 dark:text-slate-500 text-base">
                {isOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700">
                <textarea
                  value={sectionDraft[section] ?? '{}'}
                  onChange={(e) => {
                    setSectionDraft((d) => ({ ...d, [section]: e.target.value }));
                    setSectionErrors((err) => ({ ...err, [section]: null }));
                  }}
                  rows={12}
                  spellCheck={false}
                  className="w-full mt-3 px-3 py-2 font-mono text-xs border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                />
                {sectionErrors[section] && (
                  <p className="mt-1 text-xs text-red-500">{sectionErrors[section]}</p>
                )}
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => handleSaveSection(section)}
                    disabled={savingSection[section]}
                    className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {savingSection[section] ? t('common.processing') : t('myCv.saveSection')}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (loading) return (
    <div className="flex h-screen bg-gray-50 dark:bg-background-dark">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 dark:text-slate-400">{t('common.loading')}</p>
        </main>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex h-screen bg-gray-50 dark:bg-background-dark">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 flex items-center justify-center flex-col gap-3">
          <p className="text-red-500">{t('myCv.loadError')}</p>
          <button onClick={load} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">{t('myCv.retry')}</button>
        </main>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background-dark">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto flex flex-col gap-6">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('myCv.title')}</h1>

            <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">{t('myCv.siteStatus')}</h2>
              {renderSiteStatus()}
            </section>

            <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
              {renderThemePicker()}
            </section>

            <section>
              {renderAccordion()}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MyCvPage;
