import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MobileSidebarDrawer from '../components/MobileSidebarDrawer';
import { cvMeAPI, getAvatarFullUrl } from '../services/api';
import { toast } from '../utils/toast';
import { formatDateTime } from '../utils/dateFormat';
import CvIconPicker from '../components/CvIconPicker';
import CvSocialPlatformPicker from '../components/CvSocialPlatformPicker';
import { DefaultTemplate } from '../components/lexkit/DefaultTemplate';
import CvDdMmDateField from '../components/CvDdMmDateField';
import { getCvRootDomain } from '../utils/tenantHost';

const SECTIONS = [
  'profile',
  'facts',
  'skills',
  'experience',
  'education',
  'certificates',
  'portfolio',
  'services',
  'testimonials',
];

/** Material icon per section — mirrors Settings sidebar nav pattern */
const CV_SECTION_ICONS = {
  profile: 'person',
  portfolio: 'folder_special',
  skills: 'construction',
  experience: 'work',
  education: 'school',
  certificates: 'verified',
  services: 'room_service',
  facts: 'info',
  testimonials: 'reviews',
};
const SLUG_RE = /^[a-z0-9-]{3,40}$/;
/** Stored in CV JSON as English strings for site compatibility */
const FREELANCE_STATUS_OPTIONS = [
  { value: 'Available', labelKey: 'myCv.profileFields.freelanceOptionAvailable' },
  { value: 'Open 2nd Job', labelKey: 'myCv.profileFields.freelanceOptionOpenSecond' },
  { value: 'No', labelKey: 'myCv.profileFields.freelanceOptionNo' },
];

const PROFILE_FIELDS = [
  'freelance',
  'name',
  'title',
  'birthday',
  'phone',
  'email',
  'website',
  'image',
  'degree',
  'location',
  'about',
];
/** Shown in the left column beside the profile photo card */
const PROFILE_FIELDS_HEADER = ['freelance', 'name', 'title', 'birthday'];
const PROFILE_FIELDS_GRID = PROFILE_FIELDS.filter(
  (f) => f !== 'image' && !PROFILE_FIELDS_HEADER.includes(f)
);
/** Profile grid: single-column on md (e.g. address line) */
const PROFILE_FIELDS_GRID_FULL_WIDTH = new Set(['location']);
const PORTFOLIO_CATEGORY_OPTIONS = ['Web', 'APP', 'CMS'];
const FACT_ITEM_FIELDS = ['icon', 'count', 'title', 'description'];
const SERVICE_ITEM_FIELDS = ['icon', 'title', 'description'];
/** Must match `cv-next/lib/constants/fact-icons.ts` keys */
const FACT_ICON_NAMES = [
  'Smile', 'FileText', 'Headphones', 'User', 'Star', 'Heart', 'Camera', 'Coffee', 'Book', 'Code',
  'Briefcase', 'Award', 'Check', 'Clock', 'Cloud', 'Download', 'Edit', 'Eye', 'Gift', 'Globe',
  'Key', 'Lock', 'Mail', 'Map', 'Music', 'Phone', 'Search', 'Settings', 'Shield', 'ShoppingCart',
  'Tag', 'Trash2', 'Upload', 'Zap',
];
const FACT_ICON_OPTIONS = [...FACT_ICON_NAMES].sort((a, b) => a.localeCompare(b));
/** Must match `cv-next/lib/constants/service-icons.ts` keys */
const SERVICE_ICON_NAMES = ['Briefcase', 'ClipboardList', 'BarChart', 'Binoculars', 'Sun', 'Calendar'];
const SERVICE_ICON_OPTIONS = [...SERVICE_ICON_NAMES].sort((a, b) => a.localeCompare(b));
/** Map lexical icon names to Material Symbols font names */
const SERVICE_ICON_TO_MATERIAL = {
  Briefcase: 'work',
  ClipboardList: 'assignment',
  BarChart: 'bar_chart',
  Binoculars: 'search',
  Sun: 'wb_sunny',
  Calendar: 'calendar_today',
};
/** `id` is stored on each item but hidden in the Education form */
const EDUCATION_ITEM_FIELDS = ['degree', 'school', 'startYear', 'endYear', 'location', 'description'];
/** `id` is stored on each item (see handleAddExperience) but not shown in the form */
/** `id` is stored on each item but hidden in the Certificates form */
const CERTIFICATE_ITEM_FIELDS = ['title', 'issuer', 'date', 'description'];

/** Shared CV editor field styles — calmer contrast, larger tap targets, consistent radius */
const CV_LABEL = 'block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-slate-400 mb-1.5';
const CV_INPUT =
  'w-full min-h-[42px] px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200/90 dark:border-slate-600 bg-white dark:bg-slate-900 text-zinc-900 dark:text-white shadow-sm placeholder:text-zinc-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary/80 transition-shadow';
/** Top profile row (Availability … Birthday) — ~8px radius like reference UI */
const CV_INPUT_TOP =
  'w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-zinc-900 dark:text-white shadow-sm placeholder:text-zinc-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary/80 transition-shadow';
const CV_INPUT_NESTED =
  'w-full min-h-[42px] px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200/90 dark:border-slate-600 bg-zinc-50/90 dark:bg-slate-800/90 text-zinc-900 dark:text-white shadow-sm placeholder:text-zinc-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary/80 transition-shadow';
const CV_TEXTAREA = `${CV_INPUT} min-h-[96px] resize-y`;
const CV_TEXTAREA_NESTED = `${CV_INPUT_NESTED} min-h-[96px] resize-y`;
/** Section block — spacing only (no bordered panel) */
const CV_SECTION_BLOCK = 'flex flex-col gap-4';
const CV_ITEM_CARD =
  'rounded-xl border border-zinc-200/80 dark:border-slate-600/70 p-4 bg-white dark:bg-slate-900 shadow-sm';
const CV_BTN_ADD =
  'inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white shadow-sm hover:bg-blue-600 hover:shadow active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all';
const CV_BTN_REMOVE =
  'inline-flex items-center justify-center min-h-[40px] px-3 py-2 rounded-xl text-xs font-medium border border-red-200/90 dark:border-red-900/50 text-red-600 dark:text-red-300 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/35 transition-colors shrink-0';
const CV_BTN_SAVE =
  'inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white shadow-md hover:bg-blue-600 hover:shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all';

