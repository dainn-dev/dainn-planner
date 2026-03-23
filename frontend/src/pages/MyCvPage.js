import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { cvMeAPI, userAPI, getAvatarFullUrl } from '../services/api';
import { toast } from '../utils/toast';
import { formatDateTime } from '../utils/dateFormat';
import LogoutButton from '../components/LogoutButton';
import { isStoredAdmin } from '../utils/auth';

const SECTIONS = ['profile', 'portfolio', 'skills', 'experience', 'education', 'certificates', 'services', 'facts', 'testimonials'];

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
  'aboutTop',
  'about',
  'aboutBottom',
  'resumeIntro',
  'contactIntro',
];
const PORTFOLIO_ITEM_FIELDS = [
  'title',
  'category',
  'imageUrl',
  'detailsUrl',
  'client',
  'date',
  'url',
  'description',
];
const SKILL_TECH_FIELDS = ['category', 'details'];
const TESTIMONIAL_FIELDS = ['name', 'position', 'text', 'imageUrl'];
const FACT_ITEM_FIELDS = ['icon', 'count', 'title', 'description'];
const SERVICE_ITEM_FIELDS = ['icon', 'title', 'description'];
const EDUCATION_ITEM_FIELDS = ['id', 'degree', 'school', 'startYear', 'endYear', 'location', 'description'];
const EXPERIENCE_ITEM_FIELDS = ['id', 'title', 'company', 'startYear', 'endYear', 'location', 'description'];
const CERTIFICATE_ITEM_FIELDS = ['id', 'title', 'issuer', 'date', 'description'];

/** Shared CV editor field styles — calmer contrast, larger tap targets, consistent radius */
const CV_LABEL = 'block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-slate-400 mb-1.5';
const CV_INPUT =
  'w-full min-h-[42px] px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200/90 dark:border-slate-600 bg-white dark:bg-slate-900 text-zinc-900 dark:text-white shadow-sm placeholder:text-zinc-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary/80 transition-shadow';
const CV_INPUT_NESTED =
  'w-full min-h-[42px] px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200/90 dark:border-slate-600 bg-zinc-50/90 dark:bg-slate-800/90 text-zinc-900 dark:text-white shadow-sm placeholder:text-zinc-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary/80 transition-shadow';