const MyCvPage = () => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [site, setSite] = useState(null);
  const [content, setContent] = useState({});
  const [slugInput, setSlugInput] = useState('');
  const [slugError, setSlugError] = useState(null);
  const [requestingSlug, setRequestingSlug] = useState(false);
  const [activeContentSection, setActiveContentSection] = useState('profile');
  const [sectionDraft, setSectionDraft] = useState({});
  const [sectionErrors, setSectionErrors] = useState({});
  const [savingSection, setSavingSection] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadingCvAvatar, setUploadingCvAvatar] = useState(false);
  const [uploadingCvBgImage, setUploadingCvBgImage] = useState(false);
  const [uploadingTestimonialImageIndex, setUploadingTestimonialImageIndex] = useState(null);
  const [portfolioModal, setPortfolioModal] = useState({ open: false, mode: 'add', index: null, draft: null });
  const [uploadingPortfolioCover, setUploadingPortfolioCover] = useState(false);
  const [serviceModal, setServiceModal] = useState({ open: false, mode: 'add', index: null, draft: null });
  const [testimonialModal, setTestimonialModal] = useState({ open: false, mode: 'add', index: null, draft: null });
  const [uploadingTestimonialModalImage, setUploadingTestimonialModalImage] = useState(false);
  const [certificateModal, setCertificateModal] = useState({ open: false, mode: 'add', index: null, draft: null });
  const cvAvatarFileRef = useRef(null);
  const cvBgImageFileRef = useRef(null);
  const testimonialImageFileRefs = useRef({});
  const portfolioCoverFileRef = useRef(null);
  const testimonialModalImageFileRef = useRef(null);

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

  /** Hydrate JSON draft for the active section when content loads or section changes */
  useEffect(() => {
    if (loading) return;
    setSectionDraft((d) => {
      const section = activeContentSection;
      const next = { ...d };
      if (next[section] === undefined) {
        const val = content[section];
        next[section] = val !== undefined && val !== null
          ? JSON.stringify(val, null, 2)
          : '{}';
      }
      /** Keep profile draft in sync so Experience "Intro" (`resumeIntro`) can save with work history */
      if (next.profile === undefined && content.profile !== undefined && content.profile !== null) {
        next.profile = JSON.stringify(content.profile, null, 2);
      }
      return next;
    });
  }, [loading, content, activeContentSection]);

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
    const cvBaseDomain = getCvRootDomain();

    const inputRow = (labelKey, onSubmit) => (
      <div className={CV_SECTION_BLOCK}>
        <p className="text-sm text-zinc-600 dark:text-slate-400 mb-3 leading-relaxed">{t(labelKey)}</p>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-stretch">
          <div className="relative flex-1 min-w-0">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-slate-500 text-[20px]" aria-hidden>
              link
            </span>
            <input
              type="text"
              value={slugInput}
              onChange={(e) => { setSlugInput(e.target.value.toLowerCase()); setSlugError(null); }}
              placeholder={t('myCv.slugPlaceholder')}
              autoComplete="off"
              className={`${CV_INPUT} pl-10`}
            />
          </div>
          <button
            type="button"
            onClick={() => onSubmit(slugInput)}
            disabled={requestingSlug}
            className={`${CV_BTN_SAVE} w-full sm:w-auto shrink-0`}
          >
            {requestingSlug ? t('common.processing') : t(site?.status === 'rejected' ? 'myCv.reRequest' : 'myCv.requestSite')}
          </button>
        </div>
        {slugInput.trim() && cvBaseDomain && (
          <p className="text-xs text-zinc-400 dark:text-slate-500 mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm shrink-0">globe</span>
            <span className="font-mono">{slugInput.trim()}.{cvBaseDomain}</span>
          </p>
        )}
        {slugError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1" role="alert">
            <span className="material-symbols-outlined text-sm shrink-0">error</span>
            {slugError}
          </p>
        )}
      </div>
    );

    if (!site) return inputRow('myCv.noSite', handleRequestSite);

    const siteDomain = (() => {
      const candidates = [site?.url, process.env.REACT_APP_CV_BASE_URL].filter(Boolean);
      for (const candidate of candidates) {
        try {
          const host = new URL(candidate).hostname;
          if (!host) continue;
          const slugPrefix = `${site.slug}.`;
          return host.startsWith(slugPrefix) ? host.slice(slugPrefix.length) : host;
        } catch {
          // ignore
        }
      }
      return getCvRootDomain();
    })();
    const slugDisplay = `${site.slug}.${siteDomain}`;
    const siteHref = site.url || `https://${slugDisplay}`;

    const renderDetailsGrid = () => (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-4 mt-1 border-t border-gray-100 dark:border-slate-700 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-0.5">
            {t('myCv.slugLabel')}
          </p>
          <p className="text-gray-800 dark:text-slate-200 font-mono break-all">{site.slug}</p>
        </div>
        {site.requestedAt && (
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-0.5 sm:text-right">
              {t('myCv.requestedAt')}
            </p>
            <p className="text-gray-800 dark:text-slate-200">{formatDateTime(site.requestedAt)}</p>
          </div>
        )}
        {site.reviewedAt && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-0.5">
              {t('myCv.reviewedAt')}
            </p>
            <p className="text-gray-800 dark:text-slate-200">{formatDateTime(site.reviewedAt)}</p>
          </div>
        )}
        {site.url && (
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-0.5">
              {t('myCv.publicUrl')}
            </p>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary dark:text-blue-300 hover:underline font-mono text-sm break-all"
            >
              {site.url}
            </a>
          </div>
        )}
      </div>
    );

    const statusBadges = {
      pending: (
        <div className="flex flex-col gap-0">
          {renderDetailsGrid()}
        </div>
      ),
      approved: (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm font-medium">
              <span className="material-symbols-outlined text-base">check_circle</span>
              {t('myCv.statusApproved')}
            </span>
            <span className="text-sm text-gray-500 dark:text-slate-400">
              {t('myCv.visitSite')}:{" "}
              <a
                href={siteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-primary dark:text-blue-300 hover:underline"
              >
                {slugDisplay}
              </a>
            </span>
          </div>
          {renderDetailsGrid()}
        </div>
      ),
      rejected: (
        <div className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm font-medium">
            <span className="material-symbols-outlined text-base">cancel</span>
            {t('myCv.statusRejected')}
          </span>
          {site.rejectionReason && (
            <p className="text-sm text-gray-600 dark:text-slate-400 rounded-lg bg-red-50/80 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 px-3 py-2">
              <span className="font-medium">{t('myCv.rejectionReason')}:</span> {site.rejectionReason}
            </p>
          )}
          {renderDetailsGrid()}
          {inputRow('myCv.noSite', handleRequestSite)}
        </div>
      ),
      suspended: (
        <div className="flex flex-col gap-0">
          <span className="inline-flex w-fit items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-sm font-medium">
            <span className="material-symbols-outlined text-base">block</span>
            {t('myCv.statusSuspended')}
          </span>
          {renderDetailsGrid()}
        </div>
      ),
    };

    return statusBadges[site.status] ?? null;
  };

  const selectContentSection = (section) => {
    setActiveContentSection(section);
    setSectionErrors((e) => ({ ...e, [section]: null }));
    setSectionDraft((d) => {
      if (d[section] !== undefined) return d;
      const val = content[section];
      const draft = val !== undefined && val !== null
        ? JSON.stringify(val, null, 2)
        : '{}';
      return { ...d, [section]: draft };
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
    if (section === 'education' || section === 'experience' || section === 'certificates') {
      parsed = Array.isArray(parsed) ? parsed : [];
    }
    setSectionErrors((e) => ({ ...e, [section]: null }));
    setSavingSection((s) => ({ ...s, [section]: true }));
    try {
      if (section === 'experience') {
        const profileRaw = sectionDraft.profile;
        if (typeof profileRaw === 'string') {
          try {
            const profileParsed = JSON.parse(profileRaw);
            if (profileParsed && typeof profileParsed === 'object') {
              await cvMeAPI.putContent('profile', profileParsed);
              setContent((prev) => ({ ...prev, profile: profileParsed }));
            }
          } catch {
            // ignore invalid profile draft; still save experience
          }
        }
      }
      await cvMeAPI.putContent(section, parsed);
      setContent((prev) => ({ ...prev, [section]: parsed }));
      setSectionDraft((d) => ({ ...d, [section]: JSON.stringify(parsed, null, 2) }));
      toast.success(t('myCv.saveSuccess'));
    } catch {
      // error toast auto-fired
    } finally {
      setSavingSection((s) => ({ ...s, [section]: false }));
    }
  };

  const getParsedSectionDraft = useCallback((section) => {
    const raw = sectionDraft[section];
    if (typeof raw !== 'string') return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }, [sectionDraft]);

  const updateSectionDraft = useCallback((section, fallbackValue, updater) => {
    setSectionDraft((d) => {
      const currentRaw = d[section];
      let parsed = {};
      if (typeof currentRaw === 'string') {
        try {
          const candidate = JSON.parse(currentRaw);
          if (candidate && typeof candidate === 'object') parsed = candidate;
        } catch {
          parsed = {};
        }
      } else if (fallbackValue && typeof fallbackValue === 'object') {
        parsed = fallbackValue;
      }
      const next = updater(parsed);
      return { ...d, [section]: JSON.stringify(next, null, 2) };
    });
    setSectionErrors((err) => ({ ...err, [section]: null }));
  }, []);

  const updateProfileDraft = useCallback((updater) => {
    updateSectionDraft('profile', content.profile, updater);
  }, [content.profile, updateSectionDraft]);

  const handleProfileFieldChange = (field, value) => {
    updateProfileDraft((current) => ({ ...current, [field]: value }));
  };

  const handleCvAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('settings.fileSizeError'));
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
      toast.error(t('settings.fileTypeError'));
      return;
    }
    setUploadingCvAvatar(true);
    try {
      const result = await cvMeAPI.uploadImage(file);
      const path = result?.url ?? '';
      if (path) {
        handleProfileFieldChange('image', path);
        // Auto-save the profile section so the photo persists without a manual Save click
        const currentRaw = typeof sectionDraft.profile === 'string' ? sectionDraft.profile : '{}';
        let currentProfile = {};
        try { currentProfile = JSON.parse(currentRaw); } catch { /* ignore */ }
        const savedProfile = { ...currentProfile, image: path };
        try {
          await cvMeAPI.putContent('profile', savedProfile);
          setContent((prev) => ({ ...prev, profile: savedProfile }));
        } catch {
          // error toast auto-fired by apiRequest; draft still updated so manual Save still works
        }
      }
    } catch {
      // error toast from apiRequest
    } finally {
      setUploadingCvAvatar(false);
    }
  };

  const handleCvBgImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('settings.fileSizeError'));
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
      toast.error(t('settings.fileTypeError'));
      return;
    }
    setUploadingCvBgImage(true);
    try {
      const result = await cvMeAPI.uploadImage(file);
      const path = result?.url ?? '';
      if (path) {
        handleProfileFieldChange('backgroundImage', path);
        const currentRaw = typeof sectionDraft.profile === 'string' ? sectionDraft.profile : '{}';
        let currentProfile = {};
        try { currentProfile = JSON.parse(currentRaw); } catch { /* ignore */ }
        const savedProfile = { ...currentProfile, backgroundImage: path };
        try {
          await cvMeAPI.putContent('profile', savedProfile);
          setContent((prev) => ({ ...prev, profile: savedProfile }));
        } catch {
          // error toast auto-fired by apiRequest; draft still updated so manual Save still works
        }
      }
    } catch {
      // error toast from apiRequest
    } finally {
      setUploadingCvBgImage(false);
    }
  };

  const handleProfileSocialChange = (index, key, value) => {
    updateProfileDraft((current) => {
      const socials = Array.isArray(current.socials) ? [...current.socials] : [];
      const target = socials[index] && typeof socials[index] === 'object' ? socials[index] : {};
      socials[index] = { ...target, [key]: value };
      return { ...current, socials };
    });
  };

  const handleAddProfileSocial = () => {
    updateProfileDraft((current) => {
      const socials = Array.isArray(current.socials) ? [...current.socials] : [];
      socials.push({ platform: '', url: '' });
      return { ...current, socials };
    });
  };

  const handleRemoveProfileSocial = (index) => {
    updateProfileDraft((current) => {
      const socials = Array.isArray(current.socials) ? [...current.socials] : [];
      socials.splice(index, 1);
      return { ...current, socials };
    });
  };

  const updatePortfolioDraft = useCallback((updater) => {
    updateSectionDraft('portfolio', content.portfolio, updater);
  }, [content.portfolio, updateSectionDraft]);

  const handlePortfolioIntroChange = (key, value) => {
    updatePortfolioDraft((current) => ({
      ...current,
      intro: {
        ...(current.intro && typeof current.intro === 'object' ? current.intro : {}),
        [key]: value,
      },
    }));
  };

  const handleAddPortfolioItem = () => {
    const newItem = {
      id: `portfolio-${Date.now()}`,
      title: '',
      category: '',
      imageUrl: '',
      detailsUrl: '',
      client: '',
      date: '',
      url: '',
      description: '',
      images: [],
    };
    setPortfolioModal({ open: true, mode: 'add', index: null, draft: newItem });
  };

  const handleEditPortfolioItem = (index) => {
    const portfolioDraft = getParsedSectionDraft('portfolio');
    const items = Array.isArray(portfolioDraft?.items) ? portfolioDraft.items : [];
    const item = items[index];
    if (item) {
      setPortfolioModal({ open: true, mode: 'edit', index, draft: { ...item } });
    }
  };

  const handleSavePortfolioModal = () => {
    const { mode, index, draft } = portfolioModal;
    if (!draft) return;

    updatePortfolioDraft((current) => {
      const items = Array.isArray(current.items) ? [...current.items] : [];
      if (mode === 'add') {
        items.push(draft);
      } else if (mode === 'edit' && index !== null) {
        items[index] = draft;
      }
      return { ...current, items };
    });

    setPortfolioModal({ open: false, mode: 'add', index: null, draft: null });
  };

  const handleClosePortfolioModal = () => {
    setPortfolioModal({ open: false, mode: 'add', index: null, draft: null });
  };

  const handlePortfolioCoverFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('settings.fileSizeError'));
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
      toast.error(t('settings.fileTypeError'));
      return;
    }
    setUploadingPortfolioCover(true);
    try {
      const result = await cvMeAPI.uploadImage(file);
      console.log('[portfolio cover] upload result:', result);
      const path = result?.url ?? '';
      console.log('[portfolio cover] extracted path:', path);
      if (path) {
        handlePortfolioModalFieldChange('imageUrl', path);
        console.log('[portfolio cover] updated imageUrl to:', path);
      } else {
        console.log('[portfolio cover] no path extracted from result');
      }
    } catch (err) {
      console.error('[portfolio cover] upload error:', err);
      // error toast from apiRequest
    } finally {
      setUploadingPortfolioCover(false);
    }
  };

  const handlePortfolioModalFieldChange = (key, value) => {
    setPortfolioModal((prev) => ({
      ...prev,
      draft: { ...prev.draft, [key]: value },
    }));
  };

  const handleRemovePortfolioItem = (index) => {
    updatePortfolioDraft((current) => {
      const items = Array.isArray(current.items) ? [...current.items] : [];
      items.splice(index, 1);
      return { ...current, items };
    });
  };

  const updateSkillsDraft = useCallback((updater) => {
    updateSectionDraft('skills', content.skills, updater);
  }, [content.skills, updateSectionDraft]);

  const handleSkillsIntroChange = (key, value) => {
    updateSkillsDraft((current) => ({
      ...current,
      intro: {
        ...(current.intro && typeof current.intro === 'object' ? current.intro : {}),
        [key]: value,
      },
    }));
  };

  const handleTechnicalSkillChange = (index, key, value) => {
    updateSkillsDraft((current) => {
      const technicalSkills = Array.isArray(current.technicalSkills) ? [...current.technicalSkills] : [];
      const target = technicalSkills[index] && typeof technicalSkills[index] === 'object' ? technicalSkills[index] : {};
      technicalSkills[index] = { ...target, [key]: value };
      return { ...current, technicalSkills };
    });
  };

  const handleAddTechnicalSkill = () => {
    updateSkillsDraft((current) => {
      const technicalSkills = Array.isArray(current.technicalSkills) ? [...current.technicalSkills] : [];
      technicalSkills.push({ category: '', details: '' });
      return { ...current, technicalSkills };
    });
  };

  const handleRemoveTechnicalSkill = (index) => {
    updateSkillsDraft((current) => {
      const technicalSkills = Array.isArray(current.technicalSkills) ? [...current.technicalSkills] : [];
      technicalSkills.splice(index, 1);
      return { ...current, technicalSkills };
    });
  };

  const handleSoftSkillChange = (index, value) => {
    updateSkillsDraft((current) => {
      const softSkills = Array.isArray(current.softSkills) ? [...current.softSkills] : [];
      softSkills[index] = value;
      return { ...current, softSkills };
    });
  };

  const handleAddSoftSkill = () => {
    updateSkillsDraft((current) => {
      const softSkills = Array.isArray(current.softSkills) ? [...current.softSkills] : [];
      softSkills.push('');
      return { ...current, softSkills };
    });
  };

  const handleRemoveSoftSkill = (index) => {
    updateSkillsDraft((current) => {
      const softSkills = Array.isArray(current.softSkills) ? [...current.softSkills] : [];
      softSkills.splice(index, 1);
      return { ...current, softSkills };
    });
  };

  const updateTestimonialsDraft = useCallback((updater) => {
    updateSectionDraft('testimonials', content.testimonials, updater);
  }, [content.testimonials, updateSectionDraft]);

  const handleTestimonialsIntroChange = (key, value) => {
    updateTestimonialsDraft((current) => ({
      ...current,
      intro: {
        ...(current.intro && typeof current.intro === 'object' ? current.intro : {}),
        [key]: value,
      },
    }));
  };

  const handleTestimonialChange = (index, key, value) => {
    updateTestimonialsDraft((current) => {
      const testimonials = Array.isArray(current.testimonials) ? [...current.testimonials] : [];
      const target = testimonials[index] && typeof testimonials[index] === 'object' ? testimonials[index] : {};
      testimonials[index] = { ...target, [key]: value };
      return { ...current, testimonials };
    });
  };

  const handleAddTestimonial = () => {
    const newItem = {
      id: `testimonial-${Date.now()}`,
      name: '',
      position: '',
      text: '',
      imageUrl: '',
    };
    setTestimonialModal({ open: true, mode: 'add', index: null, draft: newItem });
  };

  const handleEditTestimonial = (index) => {
    const testimonialsDraft = getParsedSectionDraft('testimonials');
    const items = Array.isArray(testimonialsDraft?.testimonials) ? testimonialsDraft.testimonials : [];
    const item = items[index];
    if (item) {
      setTestimonialModal({ open: true, mode: 'edit', index, draft: { ...item } });
    }
  };

  const handleSaveTestimonialModal = () => {
    const { mode, index, draft } = testimonialModal;
    if (!draft) return;

    updateTestimonialsDraft((current) => {
      const testimonials = Array.isArray(current.testimonials) ? [...current.testimonials] : [];
      if (mode === 'add') {
        testimonials.push(draft);
      } else if (mode === 'edit' && index !== null) {
        testimonials[index] = draft;
      }
      return { ...current, testimonials };
    });

    setTestimonialModal({ open: false, mode: 'add', index: null, draft: null });
  };

  const handleCloseTestimonialModal = () => {
    setTestimonialModal({ open: false, mode: 'add', index: null, draft: null });
  };

  const handleTestimonialModalFieldChange = (key, value) => {
    setTestimonialModal((prev) => ({
      ...prev,
      draft: { ...prev.draft, [key]: value },
    }));
  };

  const handleTestimonialModalImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('settings.fileSizeError'));
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
      toast.error(t('settings.fileTypeError'));
      return;
    }
    setUploadingTestimonialModalImage(true);
    try {
      const result = await cvMeAPI.uploadImage(file);
      const path = result?.url ?? '';
      if (path) {
        handleTestimonialModalFieldChange('imageUrl', path);
      }
    } catch {
      // error toast from apiRequest
    } finally {
      setUploadingTestimonialModalImage(false);
    }
  };

  const handleRemoveTestimonial = (index) => {
    updateTestimonialsDraft((current) => {
      const testimonials = Array.isArray(current.testimonials) ? [...current.testimonials] : [];
      testimonials.splice(index, 1);
      return { ...current, testimonials };
    });
  };

  const handleTestimonialImageFileChange = async (index, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('settings.fileSizeError'));
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
      toast.error(t('settings.fileTypeError'));
      return;
    }
    setUploadingTestimonialImageIndex(index);
    try {
      const url = await cvMeAPI.uploadImage(file);
      const path = url?.url ?? '';
      if (path) handleTestimonialChange(index, 'imageUrl', path);
    } catch {
      // error toast auto-fired by apiRequest
    } finally {
      setUploadingTestimonialImageIndex(null);
    }
  };

  const updateFactsDraft = useCallback((updater) => {
    updateSectionDraft('facts', content.facts, updater);
  }, [content.facts, updateSectionDraft]);

  const handleFactsIntroChange = (key, value) => {
    updateFactsDraft((current) => ({
      ...current,
      intro: {
        ...(current.intro && typeof current.intro === 'object' ? current.intro : {}),
        [key]: value,
      },
    }));
  };

  const handleFactChange = (index, key, value) => {
    updateFactsDraft((current) => {
      const facts = Array.isArray(current.facts) ? [...current.facts] : [];
      const target = facts[index] && typeof facts[index] === 'object' ? facts[index] : {};
      let nextVal = value;
      if (key === 'count') {
        const n = value === '' ? 0 : Number(value);
        nextVal = Number.isNaN(n) ? 0 : n;
      }
      facts[index] = { ...target, [key]: nextVal };
      return { ...current, facts };
    });
  };

  const handleAddFact = () => {
    updateFactsDraft((current) => {
      const facts = Array.isArray(current.facts) ? [...current.facts] : [];
      facts.push({ icon: '', count: 0, title: '', description: '' });
      return { ...current, facts };
    });
  };

  const handleRemoveFact = (index) => {
    updateFactsDraft((current) => {
      const facts = Array.isArray(current.facts) ? [...current.facts] : [];
      facts.splice(index, 1);
      return { ...current, facts };
    });
  };

  const updateServicesDraft = useCallback((updater) => {
    updateSectionDraft('services', content.services, updater);
  }, [content.services, updateSectionDraft]);

  const handleServicesIntroChange = (key, value) => {
    updateServicesDraft((current) => ({
      ...current,
      intro: {
        ...(current.intro && typeof current.intro === 'object' ? current.intro : {}),
        [key]: value,
      },
    }));
  };

  const handleServiceItemChange = (index, key, value) => {
    updateServicesDraft((current) => {
      const servicesList = Array.isArray(current.services) ? [...current.services] : [];
      const target = servicesList[index] && typeof servicesList[index] === 'object' ? servicesList[index] : {};
      servicesList[index] = { ...target, [key]: value };
      return { ...current, services: servicesList };
    });
  };

  const handleAddServiceItem = () => {
    const newItem = {
      id: `service-${Date.now()}`,
      icon: '',
      title: '',
      description: '',
    };
    setServiceModal({ open: true, mode: 'add', index: null, draft: newItem });
  };

  const handleEditServiceItem = (index) => {
    const servicesDraft = getParsedSectionDraft('services');
    const items = Array.isArray(servicesDraft?.services) ? servicesDraft.services : [];
    const item = items[index];
    if (item) {
      setServiceModal({ open: true, mode: 'edit', index, draft: { ...item } });
    }
  };

  const handleSaveServiceModal = () => {
    const { mode, index, draft } = serviceModal;
    if (!draft) return;

    updateServicesDraft((current) => {
      const servicesList = Array.isArray(current.services) ? [...current.services] : [];
      if (mode === 'add') {
        servicesList.push(draft);
      } else if (mode === 'edit' && index !== null) {
        servicesList[index] = draft;
      }
      return { ...current, services: servicesList };
    });

    setServiceModal({ open: false, mode: 'add', index: null, draft: null });
  };

  const handleCloseServiceModal = () => {
    setServiceModal({ open: false, mode: 'add', index: null, draft: null });
  };

  const handleServiceModalFieldChange = (key, value) => {
    setServiceModal((prev) => ({
      ...prev,
      draft: { ...prev.draft, [key]: value },
    }));
  };

  const handleRemoveServiceItem = (index) => {
    updateServicesDraft((current) => {
      const servicesList = Array.isArray(current.services) ? [...current.services] : [];
      servicesList.splice(index, 1);
      return { ...current, services: servicesList };
    });
  };

  const updateExperienceDraft = useCallback((updater) => {
    setSectionDraft((d) => {
      const currentRaw = d.experience;
      let parsed = [];
      if (typeof currentRaw === 'string') {
        try {
          const candidate = JSON.parse(currentRaw);
          parsed = Array.isArray(candidate) ? [...candidate] : [];
        } catch {
          parsed = [];
        }
      } else if (Array.isArray(content.experience)) {
        parsed = [...content.experience];
      }
      const next = updater(parsed);
      const normalized = Array.isArray(next) ? next : [];
      return { ...d, experience: JSON.stringify(normalized, null, 2) };
    });
    setSectionErrors((err) => ({ ...err, experience: null }));
  }, [content.experience]);

  const handleExperienceChange = (index, key, value) => {
    updateExperienceDraft((list) => {
      const next = [...list];
      const target = next[index] && typeof next[index] === 'object' ? next[index] : {};
      next[index] = { ...target, [key]: value };
      return next;
    });
  };

  const handleAddExperience = () => {
    updateExperienceDraft((list) => [
      ...list,
      {
        id: `exp-${Date.now()}`,
        title: '',
        company: '',
        startYear: '',
        endYear: '',
        location: '',
        description: '',
      },
    ]);
  };

  const handleRemoveExperience = (index) => {
    updateExperienceDraft((list) => {
      const next = [...list];
      next.splice(index, 1);
      return next;
    });
  };

  const updateEducationDraft = useCallback((updater) => {
    setSectionDraft((d) => {
      const currentRaw = d.education;
      let parsed = [];
      if (typeof currentRaw === 'string') {
        try {
          const candidate = JSON.parse(currentRaw);
          parsed = Array.isArray(candidate) ? [...candidate] : [];
        } catch {
          parsed = [];
        }
      } else if (Array.isArray(content.education)) {
        parsed = [...content.education];
      }
      const next = updater(parsed);
      const normalized = Array.isArray(next) ? next : [];
      return { ...d, education: JSON.stringify(normalized, null, 2) };
    });
    setSectionErrors((err) => ({ ...err, education: null }));
  }, [content.education]);

  const handleEducationChange = (index, key, value) => {
    updateEducationDraft((list) => {
      const next = [...list];
      const target = next[index] && typeof next[index] === 'object' ? next[index] : {};
      next[index] = { ...target, [key]: value };
      return next;
    });
  };

  const handleAddEducation = () => {
    updateEducationDraft((list) => [
      ...list,
      {
        id: `edu-${Date.now()}`,
        degree: '',
        school: '',
        startYear: '',
        endYear: '',
        location: '',
        description: '',
      },
    ]);
  };

  const handleRemoveEducation = (index) => {
    updateEducationDraft((list) => {
      const next = [...list];
      next.splice(index, 1);
      return next;
    });
  };

  const updateCertificatesDraft = useCallback((updater) => {
    setSectionDraft((d) => {
      const currentRaw = d.certificates;
      let parsed = [];
      if (typeof currentRaw === 'string') {
        try {
          const candidate = JSON.parse(currentRaw);
          parsed = Array.isArray(candidate) ? [...candidate] : [];
        } catch {
          parsed = [];
        }
      } else if (Array.isArray(content.certificates)) {
        parsed = [...content.certificates];
      }
      const next = updater(parsed);
      const normalized = Array.isArray(next) ? next : [];
      return { ...d, certificates: JSON.stringify(normalized, null, 2) };
    });
    setSectionErrors((err) => ({ ...err, certificates: null }));
  }, [content.certificates]);

  const handleCertificateChange = (index, key, value) => {
    updateCertificatesDraft((list) => {
      const next = [...list];
      if (index < 0 || index >= next.length) return next;
      const target = next[index] && typeof next[index] === 'object' ? next[index] : {};
      next[index] = { ...target, [key]: value };
      return next;
    });
  };

  const handleAddCertificate = () => {
    const newItem = {
      id: `cert-${Date.now()}`,
      title: '',
      issuer: '',
      date: '',
      description: '',
    };
    setCertificateModal({ open: true, mode: 'add', index: null, draft: newItem });
  };

  const handleEditCertificate = (index) => {
    const certificatesParsed = getParsedSectionDraft('certificates');
    const items = Array.isArray(certificatesParsed) ? certificatesParsed : [];
    const item = items[index];
    if (item) {
      setCertificateModal({ open: true, mode: 'edit', index, draft: { ...item } });
    }
  };

  const handleSaveCertificateModal = () => {
    const { mode, index, draft } = certificateModal;
    if (!draft) return;

    updateCertificatesDraft((list) => {
      const next = [...list];
      if (mode === 'add') {
        next.push(draft);
      } else if (mode === 'edit' && index !== null) {
        next[index] = draft;
      }
      return next;
    });

    setCertificateModal({ open: false, mode: 'add', index: null, draft: null });
  };

  const handleCloseCertificateModal = () => {
    setCertificateModal({ open: false, mode: 'add', index: null, draft: null });
  };

  const handleCertificateModalFieldChange = (key, value) => {
    setCertificateModal((prev) => ({
      ...prev,
      draft: { ...prev.draft, [key]: value },
    }));
  };

  const handleRemoveCertificate = (index) => {
    updateCertificatesDraft((list) => {
      const next = [...list];
      next.splice(index, 1);
      return next;
    });
  };

  const renderCvContentEditor = () => {
    const section = activeContentSection;
    const isProfileSection = section === 'profile';
    const isPortfolioSection = section === 'portfolio';
    const isSkillsSection = section === 'skills';
    const isTestimonialsSection = section === 'testimonials';
    const isFactsSection = section === 'facts';
    const isServicesSection = section === 'services';
    const isExperienceSection = section === 'experience';
    const isEducationSection = section === 'education';
    const isCertificatesSection = section === 'certificates';
    const profileDraft = isProfileSection ? getParsedSectionDraft('profile') : null;
    const profileSocials = Array.isArray(profileDraft?.socials) ? profileDraft.socials : [];
    /** Rich HTML via Lexical (same as other CV sections) */
    const profileRichHtmlFields = new Set(['about']);

    const renderProfileFieldRow = (field, { topRow = false } = {}) => {
      const colClass =
        profileRichHtmlFields.has(field) || PROFILE_FIELDS_GRID_FULL_WIDTH.has(field) ? 'md:col-span-2' : '';
      const inputClass = topRow ? CV_INPUT_TOP : CV_INPUT;
      return (
        <div key={field} className={colClass}>
          <label className={CV_LABEL} htmlFor={`cv-profile-${field}`}>
            {t(`myCv.profileFields.${field}`)}
          </label>
          {profileRichHtmlFields.has(field) ? (
            <div className="rounded-xl border border-zinc-200/90 dark:border-slate-600 bg-white dark:bg-slate-800/90 shadow-sm hover:border-zinc-300 dark:hover:border-slate-500 transition-colors overflow-hidden">
              <DefaultTemplate
                key={`cv-profile-${field}`}
                className="cv-lexkit-html-field"
                placeholder={t('myCv.profileFields.aboutPlaceholder')}
                onReady={(methods) => {
                  const aboutHtml = typeof profileDraft?.about === 'string' ? profileDraft.about : '';
                  const legacyMainIntro =
                    typeof profileDraft?.mainIntro === 'string' ? profileDraft.mainIntro : '';
                  const html = aboutHtml || legacyMainIntro;
                  if (html) methods.injectHTML(html);
                }}
                onHtmlChange={(html) => handleProfileFieldChange('about', html)}
              />
            </div>
          ) : field === 'freelance' ? (() => {
            const raw = typeof profileDraft?.freelance === 'string' ? profileDraft.freelance : '';
            const known = FREELANCE_STATUS_OPTIONS.some((o) => o.value === raw);
            return (
              <select
                id="cv-profile-freelance"
                value={known ? raw : ''}
                onChange={(e) => handleProfileFieldChange('freelance', e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">{t('myCv.profileFields.freelancePlaceholder')}</option>
                {FREELANCE_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
                {!known && raw ? (
                  <option value={raw}>{raw}</option>
                ) : null}
              </select>
            );
          })() : (
            <input
              id={`cv-profile-${field}`}
              type="text"
              value={typeof profileDraft?.[field] === 'string' ? profileDraft[field] : ''}
              onChange={(e) => handleProfileFieldChange(field, e.target.value)}
              className={inputClass}
            />
          )}
        </div>
      );
    };

    const renderProfileAvatarCard = () => {
      const rawImg = typeof profileDraft?.image === 'string' ? profileDraft.image : '';
      const previewUrl = getAvatarFullUrl(rawImg);
      return (
        <div
          className="flex w-full flex-col rounded-lg border border-zinc-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-5 sm:px-6 sm:py-7 md:px-5 md:py-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none"
          role="group"
          aria-labelledby="cv-profile-photo-heading"
        >
          <p
            id="cv-profile-photo-heading"
            className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-slate-400 mb-4 md:mb-5 text-left md:text-center"
          >
            {t('myCv.profileFields.profilePhotoSection')}
          </p>
          <div className="flex flex-col items-stretch md:items-center gap-4 md:gap-5">
            <div className="relative shrink-0 flex justify-center">
              <div
                className="group relative flex h-[120px] w-[120px] md:h-[132px] md:w-[132px] items-center justify-center overflow-hidden rounded-full bg-white dark:bg-slate-950 border border-zinc-100 dark:border-slate-700 shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
                aria-hidden={previewUrl ? undefined : true}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[48px] md:text-[52px] text-zinc-300 dark:text-slate-500 font-light" aria-hidden>
                    person
                  </span>
                )}
                {!uploadingCvAvatar ? (
                  <button
                    type="button"
                    onClick={() => cvAvatarFileRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-zinc-900/0 group-hover:bg-zinc-900/35 dark:group-hover:bg-black/45 transition-colors"
                    aria-label={t('myCv.uploadAvatar')}
                    title={t('myCv.uploadAvatar')}
                  >
                    <span
                      className={`material-symbols-outlined text-white text-3xl transition-opacity ${
                        previewUrl ? 'opacity-0 group-hover:opacity-100' : 'opacity-90'
                      }`}
                      aria-hidden
                    >
                      edit
                    </span>
                  </button>
                ) : null}
                {uploadingCvAvatar ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-zinc-900/50 dark:bg-black/45 backdrop-blur-[1px]"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <span className="material-symbols-outlined text-white text-4xl animate-spin" aria-hidden>
                      progress_activity
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex w-full max-w-none md:max-w-[220px] md:mx-auto flex-col gap-2.5">
              <input
                ref={cvAvatarFileRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif"
                className="sr-only"
                onChange={handleCvAvatarFileChange}
              />
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-slate-500 leading-relaxed text-left md:text-center max-w-none md:max-w-[220px] md:mx-auto">
              {t('myCv.profileFields.avatarHint')}
            </p>
          </div>
        </div>
      );
    };
    const renderProfileBgImageCard = () => {
      const rawBg = typeof profileDraft?.backgroundImage === 'string' ? profileDraft.backgroundImage : '';
      const previewUrl = rawBg ? getAvatarFullUrl(rawBg) : '';
      return (
        <div
          className="flex w-full flex-col rounded-lg border border-zinc-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-5 sm:px-6 sm:py-7 md:px-5 md:py-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none"
          role="group"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-slate-400 mb-4">
            {t('myCv.profileFields.backgroundImageSection')}
          </p>
          <div className="flex flex-col gap-4">
            <div
              className="group relative w-full h-[120px] rounded-lg overflow-hidden border border-zinc-200 dark:border-slate-600 bg-zinc-100 dark:bg-slate-800 cursor-pointer"
              onClick={() => !uploadingCvBgImage && cvBgImageFileRef.current?.click()}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-[40px] text-zinc-300 dark:text-slate-500">image</span>
                </div>
              )}
              {!uploadingCvBgImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/0 group-hover:bg-zinc-900/35 dark:group-hover:bg-black/45 transition-colors rounded-lg">
                  <span className={`material-symbols-outlined text-white text-3xl transition-opacity ${previewUrl ? 'opacity-0 group-hover:opacity-100' : 'opacity-80'}`}>
                    edit
                  </span>
                </div>
              )}
              {uploadingCvBgImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 dark:bg-black/45 backdrop-blur-[1px] rounded-lg">
                  <span className="material-symbols-outlined text-white text-4xl animate-spin">progress_activity</span>
                </div>
              )}
            </div>
            <input
              ref={cvBgImageFileRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif"
              className="sr-only"
              onChange={handleCvBgImageFileChange}
            />
            <p className="text-[11px] text-zinc-500 dark:text-slate-500 leading-relaxed">
              {t('myCv.profileFields.backgroundImageHint')}
            </p>
          </div>
        </div>
      );
    };

    const portfolioDraft = isPortfolioSection ? getParsedSectionDraft('portfolio') : null;
    const portfolioIntro = portfolioDraft?.intro && typeof portfolioDraft.intro === 'object' ? portfolioDraft.intro : {};
    const portfolioItems = Array.isArray(portfolioDraft?.items) ? portfolioDraft.items : [];
    const skillsDraft = isSkillsSection ? getParsedSectionDraft('skills') : null;
    const skillsIntro = skillsDraft?.intro && typeof skillsDraft.intro === 'object' ? skillsDraft.intro : {};
    const technicalSkills = Array.isArray(skillsDraft?.technicalSkills) ? skillsDraft.technicalSkills : [];
    const softSkills = Array.isArray(skillsDraft?.softSkills) ? skillsDraft.softSkills : [];
    const testimonialsDraft = isTestimonialsSection ? getParsedSectionDraft('testimonials') : null;
    const testimonialsIntro = testimonialsDraft?.intro && typeof testimonialsDraft.intro === 'object' ? testimonialsDraft.intro : {};
    const testimonialsItems = Array.isArray(testimonialsDraft?.testimonials) ? testimonialsDraft.testimonials : [];
    const factsDraft = isFactsSection ? getParsedSectionDraft('facts') : null;
    const factsIntro = factsDraft?.intro && typeof factsDraft.intro === 'object' ? factsDraft.intro : {};
    const factsItems = Array.isArray(factsDraft?.facts) ? factsDraft.facts : [];
    const servicesDraft = isServicesSection ? getParsedSectionDraft('services') : null;
    const servicesIntro = servicesDraft?.intro && typeof servicesDraft.intro === 'object' ? servicesDraft.intro : {};
    const serviceItems = Array.isArray(servicesDraft?.services) ? servicesDraft.services : [];
    const educationParsed = isEducationSection ? getParsedSectionDraft('education') : null;
    const educationItems = isEducationSection && Array.isArray(educationParsed) ? educationParsed : [];
    const experienceParsed = isExperienceSection ? getParsedSectionDraft('experience') : null;
    const experienceItems = isExperienceSection && Array.isArray(experienceParsed) ? experienceParsed : [];
    const experienceProfileDraft = isExperienceSection
      ? (() => {
        const raw = sectionDraft.profile;
        if (typeof raw === 'string') {
          try {
            const p = JSON.parse(raw);
            if (p && typeof p === 'object') return p;
          } catch {
            // fall through
          }
        }
        return content.profile && typeof content.profile === 'object' ? content.profile : {};
      })()
      : null;
    const certificatesParsed = isCertificatesSection ? getParsedSectionDraft('certificates') : null;
    const certificateItems = isCertificatesSection && Array.isArray(certificatesParsed) ? certificatesParsed : [];

    return (
      <div className="flex flex-col gap-5 md:gap-8">
        <div className="max-w-3xl w-full">
          {isProfileSection ? (
            <div className="flex flex-col gap-5">
              {/* DOM order: fields then photo — same top-to-bottom flow on mobile as left-to-right on desktop */}
              <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)] md:gap-x-10 md:gap-y-0 md:items-center">
                <div className="flex flex-col gap-5 min-w-0 w-full">
                  {PROFILE_FIELDS_HEADER.map((field) => renderProfileFieldRow(field, { topRow: true }))}
                </div>
                <div className="w-full shrink-0 min-w-0">
                  {renderProfileAvatarCard()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {PROFILE_FIELDS_GRID.map((field) => renderProfileFieldRow(field))}
              </div>

              {renderProfileBgImageCard()}

              <div className={CV_SECTION_BLOCK}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                    {t('myCv.profileFields.socials')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddProfileSocial}
                    className={CV_BTN_ADD}
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    {t('myCv.profileFields.addSocial')}
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {profileSocials.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">{t('myCv.profileFields.noSocials')}</p>
                  )}
                  {profileSocials.map((social, index) => (
                    <div key={`social-${index}`} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 items-end">
                      <div>
                        <label className="text-xs font-medium text-zinc-500 dark:text-slate-400 mb-1 block">
                          {t('myCv.profileFields.socialPlatform')}
                        </label>
                        <CvSocialPlatformPicker
                          value={typeof social?.platform === 'string' ? social.platform : ''}
                          onChange={(next) => handleProfileSocialChange(index, 'platform', next)}
                          placeholder={t('myCv.profileFields.socialPlatformPlaceholder')}
                          className={CV_INPUT}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-zinc-500 dark:text-slate-400 mb-1 block">
                          {t('myCv.profileFields.socialUrl')}
                        </label>
                        <input
                          type="text"
                          value={typeof social?.url === 'string' ? social.url : ''}
                          onChange={(e) => handleProfileSocialChange(index, 'url', e.target.value)}
                          className={CV_INPUT}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveProfileSocial(index)}
                        className={CV_BTN_REMOVE}
                      >
                        {t('common.remove')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : isPortfolioSection ? (
            <div className="flex flex-col gap-5">
              <div className={CV_SECTION_BLOCK}>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                  Portfolio
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className={CV_LABEL}>
                      {t('myCv.portfolioFields.introDescription')}
                    </label>
                    <textarea
                      value={typeof portfolioIntro.description === 'string' ? portfolioIntro.description : ''}
                      onChange={(e) => handlePortfolioIntroChange('description', e.target.value)}
                      rows={3}
                      className={CV_TEXTAREA}
                    />
                  </div>
                </div>
              </div>

              <div className={CV_SECTION_BLOCK}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                    {t('myCv.portfolioFields.items')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddPortfolioItem}
                    className={CV_BTN_ADD}
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    {t('myCv.portfolioFields.addItem')}
                  </button>
                </div>
                {portfolioItems.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-slate-400">{t('myCv.portfolioFields.noItems')}</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-slate-600/70 bg-white dark:bg-slate-900 shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50/90 dark:bg-slate-800/90 border-b border-zinc-200 dark:border-slate-700">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                            {t('myCv.portfolioFields.tableHeaderImage')}
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                            {t('myCv.portfolioFields.tableHeaderTitle')}
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                            {t('myCv.portfolioFields.tableHeaderCategory')}
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                            {t('myCv.portfolioFields.tableHeaderDate')}
                          </th>
                          <th className="text-right px-4 py-3 font-semibold text-zinc-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                            {t('myCv.portfolioFields.tableHeaderActions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-slate-700">
                        {portfolioItems.map((item, index) => {
                          const rawImg = typeof item?.imageUrl === 'string' ? item.imageUrl : '';
                          const previewUrl = getAvatarFullUrl(rawImg);
                          return (
                            <tr key={item?.id || `portfolio-item-${index}`} className="hover:bg-zinc-50/50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-200 dark:border-slate-600 bg-zinc-100 dark:bg-slate-800 shrink-0">
                                  {previewUrl ? (
                                    <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-slate-500">
                                      <span className="material-symbols-outlined text-xl" aria-hidden>image</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-zinc-900 dark:text-slate-100 font-medium">
                                {item?.title || '—'}
                              </td>
                              <td className="px-4 py-3 text-zinc-600 dark:text-slate-400">
                                {item?.category || '—'}
                              </td>
                              <td className="px-4 py-3 text-zinc-600 dark:text-slate-400">
                                {item?.date || '—'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditPortfolioItem(index)}
                                    className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200/90 dark:border-slate-600 text-zinc-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
                                    aria-label={t('common.edit')}
                                  >
                                    <span className="material-symbols-outlined text-base mr-1">edit</span>
                                    {t('common.edit')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePortfolioItem(index)}
                                    className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200/90 dark:border-red-900/50 text-red-600 dark:text-red-300 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/35 transition-colors"
                                    aria-label={t('common.remove')}
                                  >
                                    <span className="material-symbols-outlined text-base mr-1">delete</span>
                                    {t('common.remove')}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Portfolio Item Modal */}
              {portfolioModal.open && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                  onClick={handleClosePortfolioModal}
                >
                  <div
                    className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                        {portfolioModal.mode === 'add' ? t('myCv.portfolioFields.modalTitleAdd') : t('myCv.portfolioFields.modalTitleEdit')}
                      </h3>
                      <button
                        type="button"
                        onClick={handleClosePortfolioModal}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label={t('common.close')}
                      >
                        <span className="material-symbols-outlined text-xl">close</span>
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 lg:gap-6">
                        <div className="flex flex-col gap-4">
                          <div>
                            <label className={CV_LABEL}>
                              {t('myCv.portfolioFields.title')}
                            </label>
                            <input
                              type="text"
                              value={typeof portfolioModal.draft?.title === 'string' ? portfolioModal.draft.title : ''}
                              onChange={(e) => handlePortfolioModalFieldChange('title', e.target.value)}
                              className={CV_INPUT}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className={CV_LABEL}>
                                {t('myCv.portfolioFields.category')}
                              </label>
                              <select
                                value={typeof portfolioModal.draft?.category === 'string' ? portfolioModal.draft.category : ''}
                                onChange={(e) => handlePortfolioModalFieldChange('category', e.target.value)}
                                className={`${CV_INPUT} cursor-pointer`}
                              >
                                <option value="">Select category…</option>
                                {PORTFOLIO_CATEGORY_OPTIONS.map((name) => (
                                  <option key={name} value={name}>{name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className={CV_LABEL}>
                                {t('myCv.portfolioFields.date')}
                              </label>
                              <input
                                type="text"
                                value={typeof portfolioModal.draft?.date === 'string' ? portfolioModal.draft.date : ''}
                                onChange={(e) => handlePortfolioModalFieldChange('date', e.target.value)}
                                className={CV_INPUT}
                              />
                            </div>
                          </div>
                          <div>
                            <label className={CV_LABEL}>
                              {t('myCv.portfolioFields.client')}
                            </label>
                            <input
                              type="text"
                              value={typeof portfolioModal.draft?.client === 'string' ? portfolioModal.draft.client : ''}
                              onChange={(e) => handlePortfolioModalFieldChange('client', e.target.value)}
                              className={CV_INPUT}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className={CV_LABEL}>
                            {t('myCv.portfolioFields.coverImage')}
                          </label>
                          <div
                            className="group relative w-full aspect-square rounded-lg overflow-hidden border border-zinc-200 dark:border-slate-600 bg-zinc-100 dark:bg-slate-800 cursor-pointer"
                            onClick={() => {
                              if (!uploadingPortfolioCover) {
                                portfolioCoverFileRef.current?.click();
                              }
                            }}
                          >
                            {portfolioModal.draft?.imageUrl ? (
                              <img
                                src={getAvatarFullUrl(portfolioModal.draft.imageUrl)}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-[48px] text-zinc-300 dark:text-slate-500">image</span>
                              </div>
                            )}
                            {!uploadingPortfolioCover && (
                              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/0 group-hover:bg-zinc-900/35 dark:group-hover:bg-black/45 transition-colors">
                                <span className={`material-symbols-outlined text-white text-3xl transition-opacity ${portfolioModal.draft?.imageUrl ? 'opacity-0 group-hover:opacity-100' : 'opacity-80'}`}>
                                  edit
                                </span>
                              </div>
                            )}
                            {uploadingPortfolioCover && (
                              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 dark:bg-black/45 backdrop-blur-[1px]">
                                <span className="material-symbols-outlined text-white text-4xl animate-spin">progress_activity</span>
                              </div>
                            )}
                          </div>
                          <input
                            ref={portfolioCoverFileRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif"
                            className="sr-only"
                            onChange={handlePortfolioCoverFileChange}
                          />
                          <p className="text-[11px] text-zinc-500 dark:text-slate-500 leading-relaxed">
                            {t('myCv.portfolioFields.coverImageHint')}
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className={CV_LABEL}>
                          {t('myCv.portfolioFields.url')}
                        </label>
                        <input
                          type="text"
                          value={typeof portfolioModal.draft?.url === 'string' ? portfolioModal.draft.url : ''}
                          onChange={(e) => handlePortfolioModalFieldChange('url', e.target.value)}
                          className={CV_INPUT}
                        />
                      </div>
                      <div>
                        <label className={CV_LABEL}>
                          {t('myCv.portfolioFields.description')}
                        </label>
                        <div className="rounded-xl border border-zinc-200/90 dark:border-slate-600 bg-white dark:bg-slate-800/90 shadow-sm hover:border-zinc-300 dark:hover:border-slate-500 transition-colors overflow-hidden">
                          <DefaultTemplate
                            key={portfolioModal.draft?.id ? `modal-desc-${portfolioModal.draft.id}` : 'modal-desc-new'}
                            className="cv-lexkit-html-field"
                            placeholder={t('myCv.portfolioFields.descriptionPlaceholder')}
                            onReady={(methods) => {
                              const html = typeof portfolioModal.draft?.description === 'string' ? portfolioModal.draft.description : '';
                              if (html) methods.injectHTML(html);
                            }}
                            onHtmlChange={(html) => handlePortfolioModalFieldChange('description', html)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={handleClosePortfolioModal}
                        className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-semibold border border-zinc-200/90 dark:border-slate-600 text-zinc-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePortfolioModal}
                        className={CV_BTN_SAVE}
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : isSkillsSection ? (
            <div className="flex flex-col gap-5">
              <div className={CV_SECTION_BLOCK}>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                  Skills
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className={CV_LABEL}>
                      {t('myCv.skillsFields.introDescription')}
                    </label>
                    <textarea
                      value={typeof skillsIntro.description === 'string' ? skillsIntro.description : ''}
                      onChange={(e) => handleSkillsIntroChange('description', e.target.value)}
                      rows={3}
                      className={CV_TEXTAREA}
                    />
                  </div>
                </div>
              </div>

              <div className={CV_SECTION_BLOCK}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                    {t('myCv.skillsFields.technicalSkills')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddTechnicalSkill}
                    className={CV_BTN_ADD}
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    {t('myCv.skillsFields.addTechnicalSkill')}
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {technicalSkills.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">{t('myCv.skillsFields.noTechnicalSkills')}</p>
                  )}
                  {technicalSkills.map((item, index) => (
                    <div key={`technical-skill-${index}`} className={CV_ITEM_CARD}>
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
                          <div className="min-w-0 flex-1">
                            <label className={CV_LABEL}>
                              {t('myCv.skillsFields.category')}
                            </label>
                            <input
                              type="text"
                              value={typeof item?.category === 'string' ? item.category : ''}
                              onChange={(e) => handleTechnicalSkillChange(index, 'category', e.target.value)}
                              className={CV_INPUT_NESTED}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveTechnicalSkill(index)}
                            className={`${CV_BTN_REMOVE} shrink-0`}
                          >
                            {t('common.remove')}
                          </button>
                        </div>
                        <div className="w-full">
                          <label className={CV_LABEL}>
                            {t('myCv.skillsFields.details')}
                          </label>
                          <input
                            type="text"
                            value={typeof item?.details === 'string' ? item.details : ''}
                            onChange={(e) => handleTechnicalSkillChange(index, 'details', e.target.value)}
                            className={CV_INPUT_NESTED}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={CV_SECTION_BLOCK}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                    {t('myCv.skillsFields.softSkills')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddSoftSkill}
                    className={CV_BTN_ADD}
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    {t('myCv.skillsFields.addSoftSkill')}
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {softSkills.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">{t('myCv.skillsFields.noSoftSkills')}</p>
                  )}
                  {softSkills.map((value, index) => (
                    <div key={`soft-skill-${index}`} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                      <input
                        type="text"
                        value={typeof value === 'string' ? value : ''}
                        onChange={(e) => handleSoftSkillChange(index, e.target.value)}
                        className={CV_INPUT}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSoftSkill(index)}
                        className={CV_BTN_REMOVE}
                      >
                        {t('common.remove')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : isTestimonialsSection ? (
            <div className="flex flex-col gap-5">
              <div className={CV_SECTION_BLOCK}>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                  Testimonials
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className={CV_LABEL}>
                      {t('myCv.testimonialsFields.introDescription')}
                    </label>
                    <textarea
                      value={typeof testimonialsIntro.description === 'string' ? testimonialsIntro.description : ''}
                      onChange={(e) => handleTestimonialsIntroChange('description', e.target.value)}
                      rows={3}
                      className={CV_TEXTAREA}
                    />
                  </div>
                </div>
              </div>

              <div className={CV_SECTION_BLOCK}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                    {t('myCv.testimonialsFields.items')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddTestimonial}
                    className={CV_BTN_ADD}
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    {t('myCv.testimonialsFields.addItem')}
                  </button>
                </div>
                {testimonialsItems.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-slate-400">{t('myCv.testimonialsFields.noItems')}</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-slate-600/70 bg-white dark:bg-slate-900 shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50/90 dark:bg-slate-800/90 border-b border-zinc-200 dark:border-slate-700">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                            {t('myCv.testimonialsFields.tableHeaderImage')}
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                            {t('myCv.testimonialsFields.tableHeaderName')}
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                            {t('myCv.testimonialsFields.tableHeaderPosition')}
                          </th>
                          <th className="text-right px-4 py-3 font-semibold text-zinc-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                            {t('myCv.testimonialsFields.tableHeaderActions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-slate-700">
                        {testimonialsItems.map((item, index) => {
                          const rawImg = typeof item?.imageUrl === 'string' ? item.imageUrl : '';
                          const previewUrl = getAvatarFullUrl(rawImg);
                          return (
                            <tr key={item?.id || `testimonial-item-${index}`} className="hover:bg-zinc-50/50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="w-16 h-16 rounded-full overflow-hidden border border-zinc-200 dark:border-slate-600 bg-zinc-100 dark:bg-slate-800 shrink-0">
                                  {previewUrl ? (
                                    <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-slate-500">
                                      <span className="material-symbols-outlined text-xl" aria-hidden>person</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-zinc-900 dark:text-slate-100 font-medium">
                                {item?.name || '—'}
                              </td>
                              <td className="px-4 py-3 text-zinc-600 dark:text-slate-400">
                                {item?.position || '—'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditTestimonial(index)}
                                    className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200/90 dark:border-slate-600 text-zinc-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
                                    aria-label={t('common.edit')}
                                  >
                                    <span className="material-symbols-outlined text-base mr-1">edit</span>
                                    {t('common.edit')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTestimonial(index)}
                                    className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200/90 dark:border-red-900/50 text-red-600 dark:text-red-300 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/35 transition-colors"
                                    aria-label={t('common.remove')}
                                  >
                                    <span className="material-symbols-outlined text-base mr-1">delete</span>
                                    {t('common.remove')}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Testimonial Modal */}
              {testimonialModal.open && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                  onClick={handleCloseTestimonialModal}
                >
                  <div
                    className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                        {testimonialModal.mode === 'add' ? t('myCv.testimonialsFields.modalTitleAdd') : t('myCv.testimonialsFields.modalTitleEdit')}
                      </h3>
                      <button
                        type="button"
                        onClick={handleCloseTestimonialModal}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label={t('common.close')}
                      >
                        <span className="material-symbols-outlined text-xl">close</span>
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 lg:gap-6">
                        <div className="flex flex-col gap-4">
                          <div>
                            <label className={CV_LABEL}>
                              {t('myCv.testimonialsFields.name')}
                            </label>
                            <input
                              type="text"
                              value={typeof testimonialModal.draft?.name === 'string' ? testimonialModal.draft.name : ''}
                              onChange={(e) => handleTestimonialModalFieldChange('name', e.target.value)}
                              className={CV_INPUT}
                            />
                          </div>
                          <div>
                            <label className={CV_LABEL}>
                              {t('myCv.testimonialsFields.position')}
                            </label>
                            <input
                              type="text"
                              value={typeof testimonialModal.draft?.position === 'string' ? testimonialModal.draft.position : ''}
                              onChange={(e) => handleTestimonialModalFieldChange('position', e.target.value)}
                              className={CV_INPUT}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className={CV_LABEL}>
                            {t('myCv.testimonialsFields.imageUrl')}
                          </label>
                          <div
                            className="group relative w-full h-24 rounded-full overflow-hidden border border-zinc-200 dark:border-slate-600 bg-zinc-100 dark:bg-slate-800 cursor-pointer"
                            onClick={() => {
                              if (!uploadingTestimonialModalImage) {
                                testimonialModalImageFileRef.current?.click();
                              }
                            }}
                          >
                            {testimonialModal.draft?.imageUrl ? (
                              <img
                                src={getAvatarFullUrl(testimonialModal.draft.imageUrl)}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-[48px] text-zinc-300 dark:text-slate-500">person</span>
                              </div>
                            )}
                            {!uploadingTestimonialModalImage && (
                              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/0 group-hover:bg-zinc-900/35 dark:group-hover:bg-black/45 transition-colors">
                                <span className={`material-symbols-outlined text-white text-3xl transition-opacity ${testimonialModal.draft?.imageUrl ? 'opacity-0 group-hover:opacity-100' : 'opacity-80'}`}>
                                  edit
                                </span>
                              </div>
                            )}
                            {uploadingTestimonialModalImage && (
                              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 dark:bg-black/45 backdrop-blur-[1px]">
                                <span className="material-symbols-outlined text-white text-4xl animate-spin">progress_activity</span>
                              </div>
                            )}
                          </div>
                          <input
                            ref={testimonialModalImageFileRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif"
                            className="sr-only"
                            onChange={handleTestimonialModalImageFileChange}
                          />
                          <p className="text-[11px] text-zinc-500 dark:text-slate-500 leading-relaxed">
                            {t('myCv.testimonialsFields.imageHint')}
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className={CV_LABEL}>
                          {t('myCv.testimonialsFields.text')}
                        </label>
                        <textarea
                          value={typeof testimonialModal.draft?.text === 'string' ? testimonialModal.draft.text : ''}
                          onChange={(e) => handleTestimonialModalFieldChange('text', e.target.value)}
                          rows={4}
                          className={CV_TEXTAREA}
                        />
                      </div>
                    </div>
                    <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={handleCloseTestimonialModal}
                        className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-semibold border border-zinc-200/90 dark:border-slate-600 text-zinc-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveTestimonialModal}
                        className={CV_BTN_SAVE}
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : isFactsSection ? (
            <div className="flex flex-col gap-5">
              <div className={CV_SECTION_BLOCK}>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                  Facts
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className={CV_LABEL}>
                      {t('myCv.factsFields.introDescription')}
                    </label>
                    <textarea
                      value={typeof factsIntro.description === 'string' ? factsIntro.description : ''}
                      onChange={(e) => handleFactsIntroChange('description', e.target.value)}
                      rows={3}
                      className={CV_TEXTAREA}
                    />
                  </div>
                </div>
              </div>

              <div className={CV_SECTION_BLOCK}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                    {t('myCv.factsFields.items')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddFact}
                    className={CV_BTN_ADD}
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    {t('myCv.factsFields.addItem')}
                  </button>
                </div>
                <div className="flex flex-col gap-4">
                  {factsItems.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">{t('myCv.factsFields.noItems')}</p>
                  )}
                  {factsItems.map((item, index) => (
                    <div key={`fact-${index}`} className={CV_ITEM_CARD}>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                          {t('myCv.factsFields.itemTitle', { index: index + 1 })}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemoveFact(index)}
                          className={CV_BTN_REMOVE}
                        >
                          {t('common.remove')}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {FACT_ITEM_FIELDS.map((field) => (
                          <div
                            key={`${field}-${index}`}
                            className={field === 'description' || field === 'title' ? 'md:col-span-2' : ''}
                          >
                            <label className={CV_LABEL}>
                              {t(`myCv.factsFields.${field}`)}
                            </label>
                            {field === 'icon' ? (
                              <CvIconPicker
                                value={typeof item?.icon === 'string' ? item.icon : ''}
                                onChange={(next) => handleFactChange(index, 'icon', next)}
                                optionNames={FACT_ICON_OPTIONS}
                                placeholder={t('myCv.factsFields.iconPlaceholder')}
                                className={CV_INPUT_NESTED}
                              />
                            ) : field === 'count' ? (
                              <input
                                type="number"
                                inputMode="numeric"
                                value={(() => {
                                  const c = item?.count;
                                  if (c === undefined || c === null || c === '') return '';
                                  const n = Number(c);
                                  return Number.isNaN(n) ? '' : n;
                                })()}
                                onChange={(e) => handleFactChange(index, 'count', e.target.value)}
                                className={CV_INPUT_NESTED}
                              />
                            ) : field === 'description' ? (
                              <textarea
                                value={typeof item?.[field] === 'string' ? item[field] : ''}
                                onChange={(e) => handleFactChange(index, field, e.target.value)}
                                rows={3}
                                className={CV_TEXTAREA_NESTED}
                              />
                            ) : (
                              <input
                                type="text"
                                value={typeof item?.[field] === 'string' ? item[field] : ''}
                                onChange={(e) => handleFactChange(index, field, e.target.value)}
                                className={CV_INPUT_NESTED}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : isServicesSection ? (
            <div className="flex flex-col gap-5">
              <div className={CV_SECTION_BLOCK}>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                  Services
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className={CV_LABEL}>
                      {t('myCv.servicesFields.introDescription')}
                    </label>
                    <textarea
                      value={typeof servicesIntro.description === 'string' ? servicesIntro.description : ''}
                      onChange={(e) => handleServicesIntroChange('description', e.target.value)}
                      rows={3}
                      className={CV_TEXTAREA}
                    />
                  </div>
                </div>
              </div>

              <div className={CV_SECTION_BLOCK}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                    {t('myCv.servicesFields.items')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddServiceItem}
                    className={CV_BTN_ADD}
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    {t('myCv.servicesFields.addItem')}
                  </button>
                </div>
                {serviceItems.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-slate-400">{t('myCv.servicesFields.noItems')}</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-slate-600/70 bg-white dark:bg-slate-900 shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50/90 dark:bg-slate-800/90 border-b border-zinc-200 dark:border-slate-700">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                            {t('myCv.servicesFields.tableHeaderIcon')}
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                            {t('myCv.servicesFields.tableHeaderTitle')}
                          </th>
                          <th className="text-right px-4 py-3 font-semibold text-zinc-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                            {t('myCv.servicesFields.tableHeaderActions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-slate-700">
                        {serviceItems.map((item, index) => (
                          <tr key={item?.id || `service-item-${index}`} className="hover:bg-zinc-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-slate-800 text-zinc-600 dark:text-slate-400">
                                {item?.icon ? (
                                  <span className="material-symbols-outlined text-xl">{SERVICE_ICON_TO_MATERIAL[item.icon] || 'help'}</span>
                                ) : (
                                  <span className="material-symbols-outlined text-xl">help</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-zinc-900 dark:text-slate-100 font-medium">
                              {item?.title || '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditServiceItem(index)}
                                  className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200/90 dark:border-slate-600 text-zinc-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
                                  aria-label={t('common.edit')}
                                >
                                  <span className="material-symbols-outlined text-base mr-1">edit</span>
                                  {t('common.edit')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveServiceItem(index)}
                                  className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200/90 dark:border-red-900/50 text-red-600 dark:text-red-300 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/35 transition-colors"
                                  aria-label={t('common.remove')}
                                >
                                  <span className="material-symbols-outlined text-base mr-1">delete</span>
                                  {t('common.remove')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Service Item Modal */}
              {serviceModal.open && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                  onClick={handleCloseServiceModal}
                >
                  <div
                    className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                        {serviceModal.mode === 'add' ? t('myCv.servicesFields.modalTitleAdd') : t('myCv.servicesFields.modalTitleEdit')}
                      </h3>
                      <button
                        type="button"
                        onClick={handleCloseServiceModal}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label={t('common.close')}
                      >
                        <span className="material-symbols-outlined text-xl">close</span>
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className={CV_LABEL}>
                          {t('myCv.servicesFields.icon')}
                        </label>
                        <CvIconPicker
                          value={typeof serviceModal.draft?.icon === 'string' ? serviceModal.draft.icon : ''}
                          onChange={(next) => handleServiceModalFieldChange('icon', next)}
                          optionNames={SERVICE_ICON_OPTIONS}
                          placeholder={t('myCv.servicesFields.iconPlaceholder')}
                          className={CV_INPUT}
                        />
                      </div>
                      <div>
                        <label className={CV_LABEL}>
                          {t('myCv.servicesFields.title')}
                        </label>
                        <input
                          type="text"
                          value={typeof serviceModal.draft?.title === 'string' ? serviceModal.draft.title : ''}
                          onChange={(e) => handleServiceModalFieldChange('title', e.target.value)}
                          className={CV_INPUT}
                        />
                      </div>
                      <div>
                        <label className={CV_LABEL}>
                          {t('myCv.servicesFields.description')}
                        </label>
                        <textarea
                          value={typeof serviceModal.draft?.description === 'string' ? serviceModal.draft.description : ''}
                          onChange={(e) => handleServiceModalFieldChange('description', e.target.value)}
                          rows={4}
                          className={CV_TEXTAREA}
                        />
                      </div>
                    </div>
                    <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={handleCloseServiceModal}
                        className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-semibold border border-zinc-200/90 dark:border-slate-600 text-zinc-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveServiceModal}
                        className={CV_BTN_SAVE}
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : isExperienceSection ? (
            <div className="flex flex-col gap-5">
              <div className={CV_SECTION_BLOCK}>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                  Experience
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className={CV_LABEL} htmlFor="cv-experience-resume-intro">
                      {t('myCv.experienceFields.introDescription')}
                    </label>
                    <textarea
                      id="cv-experience-resume-intro"
                      value={
                        typeof experienceProfileDraft?.resumeIntro === 'string' ? experienceProfileDraft.resumeIntro : ''
                      }
                      onChange={(e) => handleProfileFieldChange('resumeIntro', e.target.value)}
                      rows={3}
                      className={CV_TEXTAREA}
                    />
                  </div>
                </div>
              </div>
              <div className={CV_SECTION_BLOCK}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                    {t('myCv.experienceFields.items')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddExperience}
                    className={CV_BTN_ADD}
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    {t('myCv.experienceFields.addItem')}
                  </button>
                </div>
                <div className="flex flex-col gap-4">
                  {experienceItems.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">{t('myCv.experienceFields.noItems')}</p>
                  )}
                  {experienceItems.map((item, index) => (
                    <div key={item?.id || `experience-${index}`} className={CV_ITEM_CARD}>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                          {t('myCv.experienceFields.itemTitle', { index: index + 1 })}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemoveExperience(index)}
                          className={CV_BTN_REMOVE}
                        >
                          {t('common.remove')}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className={CV_LABEL}>
                            {t('myCv.experienceFields.title')}
                          </label>
                          <input
                            type="text"
                            value={typeof item?.title === 'string' ? item.title : ''}
                            onChange={(e) => handleExperienceChange(index, 'title', e.target.value)}
                            className={CV_INPUT_NESTED}
                          />
                        </div>
                        <div>
                          <label className={CV_LABEL} htmlFor={`cv-exp-${index}-start`}>
                            {t('myCv.experienceFields.startYear')}
                          </label>
                          <CvDdMmDateField
                            key={`exp-${item?.id || index}-start`}
                            inputId={`cv-exp-${index}-start`}
                            value={typeof item?.startYear === 'string' ? item.startYear : ''}
                            onChange={(v) => handleExperienceChange(index, 'startYear', v)}
                            className={CV_INPUT_NESTED}
                          />
                        </div>
                        <div>
                          <label className={CV_LABEL} htmlFor={`cv-exp-${index}-end`}>
                            {t('myCv.experienceFields.endYear')}
                          </label>
                          <CvDdMmDateField
                            key={`exp-${item?.id || index}-end`}
                            inputId={`cv-exp-${index}-end`}
                            value={typeof item?.endYear === 'string' ? item.endYear : ''}
                            onChange={(v) => handleExperienceChange(index, 'endYear', v)}
                            className={CV_INPUT_NESTED}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className={CV_LABEL}>
                            {t('myCv.experienceFields.company')}
                          </label>
                          <input
                            type="text"
                            value={typeof item?.company === 'string' ? item.company : ''}
                            onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                            className={CV_INPUT_NESTED}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className={CV_LABEL}>
                            {t('myCv.experienceFields.location')}
                          </label>
                          <input
                            type="text"
                            value={typeof item?.location === 'string' ? item.location : ''}
                            onChange={(e) => handleExperienceChange(index, 'location', e.target.value)}
                            className={CV_INPUT_NESTED}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className={CV_LABEL}>
                            {t('myCv.experienceFields.description')}
                          </label>
                          <div className="rounded-xl border border-zinc-200/90 dark:border-slate-600 bg-white dark:bg-slate-800/90 shadow-sm hover:border-zinc-300 dark:hover:border-slate-500 transition-colors overflow-hidden">
                            <DefaultTemplate
                              key={item?.id ? `exp-desc-${item.id}` : `exp-desc-${index}`}
                              className="cv-lexkit-html-field"
                              placeholder={t('myCv.experienceFields.descriptionPlaceholder')}
                              onReady={(methods) => {
                                const html = typeof item?.description === 'string' ? item.description : '';
                                if (html) methods.injectHTML(html);
                              }}
                              onHtmlChange={(html) => handleExperienceChange(index, 'description', html)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : isEducationSection ? (
            <div className="flex flex-col gap-5">
              <div className={CV_SECTION_BLOCK}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                    {t('myCv.educationFields.items')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddEducation}
                    className={CV_BTN_ADD}
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    {t('myCv.educationFields.addItem')}
                  </button>
                </div>
                <div className="flex flex-col gap-4">
                  {educationItems.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">{t('myCv.educationFields.noItems')}</p>
                  )}
                  {educationItems.map((item, index) => (
                    <div key={item?.id || `education-${index}`} className={CV_ITEM_CARD}>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                          {t('myCv.educationFields.itemTitle', { index: index + 1 })}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemoveEducation(index)}
                          className={CV_BTN_REMOVE}
                        >
                          {t('common.remove')}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {EDUCATION_ITEM_FIELDS.map((field) => (
                          <div
                            key={`${field}-${index}`}
                            className={field === 'description' || field === 'location' ? 'md:col-span-2' : ''}
                          >
                            <label
                              className={CV_LABEL}
                              htmlFor={
                                field === 'startYear' || field === 'endYear'
                                  ? `cv-edu-${index}-${field}`
                                  : undefined
                              }
                            >
                              {t(`myCv.educationFields.${field}`)}
                            </label>
                            {field === 'description' ? (
                              <textarea
                                value={typeof item?.[field] === 'string' ? item[field] : ''}
                                onChange={(e) => handleEducationChange(index, field, e.target.value)}
                                rows={3}
                                className={CV_TEXTAREA_NESTED}
                              />
                            ) : field === 'startYear' || field === 'endYear' ? (
                              <CvDdMmDateField
                                key={`edu-${item?.id || index}-${field}`}
                                inputId={`cv-edu-${index}-${field}`}
                                value={typeof item?.[field] === 'string' ? item[field] : ''}
                                onChange={(v) => handleEducationChange(index, field, v)}
                                className={CV_INPUT_NESTED}
                              />
                            ) : (
                              <input
                                type="text"
                                value={typeof item?.[field] === 'string' ? item[field] : ''}
                                onChange={(e) => handleEducationChange(index, field, e.target.value)}
                                className={CV_INPUT_NESTED}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : isCertificatesSection ? (
            <div className="flex flex-col gap-5">
              <div className={CV_SECTION_BLOCK}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                    {t('myCv.certificatesFields.items')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddCertificate}
                    className={CV_BTN_ADD}
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    {t('myCv.certificatesFields.addItem')}
                  </button>
                </div>
                {certificateItems.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-slate-400">{t('myCv.certificatesFields.noItems')}</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-slate-600/70 bg-white dark:bg-slate-900 shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50/90 dark:bg-slate-800/90 border-b border-zinc-200 dark:border-slate-700">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                            {t('myCv.certificatesFields.tableHeaderTitle')}
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                            {t('myCv.certificatesFields.tableHeaderIssuer')}
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                            {t('myCv.certificatesFields.tableHeaderDate')}
                          </th>
                          <th className="text-right px-4 py-3 font-semibold text-zinc-700 dark:text-slate-300 text-xs uppercase tracking-wide">
                            {t('myCv.certificatesFields.tableHeaderActions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-slate-700">
                        {certificateItems.map((item, index) => (
                          <tr key={item?.id || `certificate-item-${index}`} className="hover:bg-zinc-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 text-zinc-900 dark:text-slate-100 font-medium">
                              {item?.title || '—'}
                            </td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-slate-400">
                              {item?.issuer || '—'}
                            </td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-slate-400">
                              {item?.date || '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditCertificate(index)}
                                  className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200/90 dark:border-slate-600 text-zinc-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
                                  aria-label={t('common.edit')}
                                >
                                  <span className="material-symbols-outlined text-base mr-1">edit</span>
                                  {t('common.edit')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCertificate(index)}
                                  className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200/90 dark:border-red-900/50 text-red-600 dark:text-red-300 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/35 transition-colors"
                                  aria-label={t('common.remove')}
                                >
                                  <span className="material-symbols-outlined text-base mr-1">delete</span>
                                  {t('common.remove')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Certificate Modal */}
              {certificateModal.open && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                  onClick={handleCloseCertificateModal}
                >
                  <div
                    className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                        {certificateModal.mode === 'add' ? t('myCv.certificatesFields.modalTitleAdd') : t('myCv.certificatesFields.modalTitleEdit')}
                      </h3>
                      <button
                        type="button"
                        onClick={handleCloseCertificateModal}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label={t('common.close')}
                      >
                        <span className="material-symbols-outlined text-xl">close</span>
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className={CV_LABEL}>
                          {t('myCv.certificatesFields.title')}
                        </label>
                        <input
                          type="text"
                          value={typeof certificateModal.draft?.title === 'string' ? certificateModal.draft.title : ''}
                          onChange={(e) => handleCertificateModalFieldChange('title', e.target.value)}
                          className={CV_INPUT}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={CV_LABEL}>
                            {t('myCv.certificatesFields.issuer')}
                          </label>
                          <input
                            type="text"
                            value={typeof certificateModal.draft?.issuer === 'string' ? certificateModal.draft.issuer : ''}
                            onChange={(e) => handleCertificateModalFieldChange('issuer', e.target.value)}
                            className={CV_INPUT}
                          />
                        </div>
                        <div>
                          <label className={CV_LABEL}>
                            {t('myCv.certificatesFields.date')}
                          </label>
                          <input
                            type="text"
                            value={typeof certificateModal.draft?.date === 'string' ? certificateModal.draft.date : ''}
                            onChange={(e) => handleCertificateModalFieldChange('date', e.target.value)}
                            className={CV_INPUT}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={CV_LABEL}>
                          {t('myCv.certificatesFields.description')}
                        </label>
                        <div className="rounded-xl border border-zinc-200/90 dark:border-slate-600 bg-white dark:bg-slate-800/90 shadow-sm hover:border-zinc-300 dark:hover:border-slate-500 transition-colors overflow-hidden">
                          <DefaultTemplate
                            key={certificateModal.draft?.id ? `modal-cert-desc-${certificateModal.draft.id}` : 'modal-cert-desc-new'}
                            className="cv-lexkit-html-field"
                            placeholder={t('myCv.certificatesFields.descriptionPlaceholder')}
                            onReady={(methods) => {
                              const html = typeof certificateModal.draft?.description === 'string' ? certificateModal.draft.description : '';
                              if (html) methods.injectHTML(html);
                            }}
                            onHtmlChange={(html) => handleCertificateModalFieldChange('description', html)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={handleCloseCertificateModal}
                        className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-semibold border border-zinc-200/90 dark:border-slate-600 text-zinc-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCertificateModal}
                        className={CV_BTN_SAVE}
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <textarea
              value={sectionDraft[section] ?? '{}'}
              onChange={(e) => {
                setSectionDraft((d) => ({ ...d, [section]: e.target.value }));
                setSectionErrors((err) => ({ ...err, [section]: null }));
              }}
              rows={14}
              spellCheck={false}
              className="w-full min-h-[280px] px-3.5 py-3 font-mono text-xs rounded-xl border border-zinc-200/90 dark:border-slate-600 bg-zinc-50 dark:bg-slate-950 text-zinc-900 dark:text-slate-100 shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary/80 resize-y"
            />
          )}
        </div>

        <footer className="sticky bottom-0 z-[5] -mx-1 mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-zinc-200/90 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_-8px_30px_-16px_rgba(0,0,0,0.4)] md:static md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none md:backdrop-blur-none">
          {sectionErrors[section] ? (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5 sm:max-w-[60%]" role="alert">
              <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">error</span>
              <span>{sectionErrors[section]}</span>
            </p>
          ) : (
            <p className="hidden sm:block text-xs text-zinc-400 dark:text-slate-500 sm:max-w-md leading-relaxed">
              {t('myCv.saveStickyHint')}
            </p>
          )}
          <button
            type="button"
            onClick={() => handleSaveSection(section)}
            disabled={savingSection[section]}
            className={`${CV_BTN_SAVE} w-full sm:w-auto min-w-[148px]`}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden>save</span>
            {savingSection[section] ? t('common.processing') : t('myCv.saveSection')}
          </button>
        </footer>
      </div>
    );
  };

  /** Settings-style: mobile horizontal nav + desktop vertical sidebar */
  const renderCvContentNav = () => (
    <div className="rounded-2xl border border-zinc-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-800 shadow-md shadow-zinc-200/40 dark:shadow-black/20 overflow-hidden ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
      <div className="px-4 pt-4 pb-3 md:px-6 md:pt-6 md:pb-4 border-b border-zinc-100 dark:border-slate-700/80 bg-gradient-to-r from-zinc-50/80 to-white dark:from-slate-900/40 dark:to-slate-800">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">{t('myCv.content')}</h2>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-slate-400 mt-1 leading-relaxed max-w-2xl">
          {t('myCv.contentNavSubtitle')}
        </p>
      </div>
      {/* Mobile — horizontal scroll + snap */}
      <div className="md:hidden flex border-b border-zinc-100 dark:border-slate-700 bg-zinc-50/50 dark:bg-slate-900/80 overflow-x-auto overflow-y-hidden shrink-0 scroll-smooth snap-x snap-mandatory">
        <nav className="flex flex-nowrap items-stretch gap-1 px-2 py-1 min-w-min" aria-label={t('myCv.content')}>
          {SECTIONS.map((id) => {
            const isActive = activeContentSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectContentSection(id)}
                className={`flex items-center gap-1.5 py-2.5 font-medium text-sm whitespace-nowrap px-3 rounded-xl transition-all shrink-0 snap-start min-h-[44px] ${isActive
                  ? 'text-primary bg-white dark:bg-slate-800 shadow-sm ring-1 ring-primary/25'
                  : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-800/60'
                  }`}
              >
                <span className={`material-symbols-outlined text-[20px] shrink-0 ${isActive ? '' : 'opacity-80'}`}>{CV_SECTION_ICONS[id]}</span>
                <span>{t(`myCv.sections.${id}`)}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <div className="flex flex-col md:flex-row gap-0 md:gap-0">
        <aside className="hidden md:flex w-[220px] lg:w-64 shrink-0 flex-col border-r border-zinc-100 dark:border-slate-700/80 p-3 bg-zinc-50/40 dark:bg-slate-900/30">
          <nav className="flex flex-col gap-1" aria-label={t('myCv.content')}>
            {SECTIONS.map((id) => {
              const isActive = activeContentSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectContentSection(id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isActive
                    ? 'bg-white dark:bg-slate-800 text-primary dark:text-blue-300 shadow-sm ring-1 ring-primary/20 font-semibold'
                    : 'text-zinc-600 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/50'
                    }`}
                >
                  <span className={`material-symbols-outlined text-[22px] shrink-0 ${isActive ? '' : 'opacity-85'}`}>{CV_SECTION_ICONS[id]}</span>
                  <span className="text-sm leading-tight">{t(`myCv.sections.${id}`)}</span>
                </button>
              );
            })}
          </nav>
        </aside>
        <div className="flex-1 min-w-0 p-4 md:p-6 md:pl-8 bg-white dark:bg-slate-800/40">
          {renderCvContentEditor()}
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background-subtle dark:bg-[#101922] text-zinc-900 dark:text-slate-100 antialiased selection:bg-zinc-200 dark:selection:bg-slate-600">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-subtle dark:bg-[#101922]">
        <Header
          title={t('myCv.title')}
          icon="badge"
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <div className="w-full max-w-[1024px] mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-10 flex flex-col gap-6 md:gap-10">
            <div className="flex flex-col gap-4 animate-pulse" aria-busy="true" aria-label={t('common.loading')}>
              <div className="h-8 w-48 rounded-lg bg-zinc-200/80 dark:bg-slate-700" />
              <div className="h-36 rounded-2xl bg-zinc-200/60 dark:bg-slate-700/80" />
              <div className="h-72 rounded-2xl bg-zinc-200/50 dark:bg-slate-700/60" />
            </div>
          </div>
        </div>
      </main>
      <MobileSidebarDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );

  if (error) return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background-subtle dark:bg-[#101922] text-zinc-900 dark:text-slate-100 antialiased selection:bg-zinc-200 dark:selection:bg-slate-600">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-subtle dark:bg-[#101922]">
        <Header
          title={t('myCv.title')}
          icon="badge"
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <div className="w-full max-w-[1024px] mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-10 flex flex-col gap-4">
            <p className="text-red-500">{t('myCv.loadError')}</p>
            <button
              type="button"
              onClick={load}
              className={CV_BTN_SAVE}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden>refresh</span>
              {t('myCv.retry')}
            </button>
          </div>
        </div>
      </main>
      <MobileSidebarDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background-subtle dark:bg-[#101922] text-zinc-900 dark:text-slate-100 antialiased selection:bg-zinc-200 dark:selection:bg-slate-600">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-subtle dark:bg-[#101922]">
        <Header
          title={t('myCv.title')}
          icon="badge"
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <div className="w-full max-w-[1024px] mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-10 flex flex-col gap-6 md:gap-10">
            <div className="flex flex-col gap-2 md:gap-3 max-w-2xl">
              <h1 className="text-zinc-900 dark:text-white text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em]">
                {t('myCv.title')}
              </h1>
              <p className="text-sm sm:text-base text-zinc-500 dark:text-slate-400 leading-relaxed">
                {t('myCv.pageSubtitle')}
              </p>
            </div>

            <section className="bg-white dark:bg-slate-800 rounded-2xl border border-zinc-200/90 dark:border-slate-700 p-5 sm:p-6 shadow-md shadow-zinc-200/30 dark:shadow-black/25 ring-1 ring-black/[0.03] dark:ring-white/[0.05] transition-shadow hover:shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-zinc-400 dark:text-slate-500 text-[22px] shrink-0" aria-hidden>language</span>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">{t('myCv.siteStatus')}</h2>
                </div>
                {site?.status === 'pending' && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-sm font-medium">
                    <span className="material-symbols-outlined text-base">hourglass_empty</span>
                    {t('myCv.statusPending')}
                  </span>
                )}
              </div>
              {renderSiteStatus()}
            </section>
            <section>
              {renderCvContentNav()}
            </section>
          </div>
        </div>
      </main>
      <MobileSidebarDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );
};

export default MyCvPage;