const CV_TEXTAREA = `${CV_INPUT} min-h-[96px] resize-y`;
const CV_TEXTAREA_NESTED = `${CV_INPUT_NESTED} min-h-[96px] resize-y`;
const CV_SUBCARD =
  'rounded-2xl border border-zinc-200/80 dark:border-slate-700/80 p-4 sm:p-5 bg-gradient-to-br from-zinc-50/95 to-white dark:from-slate-900/55 dark:to-slate-900/85 shadow-sm';
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
  const isAdmin = isStoredAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadingCvAvatar, setUploadingCvAvatar] = useState(false);
  const cvAvatarFileRef = useRef(null);

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
      if (d[section] !== undefined) return d;
      const val = content[section];
      const draft = val !== undefined && val !== null
        ? JSON.stringify(val, null, 2)
        : '{}';
      return { ...d, [section]: draft };
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
    const inputRow = (labelKey, onSubmit) => (
      <div className={CV_SUBCARD}>
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
      return null;
    })();
    const slugDisplay = siteDomain ? `${site.slug}.${siteDomain}` : site.slug;

    const renderDetailsGrid = () => (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-4 mt-1 border-t border-gray-100 dark:border-slate-700 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-0.5">
            {t('myCv.slugLabel')}
          </p>
          <p className="text-gray-800 dark:text-slate-200 font-mono break-all">{slugDisplay}</p>
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
              {t('myCv.visitSite')}: <span className="font-mono">{slugDisplay}</span>
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
      const url = await userAPI.uploadAvatar(file);
      const path = typeof url === 'string' ? url : (url?.data ?? '');
      if (path) {
        handleProfileFieldChange('image', path);
        try {
          const u = JSON.parse(localStorage.getItem('user') || '{}');
          u.avatarUrl = path;
          localStorage.setItem('user', JSON.stringify(u));
        } catch {
          // ignore
        }
      }
    } catch {
      // error toast from apiRequest
    } finally {
      setUploadingCvAvatar(false);
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

  const handlePortfolioItemChange = (index, key, value) => {
    updatePortfolioDraft((current) => {
      const items = Array.isArray(current.items) ? [...current.items] : [];
      const target = items[index] && typeof items[index] === 'object' ? items[index] : {};
      items[index] = { ...target, [key]: value };
      return { ...current, items };
    });
  };

  const handlePortfolioItemImagesChange = (index, value) => {
    const images = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    updatePortfolioDraft((current) => {
      const items = Array.isArray(current.items) ? [...current.items] : [];
      const target = items[index] && typeof items[index] === 'object' ? items[index] : {};
      items[index] = { ...target, images };
      return { ...current, items };
    });
  };

  const handleAddPortfolioItem = () => {
    updatePortfolioDraft((current) => {
      const items = Array.isArray(current.items) ? [...current.items] : [];
      items.push({
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
      });
      return { ...current, items };
    });
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
    updateTestimonialsDraft((current) => {
      const testimonials = Array.isArray(current.testimonials) ? [...current.testimonials] : [];
      testimonials.push({ name: '', position: '', text: '', imageUrl: '' });
      return { ...current, testimonials };
    });
  };

  const handleRemoveTestimonial = (index) => {
    updateTestimonialsDraft((current) => {
      const testimonials = Array.isArray(current.testimonials) ? [...current.testimonials] : [];
      testimonials.splice(index, 1);
      return { ...current, testimonials };
    });
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
    updateServicesDraft((current) => {
      const servicesList = Array.isArray(current.services) ? [...current.services] : [];
      servicesList.push({ icon: '', title: '', description: '' });
      return { ...current, services: servicesList };
    });
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
      const target = next[index] && typeof next[index] === 'object' ? next[index] : {};
      next[index] = { ...target, [key]: value };
      return next;
    });
  };

  const handleAddCertificate = () => {
    updateCertificatesDraft((list) => [
      ...list,
      {
        id: `cert-${Date.now()}`,
        title: '',
        issuer: '',
        date: '',
        description: '',
      },
    ]);
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
    const profileTextAreaFields = new Set(['aboutTop', 'about', 'aboutBottom', 'resumeIntro', 'contactIntro']);
    const profileWideFields = (f) => profileTextAreaFields.has(f) || f === 'image';
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
    const certificatesParsed = isCertificatesSection ? getParsedSectionDraft('certificates') : null;
    const certificateItems = isCertificatesSection && Array.isArray(certificatesParsed) ? certificatesParsed : [];

    return (
      <div className="flex flex-col gap-5 md:gap-8">
        <div className="max-w-3xl w-full">
        {isProfileSection ? (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROFILE_FIELDS.map((field) => (
                <div key={field} className={profileWideFields(field) ? 'md:col-span-2' : ''}>
                  <label className={CV_LABEL}>
                    {t(`myCv.profileFields.${field}`)}
                  </label>
                  {profileTextAreaFields.has(field) ? (
                    <textarea
                      value={typeof profileDraft?.[field] === 'string' ? profileDraft[field] : ''}
                      onChange={(e) => handleProfileFieldChange(field, e.target.value)}
                      rows={field === 'about' ? 5 : 3}
                      className={CV_TEXTAREA}
                    />
                  ) : field === 'freelance' ? (() => {
                    const raw = typeof profileDraft?.freelance === 'string' ? profileDraft.freelance : '';
                    const known = FREELANCE_STATUS_OPTIONS.some((o) => o.value === raw);
                    return (
                      <select
                        value={known ? raw : ''}
                        onChange={(e) => handleProfileFieldChange('freelance', e.target.value)}
                        className={`${CV_INPUT} cursor-pointer`}
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
                  })() : field === 'image' ? (() => {
                    const rawImg = typeof profileDraft?.image === 'string' ? profileDraft.image : '';
                    const previewUrl = getAvatarFullUrl(rawImg);
                    return (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <div
                            className="h-16 w-16 rounded-xl border border-zinc-200/90 dark:border-slate-600 overflow-hidden bg-zinc-100 dark:bg-slate-800 shrink-0 flex items-center justify-center"
                            aria-hidden={previewUrl ? undefined : true}
                          >
                            {previewUrl ? (
                              <img
                                src={previewUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="material-symbols-outlined text-2xl text-zinc-400 dark:text-slate-500">
                                person
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              ref={cvAvatarFileRef}
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/gif"
                              className="sr-only"
                              onChange={handleCvAvatarFileChange}
                            />
                            <button
                              type="button"
                              onClick={() => cvAvatarFileRef.current?.click()}
                              disabled={uploadingCvAvatar}
                              className={`${CV_BTN_ADD} !min-h-[40px] !py-2 !text-xs`}
                            >
                              <span className="material-symbols-outlined text-sm">upload</span>
                              {uploadingCvAvatar ? t('settings.uploading') : t('myCv.uploadAvatar')}
                            </button>
                            {rawImg ? (
                              <button
                                type="button"
                                onClick={() => handleProfileFieldChange('image', '')}
                                className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 rounded-xl text-xs font-medium border border-zinc-200/90 dark:border-slate-600 text-zinc-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                {t('myCv.removeAvatar')}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-slate-400 leading-relaxed">
                          {t('myCv.profileFields.avatarHint')}
                        </p>
                      </div>
                    );
                  })() : (
                    <input
                      type="text"
                      value={typeof profileDraft?.[field] === 'string' ? profileDraft[field] : ''}
                      onChange={(e) => handleProfileFieldChange(field, e.target.value)}
                      className={CV_INPUT}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className={CV_SUBCARD}>
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
                      <input
                        type="text"
                        value={typeof social?.platform === 'string' ? social.platform : ''}
                        onChange={(e) => handleProfileSocialChange(index, 'platform', e.target.value)}
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
            <div className={CV_SUBCARD}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                {t('myCv.portfolioFields.intro')}
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={CV_LABEL}>
                    {t('myCv.portfolioFields.introTitle')}
                  </label>
                  <input
                    type="text"
                    value={typeof portfolioIntro.title === 'string' ? portfolioIntro.title : ''}
                    onChange={(e) => handlePortfolioIntroChange('title', e.target.value)}
                    className={CV_INPUT}
                  />
                </div>
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

            <div className={CV_SUBCARD}>
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
              <div className="flex flex-col gap-4">
                {portfolioItems.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-slate-400">{t('myCv.portfolioFields.noItems')}</p>
                )}
                {portfolioItems.map((item, index) => (
                  <div key={item?.id || `portfolio-item-${index}`} className={CV_ITEM_CARD}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                        {t('myCv.portfolioFields.itemTitle', { index: index + 1 })}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemovePortfolioItem(index)}
                        className={CV_BTN_REMOVE}
                      >
                        {t('common.remove')}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {PORTFOLIO_ITEM_FIELDS.map((field) => (
                        <div key={`${field}-${index}`} className={field === 'description' ? 'md:col-span-2' : ''}>
                          <label className={CV_LABEL}>
                            {t(`myCv.portfolioFields.${field}`)}
                          </label>
                          {field === 'description' ? (
                            <textarea
                              value={typeof item?.[field] === 'string' ? item[field] : ''}
                              onChange={(e) => handlePortfolioItemChange(index, field, e.target.value)}
                              rows={3}
                              className={CV_TEXTAREA_NESTED}
                            />
                          ) : (
                            <input
                              type="text"
                              value={typeof item?.[field] === 'string' ? item[field] : ''}
                              onChange={(e) => handlePortfolioItemChange(index, field, e.target.value)}
                              className={CV_INPUT_NESTED}
                            />
                          )}
                        </div>
                      ))}
                      <div className="md:col-span-2">
                        <label className={CV_LABEL}>
                          {t('myCv.portfolioFields.images')}
                        </label>
                        <textarea
                          value={Array.isArray(item?.images) ? item.images.join('\n') : ''}
                          onChange={(e) => handlePortfolioItemImagesChange(index, e.target.value)}
                          rows={3}
                          placeholder={t('myCv.portfolioFields.imagesHint')}
                          className={CV_TEXTAREA_NESTED}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : isSkillsSection ? (
          <div className="flex flex-col gap-5">
            <div className={CV_SUBCARD}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                {t('myCv.skillsFields.intro')}
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={CV_LABEL}>
                    {t('myCv.skillsFields.introTitle')}
                  </label>
                  <input
                    type="text"
                    value={typeof skillsIntro.title === 'string' ? skillsIntro.title : ''}
                    onChange={(e) => handleSkillsIntroChange('title', e.target.value)}
                    className={CV_INPUT}
                  />
                </div>
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

            <div className={CV_SUBCARD}>
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
                    <div className="flex justify-end mb-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveTechnicalSkill(index)}
                        className={CV_BTN_REMOVE}
                      >
                        {t('common.remove')}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {SKILL_TECH_FIELDS.map((field) => (
                        <div key={`${field}-${index}`}>
                          <label className={CV_LABEL}>
                            {t(`myCv.skillsFields.${field}`)}
                          </label>
                          <input
                            type="text"
                            value={typeof item?.[field] === 'string' ? item[field] : ''}
                            onChange={(e) => handleTechnicalSkillChange(index, field, e.target.value)}
                            className={CV_INPUT_NESTED}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={CV_SUBCARD}>
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
            <div className={CV_SUBCARD}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                {t('myCv.testimonialsFields.intro')}
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={CV_LABEL}>
                    {t('myCv.testimonialsFields.introTitle')}
                  </label>
                  <input
                    type="text"
                    value={typeof testimonialsIntro.title === 'string' ? testimonialsIntro.title : ''}
                    onChange={(e) => handleTestimonialsIntroChange('title', e.target.value)}
                    className={CV_INPUT}
                  />
                </div>
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

            <div className={CV_SUBCARD}>
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
              <div className="flex flex-col gap-4">
                {testimonialsItems.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-slate-400">{t('myCv.testimonialsFields.noItems')}</p>
                )}
                {testimonialsItems.map((item, index) => (
                  <div key={`testimonial-${index}`} className={CV_ITEM_CARD}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                        {t('myCv.testimonialsFields.itemTitle', { index: index + 1 })}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveTestimonial(index)}
                        className={CV_BTN_REMOVE}
                      >
                        {t('common.remove')}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {TESTIMONIAL_FIELDS.map((field) => (
                        <div key={`${field}-${index}`} className={field === 'text' ? 'md:col-span-2' : ''}>
                          <label className={CV_LABEL}>
                            {t(`myCv.testimonialsFields.${field}`)}
                          </label>
                          {field === 'text' ? (
                            <textarea
                              value={typeof item?.[field] === 'string' ? item[field] : ''}
                              onChange={(e) => handleTestimonialChange(index, field, e.target.value)}
                              rows={4}
                              className={CV_TEXTAREA_NESTED}
                            />
                          ) : (
                            <input
                              type="text"
                              value={typeof item?.[field] === 'string' ? item[field] : ''}
                              onChange={(e) => handleTestimonialChange(index, field, e.target.value)}
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
        ) : isFactsSection ? (
          <div className="flex flex-col gap-5">
            <div className={CV_SUBCARD}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                {t('myCv.factsFields.intro')}
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={CV_LABEL}>
                    {t('myCv.factsFields.introTitle')}
                  </label>
                  <input
                    type="text"
                    value={typeof factsIntro.title === 'string' ? factsIntro.title : ''}
                    onChange={(e) => handleFactsIntroChange('title', e.target.value)}
                    className={CV_INPUT}
                  />
                </div>
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

            <div className={CV_SUBCARD}>
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
                        <div key={`${field}-${index}`} className={field === 'description' ? 'md:col-span-2' : ''}>
                          <label className={CV_LABEL}>
                            {t(`myCv.factsFields.${field}`)}
                          </label>
                          {field === 'count' ? (
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
            <div className={CV_SUBCARD}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                {t('myCv.servicesFields.intro')}
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={CV_LABEL}>
                    {t('myCv.servicesFields.introTitle')}
                  </label>
                  <input
                    type="text"
                    value={typeof servicesIntro.title === 'string' ? servicesIntro.title : ''}
                    onChange={(e) => handleServicesIntroChange('title', e.target.value)}
                    className={CV_INPUT}
                  />
                </div>
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

            <div className={CV_SUBCARD}>
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
              <div className="flex flex-col gap-4">
                {serviceItems.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-slate-400">{t('myCv.servicesFields.noItems')}</p>
                )}
                {serviceItems.map((item, index) => (
                  <div key={`service-${index}`} className={CV_ITEM_CARD}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                        {t('myCv.servicesFields.itemTitle', { index: index + 1 })}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveServiceItem(index)}
                        className={CV_BTN_REMOVE}
                      >
                        {t('common.remove')}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {SERVICE_ITEM_FIELDS.map((field) => (
                        <div key={`${field}-${index}`} className={field === 'description' ? 'md:col-span-2' : ''}>
                          <label className={CV_LABEL}>
                            {t(`myCv.servicesFields.${field}`)}
                          </label>
                          {field === 'description' ? (
                            <textarea
                              value={typeof item?.[field] === 'string' ? item[field] : ''}
                              onChange={(e) => handleServiceItemChange(index, field, e.target.value)}
                              rows={3}
                              className={CV_TEXTAREA_NESTED}
                            />
                          ) : (
                            <input
                              type="text"
                              value={typeof item?.[field] === 'string' ? item[field] : ''}
                              onChange={(e) => handleServiceItemChange(index, field, e.target.value)}
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
        ) : isExperienceSection ? (
          <div className="flex flex-col gap-5">
            <div className={CV_SUBCARD}>
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
                      {EXPERIENCE_ITEM_FIELDS.map((field) => (
                        <div key={`${field}-${index}`} className={field === 'description' ? 'md:col-span-2' : ''}>
                          <label className={CV_LABEL}>
                            {t(`myCv.experienceFields.${field}`)}
                          </label>
                          {field === 'description' ? (
                            <textarea
                              value={typeof item?.[field] === 'string' ? item[field] : ''}
                              onChange={(e) => handleExperienceChange(index, field, e.target.value)}
                              rows={6}
                              spellCheck={false}
                              className={`${CV_INPUT_NESTED} font-mono min-h-[160px] resize-y`}
                            />
                          ) : (
                            <input
                              type="text"
                              value={typeof item?.[field] === 'string' ? item[field] : ''}
                              onChange={(e) => handleExperienceChange(index, field, e.target.value)}
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
        ) : isEducationSection ? (
          <div className="flex flex-col gap-5">
            <div className={CV_SUBCARD}>
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
                        <div key={`${field}-${index}`} className={field === 'description' ? 'md:col-span-2' : ''}>
                          <label className={CV_LABEL}>
                            {t(`myCv.educationFields.${field}`)}
                          </label>
                          {field === 'description' ? (
                            <textarea
                              value={typeof item?.[field] === 'string' ? item[field] : ''}
                              onChange={(e) => handleEducationChange(index, field, e.target.value)}
                              rows={3}
                              className={CV_TEXTAREA_NESTED}
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
            <div className={CV_SUBCARD}>
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
              <div className="flex flex-col gap-4">
                {certificateItems.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-slate-400">{t('myCv.certificatesFields.noItems')}</p>
                )}
                {certificateItems.map((item, index) => (
                  <div key={item?.id || `certificate-${index}`} className={CV_ITEM_CARD}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-sm font-semibold text-zinc-800 dark:text-slate-200">
                        {t('myCv.certificatesFields.itemTitle', { index: index + 1 })}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveCertificate(index)}
                        className={CV_BTN_REMOVE}
                      >
                        {t('common.remove')}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {CERTIFICATE_ITEM_FIELDS.map((field) => (
                        <div key={`${field}-${index}`} className={field === 'description' ? 'md:col-span-2' : ''}>
                          <label className={CV_LABEL}>
                            {t(`myCv.certificatesFields.${field}`)}
                          </label>
                          {field === 'description' ? (
                            <textarea
                              value={typeof item?.[field] === 'string' ? item[field] : ''}
                              onChange={(e) => handleCertificateChange(index, field, e.target.value)}
                              rows={3}
                              className={CV_TEXTAREA_NESTED}
                            />
                          ) : (
                            <input
                              type="text"
                              value={typeof item?.[field] === 'string' ? item[field] : ''}
                              onChange={(e) => handleCertificateChange(index, field, e.target.value)}
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

  const renderMobileSidebar = () => (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-background-light dark:bg-slate-900 border-r border-border-light dark:border-slate-700 z-[51] transform transition-transform duration-300 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-6 p-6 h-full">
          <div className="flex gap-4 items-center mb-2">
            <div
              className="bg-zinc-100 dark:bg-slate-700 rounded-full size-10 flex items-center justify-center border border-border-light shrink-0"
              aria-label="User avatar"
            >
              <span className="material-symbols-outlined text-zinc-500 dark:text-slate-200" style={{ fontSize: '20px' }}>
                person
              </span>
            </div>
            <div className="flex flex-col overflow-hidden">
              <h1 className="text-[#111418] dark:text-white text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em]">
                {t('myCv.title')}
              </h1>
            </div>
            <button
              className="ml-auto p-1 rounded-md text-zinc-600 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-slate-800"
              onClick={() => setSidebarOpen(false)}
              aria-label={t('common.close')}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            {isAdmin && (
              <>
                <Link
                  to="/admin/dashboard"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors group"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span
                    className="material-symbols-outlined text-zinc-400 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors"
                    style={{ fontSize: '20px' }}
                  >
                    dashboard
                  </span>
                  <p className="text-zinc-500 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white text-sm font-medium transition-colors">
                    {t('admin.dashboard')}
                  </p>
                </Link>
                <Link
                  to="/admin/users"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors group"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span
                    className="material-symbols-outlined text-zinc-400 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors"
                    style={{ fontSize: '20px' }}
                  >
                    people
                  </span>
                  <p className="text-zinc-500 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white text-sm font-medium transition-colors">
                    {t('admin.users')}
                  </p>
                </Link>
                <Link
                  to="/admin/logs"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors group"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span
                    className="material-symbols-outlined text-zinc-400 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors"
                    style={{ fontSize: '20px' }}
                  >
                    description
                  </span>
                  <p className="text-zinc-500 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white text-sm font-medium transition-colors">
                    {t('admin.logs')}
                  </p>
                </Link>
                <div className="my-2 border-t border-zinc-100 dark:border-slate-700" />
              </>
            )}

            <Link
              to="/daily"
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors group"
              onClick={() => setSidebarOpen(false)}
            >
              <span
                className="material-symbols-outlined text-zinc-400 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors"
                style={{ fontSize: '20px' }}
              >
                today
              </span>
              <p className="text-zinc-500 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white text-sm font-medium transition-colors">
                {t('sidebar.dailyPlan')}
              </p>
            </Link>

            <Link
              to="/goals"
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors group"
              onClick={() => setSidebarOpen(false)}
            >
              <span
                className="material-symbols-outlined text-zinc-400 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors"
                style={{ fontSize: '20px' }}
              >
                track_changes
              </span>
              <p className="text-zinc-500 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white text-sm font-medium transition-colors">
                {t('sidebar.goals')}
              </p>
            </Link>

            <Link
              to="/calendar"
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors group"
              onClick={() => setSidebarOpen(false)}
            >
              <span
                className="material-symbols-outlined text-zinc-400 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors"
                style={{ fontSize: '20px' }}
              >
                calendar_month
              </span>
              <p className="text-zinc-500 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white text-sm font-medium transition-colors">
                {t('sidebar.calendar')}
              </p>
            </Link>

            <Link
              to="/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors group"
              onClick={() => setSidebarOpen(false)}
            >
              <span
                className="material-symbols-outlined text-zinc-400 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors"
                style={{ fontSize: '20px' }}
              >
                settings
              </span>
              <p className="text-zinc-500 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white text-sm font-medium transition-colors">
                {t('sidebar.settings')}
              </p>
            </Link>

            <Link
              to="/cv"
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-slate-800 text-primary dark:text-blue-300 font-medium transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="material-symbols-outlined text-primary dark:text-blue-300" style={{ fontSize: '20px' }}>
                badge
              </span>
              <p className="text-primary dark:text-blue-300 text-sm font-medium">{t('sidebar.myCv')}</p>
            </Link>
          </nav>

          <div className="mt-auto flex flex-col gap-2">
            <LogoutButton
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors text-left w-full group touch-manipulation min-h-[44px]"
              iconClassName="text-zinc-400 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors"
              textClassName="text-zinc-500 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white text-sm font-medium transition-colors"
              labelKey="sidebar.logout"
            />
          </div>
        </div>
      </aside>
    </>
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
      {renderMobileSidebar()}
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
      {renderMobileSidebar()}
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
      {renderMobileSidebar()}
    </div>
  );
};

export default MyCvPage;
