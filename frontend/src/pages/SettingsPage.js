import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MobileSidebarDrawer from '../components/MobileSidebarDrawer';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import FormTextarea from '../components/FormTextarea';
import Toggle from '../components/Toggle';
import {
  validateName,
  validateEmail,
  validateText,
  validateDescription,
  validatePassword,
  validateConfirmPassword,
} from '../utils/formValidation';
import {
  INITIAL_PROFILE_FORM,
  INITIAL_SETTINGS,
  INITIAL_GENERAL_SETTINGS,
  INITIAL_PLANS_SETTINGS,
  INITIAL_NOTIFICATION_SETTINGS,
  INITIAL_SECURITY_SETTINGS,
  SETTINGS_MENU_ITEMS,
  SETTINGS_ROUTES,
} from '../constants/settings';
import { userAPI, notificationsAPI, integrationsAPI, USER_SETTINGS_STORAGE_KEY, getAvatarFullUrl } from '../services/api';
import ErrorMessage from '../components/ErrorMessage';
import { useRecaptchaV2 } from '../hooks/useRecaptchaV2';
import ModalMutationProgressBar from '../components/ModalMutationProgressBar';

const SettingsPage = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('profile');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadImageModalOpen, setUploadImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Set active tab based on route
  useEffect(() => {
    const tab = SETTINGS_ROUTES[location.pathname] || 'profile';
    setActiveTab(tab);
  }, [location.pathname]);

  const [profileForm, setProfileForm] = useState(INITIAL_PROFILE_FORM);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [generalSettings, setGeneralSettings] = useState(INITIAL_GENERAL_SETTINGS);
  const [plansSettings, setPlansSettings] = useState(INITIAL_PLANS_SETTINGS);
  const [notificationSettings, setNotificationSettings] = useState(INITIAL_NOTIFICATION_SETTINGS);
  const [securitySettings, setSecuritySettings] = useState(INITIAL_SECURITY_SETTINGS);
  const [profileErrors, setProfileErrors] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState(null);
  const [modal2FA, setModal2FA] = useState(null);
  const [setup2FAData, setSetup2FAData] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [securityPasswordErrors, setSecurityPasswordErrors] = useState({ currentPassword: null, newPassword: null, confirmPassword: null });
  const [securityCaptchaError, setSecurityCaptchaError] = useState('');
  const { recaptchaToken, recaptchaContainerRef, resetRecaptcha } = useRecaptchaV2({ enabled: activeTab === 'security' });
  const recaptchaSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [disconnectingTodoist, setDisconnectingTodoist] = useState(false);
  const [connectingTodoist, setConnectingTodoist] = useState(false);
  const [savePending, setSavePending] = useState(false);
  // After OAuth callback we land with ?google=connected or ?todoist=connected; refetch settings and clear the param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleOk = params.get('google') === 'connected';
    const todoistOk = params.get('todoist') === 'connected';
    if (!googleOk && !todoistOk) return;
    const run = async () => {
      try {
        const data = await userAPI.getSettings();
        if (data && typeof data === 'object') applySettingsToState(data);
      } catch (_) {
        // ignore
      }
      window.history.replaceState(null, '', location.pathname || '/settings/profile');
    };
    run();
  }, [location.search, location.pathname]);

  // Hydrate settings state from a fetched or stored settings object (general, plans, notifications, display options)
  const applySettingsToState = (data) => {
    if (!data || typeof data !== 'object') return;
    if (data.general && typeof data.general === 'object') {
      setGeneralSettings(prev => ({ ...prev, ...data.general }));
    }
    if (data.plans && typeof data.plans === 'object') {
      setPlansSettings(prev => ({ ...prev, ...data.plans }));
    }
    if (data.notifications && typeof data.notifications === 'object') {
      setNotificationSettings(prev => ({ ...prev, ...data.notifications }));
    }
    const displayKeys = ['weekStartDay', 'darkMode', 'publicProfile', 'showMyCvInMenu'];
    const hasDisplay = displayKeys.some(k => data[k] !== undefined);
    if (hasDisplay) {
      setSettings(prev => {
        const next = { ...prev };
        displayKeys.forEach(k => { if (data[k] !== undefined) next[k] = data[k]; });
        return next;
      });
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [profileData, notificationsData, settingsData] = await Promise.all([
          userAPI.getProfile(),
          notificationsAPI.getNotifications({ limit: 20 }),
          userAPI.getSettings().catch(() => null),
        ]);
        if (profileData) {
          setProfileForm(prev => ({
            ...prev,
            fullname: profileData.fullName ?? profileData.fullname ?? prev.fullname,
            email: profileData.email ?? prev.email,
            location: profileData.location ?? prev.location,
            job: profileData.job ?? prev.job,
            bio: profileData.bio ?? prev.bio,
          }));
          if (profileData.avatarUrl != null) {
            setAvatarUrl(profileData.avatarUrl);
            try {
              const u = JSON.parse(localStorage.getItem('user') || '{}');
              u.avatarUrl = profileData.avatarUrl;
              localStorage.setItem('user', JSON.stringify(u));
              window.dispatchEvent(new CustomEvent('userSettingsUpdated'));
            } catch (_) { /* ignore */ }
          }
        }
        const notifList = Array.isArray(notificationsData) ? notificationsData : (notificationsData?.notifications || []);
        setNotifications(notifList.map(n => ({
          id: n.id,
          type: n.type || 'system',
          title: n.title,
          message: n.message,
          time: n.createdAt ? new Date(n.createdAt).toLocaleString('vi-VN') : '',
          unread: !n.isRead,
          icon: n.icon || 'notifications',
          iconBg: 'bg-blue-100',
          iconColor: n.iconColor || 'text-primary',
        })));
        if (settingsData) {
          applySettingsToState(settingsData);
        } else {
          try {
            const raw = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
            if (raw) {
              const stored = JSON.parse(raw);
              applySettingsToState(stored);
            }
          } catch (_) {
            // ignore
          }
        }
      } catch (error) {
        console.error('Failed to load profile or notifications:', error);
        try {
          const raw = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
          if (raw) {
            const stored = JSON.parse(raw);
            applySettingsToState(stored);
          }
        } catch (_) {
          // ignore
        }
      }
    };
    load();
  }, []);

  // Load logged-in devices when Security tab is active
  useEffect(() => {
    if (activeTab !== 'security') return;

    const formatLastActive = (dateStr) => {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return t('settings.justNow', 'Just now');
      if (diffMins < 60) return t('settings.minutesAgo', { count: diffMins }, `${diffMins} min ago`);
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return t('settings.hoursAgo', { count: diffHours }, `${diffHours} hour(s) ago`);
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return t('settings.daysAgo', { count: diffDays }, `${diffDays} day(s) ago`);
      return d.toLocaleDateString();
    };

    const platformToIcon = (platform) => {
      if (!platform) return 'computer';
      const p = String(platform).toLowerCase();
      if (p === 'ios' || p === 'android') return 'smartphone';
      return 'computer';
    };

    const loadDevices = async () => {
      setDevicesLoading(true);
      setDevicesError(null);
      try {
        const list = await userAPI.getDevices();
        const currentDeviceId = (typeof localStorage !== 'undefined' && localStorage.getItem('deviceId')) || 'web';
        const mapped = (list || []).map((d) => ({
          id: String(d.id),
          name: d.deviceName || d.platform || 'Web device',
          platform: d.platform || '—',
          lastActive: formatLastActive(d.lastUsedAt),
          isCurrent: d.deviceId === currentDeviceId,
          type: platformToIcon(d.platform),
          ipAddress: d.ipAddress ?? null,
        }));
        setSecuritySettings(prev => ({ ...prev, devices: mapped }));
      } catch (err) {
        setDevicesError(err?.message || t('settings.devicesLoadError', 'Failed to load devices'));
        setSecuritySettings(prev => ({ ...prev, devices: [] }));
      } finally {
        setDevicesLoading(false);
      }
    };

    const load2FAStatus = async () => {
      try {
        const enabled = await userAPI.get2FAStatus();
        setSecuritySettings(prev => ({ ...prev, twoFactorAuth: !!enabled }));
      } catch (_) {
        // leave toggle as-is on error
      }
    };

    loadDevices();
    load2FAStatus();
  }, [activeTab, t]);

  // Generic handler for state updates
  const createHandler = (setter) => (field, value) => {
    setter(prev => ({ ...prev, [field]: value }));
  };

  const handleProfileChange = createHandler(setProfileForm);
  const handleSettingChange = createHandler(setSettings);
  const handleGeneralSettingChange = createHandler(setGeneralSettings);
  const handlePlansSettingChange = createHandler(setPlansSettings);
  const handleNotificationSettingChange = createHandler(setNotificationSettings);
  const handleSecuritySettingChange = createHandler(setSecuritySettings);

  const handleLanguageChange = (locale) => {
    handleGeneralSettingChange('language', locale);
  };

  const handleProfileBlur = (field, value) => {
    // Validate on blur
    const errors = { ...profileErrors };
    switch (field) {
      case 'fullname':
        errors.fullname = validateName(value, true, 2, 255);
        break;
      case 'email':
        errors.email = validateEmail(value, true);
        break;
      case 'job':
        errors.job = validateText(value, t('settings.job'), false, 1, 100);
        break;
      case 'bio':
        errors.bio = validateDescription(value, false, 150);
        break;
      default:
        break;
    }
    setProfileErrors(errors);
  };

  const handleSave = async () => {
    if (savePending) return;
    if (activeTab === 'profile') {
      const errors = {};
      errors.fullname = validateName(profileForm.fullname, true, 2, 255);
      errors.email = validateEmail(profileForm.email, true);
      errors.job = validateText(profileForm.job, t('settings.job'), false, 1, 100);
      errors.bio = validateDescription(profileForm.bio, false, 150);

      const hasErrors = Object.values(errors).some(error => error !== null);
      if (hasErrors) {
        setProfileErrors(errors);
        return;
      }

      setSavePending(true);
      try {
        await userAPI.updateProfile({
          fullName: profileForm.fullname,
          phone: profileForm.phone || undefined,
          location: profileForm.location || undefined,
        });
        try {
          const raw = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
          const stored = raw ? JSON.parse(raw) : {};
          const updated = {
            ...stored,
            weekStartDay: settings.weekStartDay,
            darkMode: settings.darkMode,
            publicProfile: settings.publicProfile,
            showMyCvInMenu: settings.showMyCvInMenu,
          };
          localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('userSettingsUpdated'));
          }
        } catch (e) {
          // ignore
        }
      } catch (error) {
        console.error('Failed to save profile:', error);
      } finally {
        setSavePending(false);
      }
      return;
    }

    if (activeTab === 'security') {
      const { currentPassword, newPassword, confirmPassword } = securitySettings;
      const anyFilled = currentPassword || newPassword || confirmPassword;
      if (!anyFilled) {
        return;
      }
      const errors = {
        currentPassword: validatePassword(currentPassword, true),
        newPassword: validatePassword(newPassword, true),
        confirmPassword: validateConfirmPassword(newPassword, confirmPassword, true),
      };
      const hasErrors = Object.values(errors).some(e => e != null);
      if (hasErrors) {
        setSecurityPasswordErrors(errors);
        return;
      }
      if (recaptchaSiteKey && !recaptchaToken) {
        setSecurityCaptchaError(t('settings.supportErrorMissingCaptcha'));
        return;
      }
      setSecurityCaptchaError('');
      setSecurityPasswordErrors({ currentPassword: null, newPassword: null, confirmPassword: null });
      setSavePending(true);
      try {
        await userAPI.changePassword({
          currentPassword,
          newPassword,
          recaptchaToken: recaptchaSiteKey ? recaptchaToken : undefined,
        });
        resetRecaptcha();
        setSecuritySettings(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
      } catch (error) {
        resetRecaptcha();
      } finally {
        setSavePending(false);
      }
      return;
    }

    setSavePending(true);
    try {
      await userAPI.updateSettings({
        general: generalSettings,
        plans: plansSettings,
        notifications: notificationSettings,
        showMyCvInMenu: settings.showMyCvInMenu,
        darkMode: settings.darkMode,
        publicProfile: settings.publicProfile,
        weekStartDay: settings.weekStartDay,
      });

      try {
        const raw = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
        const stored = raw ? JSON.parse(raw) : {};
        localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify({
          ...stored,
          showMyCvInMenu: settings.showMyCvInMenu,
          darkMode: settings.darkMode,
          publicProfile: settings.publicProfile,
          weekStartDay: settings.weekStartDay,
          workHourStart: generalSettings.workHourStart ?? 8,
          workHourEnd: generalSettings.workHourEnd ?? 24,
        }));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('userSettingsUpdated'));
        }
      } catch (_) {
        // ignore
      }

      const newLang = generalSettings.language;
      if (newLang === 'vi' || newLang === 'en') {
        i18n.changeLanguage(newLang);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('app_lang', newLang);
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSavePending(false);
    }
  };

  const handleCancel = () => {
    if (savePending) return;
    // Reset to original values
    setProfileForm(INITIAL_PROFILE_FORM);
    setSettings(INITIAL_SETTINGS);
    setGeneralSettings(INITIAL_GENERAL_SETTINGS);
    setPlansSettings(INITIAL_PLANS_SETTINGS);
    setNotificationSettings(INITIAL_NOTIFICATION_SETTINGS);
    setSecuritySettings(INITIAL_SECURITY_SETTINGS);
    setProfileErrors({});
    setSecurityPasswordErrors({ currentPassword: null, newPassword: null, confirmPassword: null });
    setSecurityCaptchaError('');
  };

  const handleLogoutDevice = async (deviceId) => {
    try {
      await userAPI.revokeDevice(deviceId);
      setSecuritySettings(prev => ({
        ...prev,
        devices: prev.devices.filter(device => device.id !== deviceId),
      }));
    } catch (err) {
      // Revoke failed – no inline message
    }
  };

  // When Enable 2FA modal opens, fetch setup data (QR + key)
  useEffect(() => {
    if (modal2FA !== 'enable') return;
    setSetup2FAData(null);
    setTwoFactorError('');
    setTwoFactorCode('');
    const load = async () => {
      try {
        const data = await userAPI.setup2FA();
        setSetup2FAData({ sharedKey: data?.sharedKey ?? data?.SharedKey ?? '', qrCodeUri: data?.qrCodeUri ?? data?.QrCodeUri ?? '' });
      } catch (err) {
        setTwoFactorError(err?.message || t('settings.twoFactorSetupError'));
      }
    };
    load();
  }, [modal2FA, t]);

  const close2FAModal = () => {
    setModal2FA(null);
    setSetup2FAData(null);
    setTwoFactorCode('');
    setTwoFactorError('');
  };

  const handle2FAToggle = (e) => {
    e.preventDefault();
    if (securitySettings.twoFactorAuth) {
      setModal2FA('disable');
      setTwoFactorCode('');
      setTwoFactorError('');
    } else {
      setModal2FA('enable');
    }
  };

  const handleEnable2FASubmit = async () => {
    setTwoFactorError('');
    if (!twoFactorCode.trim()) {
      setTwoFactorError(t('settings.twoFactorCodeRequired'));
      return;
    }
    setTwoFactorLoading(true);
    try {
      await userAPI.enable2FA({ code: twoFactorCode.trim() });
      setSecuritySettings(prev => ({ ...prev, twoFactorAuth: true }));
      close2FAModal();
    } catch (err) {
      setTwoFactorError(err?.message || t('settings.twoFactorEnableError'));
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FASubmit = async () => {
    setTwoFactorError('');
    if (!twoFactorCode.trim()) {
      setTwoFactorError(t('settings.twoFactorCodeRequired'));
      return;
    }
    setTwoFactorLoading(true);
    try {
      await userAPI.disable2FA({ code: twoFactorCode.trim() });
      setSecuritySettings(prev => ({ ...prev, twoFactorAuth: false }));
      close2FAModal();
    } catch (err) {
      setTwoFactorError(err?.message || t('settings.twoFactorDisableError'));
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(t('settings.fileSizeError'));
        return;
      }

      // Check file type
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
        alert(t('settings.fileTypeError'));
        return;
      }

      setSelectedImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImage = async () => {
    if (!selectedImage) return;
    setUploadingAvatar(true);
    try {
      const url = await userAPI.uploadAvatar(selectedImage);
      const path = typeof url === 'string' ? url : (url?.data ?? url);
      if (path) {
        setAvatarUrl(path);
        try {
          const u = JSON.parse(localStorage.getItem('user') || '{}');
          u.avatarUrl = path;
          localStorage.setItem('user', JSON.stringify(u));
          window.dispatchEvent(new CustomEvent('userSettingsUpdated'));
        } catch (e) { /* ignore */ }
      }
      setUploadImageModalOpen(false);
      setSelectedImage(null);
      setImagePreview(null);
    } catch (error) {
      console.error('Avatar upload failed:', error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCloseUploadModal = () => {
    setUploadImageModalOpen(false);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        delete u.avatarUrl;
        delete u.avatar;
        localStorage.setItem('user', JSON.stringify(u));
        window.dispatchEvent(new CustomEvent('userSettingsUpdated'));
      }
    } catch {
      // ignore parse errors
    }
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background-subtle dark:bg-[#101922] text-zinc-900 dark:text-slate-100 antialiased selection:bg-zinc-200 dark:selection:bg-slate-600">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative bg-background-subtle dark:bg-[#101922]">
        <Header
          title={t('settings.title')}
          icon="settings"
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Mobile Navigation - horizontal scrollable nav bar on mobile only */}
        <div className="md:hidden flex border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-x-auto overflow-y-hidden shrink-0">
          <nav className="flex flex-nowrap items-stretch gap-0 px-2 min-w-min">
            {SETTINGS_MENU_ITEMS.map((item) => {
              const route = item.id === 'general' ? '/settings/general' :
                item.id === 'plans' ? '/settings/goals' :
                  item.id === 'notifications' ? '/settings/notification' :
                    item.id === 'security' ? '/settings/security' :
                      '/settings';
              const isActive = activeTab === item.id;
              return (
                <Link
                  key={item.id}
                  to={route}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 py-3 font-medium text-sm whitespace-nowrap px-3 transition-colors shrink-0 ${isActive
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                >
                  <span className="material-symbols-outlined text-lg shrink-0">{item.icon}</span>
                  <span>{t(`settings.${item.id}`)}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="w-full max-w-[1000px] mx-auto px-6 sm:px-10 py-10 flex flex-col md:flex-row gap-12">
          {/* Desktop Sidebar Navigation */}
          <aside className="hidden md:flex w-64 shrink-0 flex-col gap-8 bg-transparent">
            <nav className="flex flex-col gap-1.5">
              {SETTINGS_MENU_ITEMS.map((item) => {
                const route = item.id === 'general' ? '/settings/general' :
                  item.id === 'plans' ? '/settings/goals' :
                    item.id === 'notifications' ? '/settings/notification' :
                      item.id === 'security' ? '/settings/security' :
                        '/settings';
                return (
                  <Link
                    key={item.id}
                    to={route}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${activeTab === item.id
                        ? 'bg-zinc-100 dark:bg-slate-800 text-zinc-900 dark:text-white'
                        : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-slate-800'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span className="text-sm font-medium">{t(`settings.${item.id}`)}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 relative">
            <ModalMutationProgressBar active={savePending} label={t('common.saving')} />
            {activeTab === 'profile' && (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-2 pb-6 border-b border-border-light dark:border-slate-700">
                  <h1 className="text-[#111418] dark:text-white text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em]">{t('settings.profileTitle')}</h1>
                  <p className="text-secondary dark:text-slate-400 text-sm font-normal leading-relaxed max-w-lg">
                    {t('settings.profileSubtitle')}
                  </p>
                </div>

                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
                  <button
                    type="button"
                    className="relative group cursor-pointer"
                    onClick={() => setUploadImageModalOpen(true)}
                    aria-label={t('settings.largeAvatarPreview')}
                  >
                    <div
                      className="bg-center bg-no-repeat bg-cover rounded-full size-24 ring-1 ring-border-light dark:ring-slate-600 bg-zinc-200 dark:bg-slate-700"
                      style={{
                        backgroundImage: avatarUrl
                          ? `url("${getAvatarFullUrl(avatarUrl)}")`
                          : undefined,
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="material-symbols-outlined text-white">edit</span>
                    </div>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAvatar();
                        }}
                        className="absolute -top-1 -right-1 size-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600"
                        aria-label={t('settings.removePhoto')}
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                  </button>
                  <div className="flex flex-col gap-4 flex-1">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{t('settings.avatar')}</h3>
                      <p className="text-sm text-secondary dark:text-slate-400 mt-1">{t('settings.avatarHint')}</p>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="flex flex-col gap-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <FormInput
                      id="fullname"
                      label={t('settings.fullName')}
                      type="text"
                      value={profileForm.fullname}
                      onChange={(e) => handleProfileChange('fullname', e.target.value)}
                      onBlur={(e) => handleProfileBlur('fullname', e.target.value)}
                      placeholder={t('settings.fullNamePlaceholder')}
                      required
                      error={profileErrors.fullname}
                    />
                    <FormInput
                      id="email"
                      label={t('settings.email')}
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      onBlur={(e) => handleProfileBlur('email', e.target.value)}
                      placeholder="name@example.com"
                      required
                      error={profileErrors.email}
                    />
                    <div className="opacity-60 pointer-events-none">
                      <FormInput
                        id="job"
                        label={t('settings.job')}
                        type="text"
                        value={profileForm.job}
                        onChange={(e) => handleProfileChange('job', e.target.value)}
                        onBlur={(e) => handleProfileBlur('job', e.target.value)}
                        placeholder={t('settings.jobPlaceholder')}
                        error={profileErrors.job}
                        disabled
                        readOnly
                      />
                    </div>
                    <FormSelect
                      id="location"
                      label={t('settings.location')}
                      value={profileForm.location}
                      onChange={(e) => handleProfileChange('location', e.target.value)}
                      options={[
                        'Hà Nội, Việt Nam',
                        'Hồ Chí Minh, Việt Nam',
                        'Đà Nẵng, Việt Nam'
                      ]}
                    />
                  </div>
                  <div className="opacity-60 pointer-events-none">
                    <FormTextarea
                      id="bio"
                      label={t('settings.bio')}
                      value={profileForm.bio}
                      onChange={(e) => handleProfileChange('bio', e.target.value)}
                      onBlur={(e) => handleProfileBlur('bio', e.target.value)}
                      placeholder={t('settings.bioPlaceholder')}
                      rows={4}
                      maxLength={150}
                      error={profileErrors.bio}
                      disabled
                      readOnly
                    />
                  </div>
                </div>

                {/* Display Options */}
                <div className="pt-6 border-t border-border-light dark:border-slate-700">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-6">{t('settings.displayOptions')}</h3>
                  <div className="flex flex-col gap-6">
                    <Toggle
                      id="darkMode"
                      label={t('settings.darkMode')}
                      description={t('settings.darkModeDesc')}
                      checked={settings.darkMode}
                      onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                      className="pb-4 border-b border-zinc-100 dark:border-slate-700"
                    />
                    <Toggle
                      id="showMyCvInMenu"
                      label={t('settings.showMyCvInMenu')}
                      description={t('settings.showMyCvInMenuDesc')}
                      checked={settings.showMyCvInMenu}
                      onChange={(e) => handleSettingChange('showMyCvInMenu', e.target.checked)}
                      className="pb-4 border-b border-zinc-100 dark:border-slate-700"
                    />
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-slate-700">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{t('settings.weekStartDay')}</span>
                        <span className="text-sm text-secondary dark:text-slate-400">{t('settings.weekStartDayDesc')}</span>
                      </div>
                      <div className="flex bg-zinc-100 dark:bg-slate-800 rounded-lg p-1 border border-border-light dark:border-slate-600">
                        <button
                          onClick={() => handleSettingChange('weekStartDay', 'monday')}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${settings.weekStartDay === 'monday'
                              ? 'bg-white dark:bg-slate-700 text-zinc-900 dark:text-white font-semibold shadow-sm border border-border-light dark:border-slate-600'
                              : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                        >
                          {t('settings.monday')}
                        </button>
                        <button
                          onClick={() => handleSettingChange('weekStartDay', 'sunday')}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${settings.weekStartDay === 'sunday'
                              ? 'bg-white dark:bg-slate-700 text-zinc-900 dark:text-white font-semibold shadow-sm border border-border-light dark:border-slate-600'
                              : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                        >
                          {t('settings.sunday')}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between opacity-60 pointer-events-none">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{t('settings.publicProfile')}</span>
                        <span className="text-sm text-secondary dark:text-slate-400">{t('settings.publicProfileDesc')}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-not-allowed">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={false}
                          disabled
                          readOnly
                        />
                        <div className="w-10 h-6 bg-zinc-200 dark:bg-slate-600 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 mt-2 border-t border-border-light dark:border-slate-700">
                  <button
                    onClick={handleCancel}
                    disabled={savePending}
                    className="px-6 py-2.5 rounded-lg border border-border-light dark:border-slate-600 text-zinc-500 dark:text-slate-300 font-medium text-sm hover:bg-zinc-50 dark:hover:bg-slate-700 transition-colors w-full sm:w-auto disabled:opacity-50"
                  >
                    {t('settings.cancel')}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={savePending}
                    className="px-6 py-2.5 rounded-lg bg-zinc-900 dark:bg-primary hover:bg-zinc-800 dark:hover:bg-primary/90 text-white font-medium text-sm shadow-sm transition-all w-full sm:w-auto disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {savePending ? t('common.saving') : t('settings.saveChanges')}
                  </button>
                </div>
              </div>
            )}

            {/* General Settings Tab */}
            {activeTab === 'general' && (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-2 pb-6 border-b border-border-light dark:border-slate-700">
                  <h1 className="text-[#111418] dark:text-white text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em]">{t('settings.generalTitle')}</h1>
                  <p className="text-secondary dark:text-slate-400 text-sm font-normal leading-relaxed max-w-lg">
                    {t('settings.generalSubtitle')}
                  </p>
                </div>

                {/* Region & Language Section */}
                <div className="flex flex-col gap-8">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{t('settings.regionAndLanguage')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-zinc-900 dark:text-slate-200" htmlFor="language">
                        {t('settings.language')}
                      </label>
                      <div className="relative">
                        <select
                          key={generalSettings.language || i18n.language}
                          className="w-full appearance-none bg-white dark:bg-slate-700 border border-border-light dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary focus:border-transparent transition-all shadow-sm cursor-pointer"
                          id="language"
                          value={generalSettings.language === 'vi' || generalSettings.language === 'en' ? generalSettings.language : i18n.language || 'vi'}
                          onChange={(e) => handleLanguageChange(e.target.value)}
                        >
                          <option value="vi">Tiếng Việt</option>
                          <option value="en">English</option>
                        </select>
                      </div>
                      <p className="text-xs text-secondary dark:text-slate-500">{t('settings.languageApplyHint')}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-zinc-900 dark:text-slate-200" htmlFor="timezone">
                        {t('settings.timezone')}
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none bg-zinc-100 dark:bg-slate-800 border border-border-light dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm text-zinc-500 dark:text-slate-400 focus:outline-none cursor-not-allowed opacity-75"
                          id="timezone"
                          value={generalSettings.timezone}
                          onChange={(e) => handleGeneralSettingChange('timezone', e.target.value)}
                          disabled
                        >
                          <option>(GMT+00:00) UTC</option>
                          <option>(GMT+07:00) Bangkok, Hanoi, Jakarta</option>
                          <option>(GMT+08:00) Singapore</option>
                          <option>(GMT+09:00) Tokyo, Seoul</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-zinc-100 dark:border-slate-700" />

                {/* Date & Time Section */}
                <div className="flex flex-col gap-8">
                  <div className="flex justify-between items-end">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{t('settings.dateTime')}</h3>
                  </div>
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-slate-700">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{t('settings.dateFormat')}</span>
                        <span className="text-sm text-secondary dark:text-slate-400">{t('settings.dateFormatHint')}</span>
                      </div>
                      <div className="relative w-full sm:w-48">
                        <select
                          className="w-full appearance-none bg-white dark:bg-slate-700 border border-border-light dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary focus:border-transparent transition-all shadow-sm cursor-pointer"
                          value={generalSettings.dateFormat}
                          onChange={(e) => handleGeneralSettingChange('dateFormat', e.target.value)}
                        >
                          <option>31/12/2024 (DD/MM/YYYY)</option>
                          <option>12/31/2024 (MM/DD/YYYY)</option>
                          <option>2024-12-31 (YYYY-MM-DD)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-slate-700">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{t('settings.timeFormat')}</span>
                        <span className="text-sm text-secondary dark:text-slate-400">{t('settings.timeFormatHint')}</span>
                      </div>
                      <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-border-light dark:border-slate-600 shadow-sm">
                        <button
                          onClick={() => handleGeneralSettingChange('timeFormat', '12')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${generalSettings.timeFormat === '12'
                              ? 'bg-zinc-100 dark:bg-slate-700 text-zinc-900 dark:text-white font-semibold shadow-sm border border-border-light dark:border-slate-600'
                              : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                        >
                          {t('settings.timeFormat12')}
                        </button>
                        <button
                          onClick={() => handleGeneralSettingChange('timeFormat', '24')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${generalSettings.timeFormat === '24'
                              ? 'bg-zinc-100 dark:bg-slate-700 text-zinc-900 dark:text-white font-semibold shadow-sm border border-border-light dark:border-slate-600'
                              : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                        >
                          {t('settings.timeFormat24')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-zinc-100 dark:border-slate-700" />

                {/* Working Hours Section */}
                <div className="flex flex-col gap-8">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{t('settings.workingHours')}</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">{t('settings.workingHoursLabel')}</span>
                      <span className="text-sm text-secondary dark:text-slate-400">{t('settings.workingHoursDesc')}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <select
                        className="appearance-none bg-white dark:bg-slate-700 border border-border-light dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-sm"
                        value={generalSettings.workHourStart ?? 8}
                        onChange={(e) => handleGeneralSettingChange('workHourStart', Number(e.target.value))}
                      >
                        {Array.from({ length: 23 }, (_, i) => (
                          <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                        ))}
                      </select>
                      <span className="text-sm text-secondary dark:text-slate-400">{t('settings.workingHoursTo')}</span>
                      <select
                        className="appearance-none bg-white dark:bg-slate-700 border border-border-light dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-sm"
                        value={generalSettings.workHourEnd ?? 24}
                        onChange={(e) => handleGeneralSettingChange('workHourEnd', Number(e.target.value))}
                      >
                        {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                          <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 mt-2 border-t border-border-light dark:border-slate-700">
                  <button
                    onClick={handleCancel}
                    disabled={savePending}
                    className="px-6 py-2.5 rounded-lg border border-border-light dark:border-slate-600 bg-white dark:bg-slate-700 text-zinc-500 dark:text-slate-300 font-medium text-sm hover:bg-zinc-50 dark:hover:bg-slate-600 hover:text-zinc-900 dark:hover:text-white transition-colors w-full sm:w-auto shadow-sm disabled:opacity-50"
                  >
                    {t('settings.cancel')}
                  </button>
                  <button
                    onClick={() => {
                      handleSave();
                      console.log('Saving general settings:', generalSettings);
                    }}
                    disabled={savePending}
                    className="px-6 py-2.5 rounded-lg bg-zinc-900 dark:bg-primary hover:bg-zinc-800 dark:hover:bg-primary/90 text-white font-medium text-sm shadow-md transition-all w-full sm:w-auto disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {savePending ? t('common.saving') : t('settings.saveChanges')}
                  </button>
                </div>
              </div>
            )}

            {/* Plans & Goals Settings Tab */}
            {activeTab === 'plans' && (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-2 pb-6 border-b border-border-light dark:border-slate-700">
                  <h1 className="text-[#111418] dark:text-white text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em]">{t('settings.plansTitle')}</h1>
                  <p className="text-secondary dark:text-slate-400 text-sm font-normal leading-relaxed max-w-lg">
                    {t('settings.plansSubtitle')}
                  </p>
                </div>

                {/* Task Configuration Section */}
                <div className="flex flex-col gap-8">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">{t('settings.taskConfig')}</h3>
                    <div className="space-y-6">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1 pr-6">
                          <span className="text-sm font-medium text-zinc-900 dark:text-white">{t('settings.defaultDuration')}</span>
                          <span className="text-sm text-secondary dark:text-slate-400">{t('settings.defaultDurationHint')}</span>
                        </div>
                        <div className="relative">
                          <select
                            className="appearance-none bg-white dark:bg-slate-700 border border-border-light dark:border-slate-600 rounded-lg pl-3 pr-8 py-2 text-sm text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary focus:border-transparent transition-all cursor-pointer hover:border-zinc-300 dark:hover:border-slate-500"
                            value={plansSettings.defaultDuration}
                            onChange={(e) => handlePlansSettingChange('defaultDuration', e.target.value)}
                          >
                            <option>15 phút</option>
                            <option>30 phút</option>
                            <option>45 phút</option>
                            <option>60 phút</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1 pr-6">
                          <span className="text-sm font-medium text-zinc-900 dark:text-white">{t('settings.autoMoveIncomplete')}</span>
                          <span className="text-sm text-secondary dark:text-slate-400">{t('settings.autoMoveIncompleteHint')}</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            className="sr-only peer"
                            type="checkbox"
                            checked={plansSettings.autoMoveIncomplete}
                            onChange={(e) => handlePlansSettingChange('autoMoveIncomplete', e.target.checked)}
                          />
                          <div className="w-10 h-6 bg-zinc-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Goal Display Section */}
                <div className="pt-6 border-t border-border-light dark:border-slate-700">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">{t('settings.goalDisplay')}</h3>
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1 pr-6">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{t('settings.trackingMethod')}</span>
                        <span className="text-sm text-secondary dark:text-slate-400">{t('settings.trackingMethodHint')}</span>
                      </div>
                      <div className="flex bg-zinc-100 dark:bg-slate-800 rounded-lg p-1 border border-border-light dark:border-slate-600">
                        <button
                          onClick={() => handlePlansSettingChange('trackingMethod', 'tasks')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${plansSettings.trackingMethod === 'tasks'
                              ? 'bg-white dark:bg-slate-700 text-zinc-900 dark:text-white font-semibold shadow-sm border border-border-light dark:border-slate-600'
                              : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                        >
                          {t('settings.byTasks')}
                        </button>
                        <button
                          onClick={() => handlePlansSettingChange('trackingMethod', 'time')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${plansSettings.trackingMethod === 'time'
                              ? 'bg-white dark:bg-slate-700 text-zinc-900 dark:text-white font-semibold shadow-sm border border-border-light dark:border-slate-600'
                              : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                        >
                          {t('settings.byTime')}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-zinc-900 dark:text-slate-200" htmlFor="goal-vision">
                          {t('settings.goalVision')}
                        </label>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline">{t('settings.seeExample')}</span>
                      </div>
                      <textarea
                        className="w-full bg-white dark:bg-slate-700 border border-border-light dark:border-slate-600 rounded-lg px-3 py-3 text-sm text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary focus:border-transparent transition-all resize-none placeholder-zinc-400 dark:placeholder-slate-500"
                        id="goal-vision"
                        placeholder={t('settings.goalVisionPlaceholder')}
                        rows="3"
                        value={plansSettings.goalVision}
                        onChange={(e) => handlePlansSettingChange('goalVision', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Integration & Sync Section */}
                <div className="pt-6 border-t border-border-light dark:border-slate-700">
                  <div className="mb-4 max-w-2xl">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{t('settings.integrationSync')}</h3>
                    <p className="mt-1 text-sm text-secondary dark:text-slate-400 leading-relaxed">{t('settings.integrationSyncSubtitle')}</p>
                  </div>
                  <div className="rounded-xl border border-border-light dark:border-slate-700 bg-zinc-50/80 dark:bg-slate-900/40 shadow-sm overflow-hidden divide-y divide-border-light dark:divide-slate-700">
                    {/* Google Calendar */}
                    <div className="flex flex-col gap-4 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-800/90">
                      <div className="flex gap-4 min-w-0 flex-1">
                        <div
                          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-sky-100/90 dark:from-blue-950/60 dark:to-sky-950/40 text-blue-600 dark:text-blue-400 ring-1 ring-blue-100/90 dark:ring-blue-800/40"
                          aria-hidden
                        >
                          <span className="material-symbols-outlined text-[24px]">calendar_today</span>
                        </div>
                        <div className="min-w-0 flex flex-col gap-0.5 justify-center">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-white">{t('settings.googleCalendar')}</span>
                          <span className="text-xs text-secondary dark:text-slate-400 leading-snug">{t('settings.syncCalendar')}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0 pt-1 border-t border-border-light/70 dark:border-slate-700/80 sm:border-0 sm:pt-0">
                        {plansSettings.googleCalendarConnected ? (
                          <>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/45 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-400">
                              <span className="size-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" aria-hidden />
                              {t('settings.connected')}
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                setDisconnectingGoogle(true);
                                try {
                                  await integrationsAPI.disconnectGoogleCalendar();
                                  const data = await userAPI.getSettings();
                                  if (data?.plans) setPlansSettings(prev => ({ ...prev, ...data.plans }));
                                } catch (_) {
                                  // ignore
                                } finally {
                                  setDisconnectingGoogle(false);
                                }
                              }}
                              disabled={disconnectingGoogle}
                              aria-busy={disconnectingGoogle}
                              className="inline-flex items-center justify-center gap-1.5 min-h-[36px] rounded-lg px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/35 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                            >
                              {disconnectingGoogle ? (
                                <span className="material-symbols-outlined text-[16px] animate-spin" aria-hidden>progress_activity</span>
                              ) : null}
                              {t('settings.disconnect')}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={connectingGoogle}
                            aria-busy={connectingGoogle}
                            onClick={async () => {
                              setConnectingGoogle(true);
                              try {
                                const url = await integrationsAPI.getGoogleCalendarOAuthUrl();
                                window.location.href = url;
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setConnectingGoogle(false);
                              }
                            }}
                            className="inline-flex items-center justify-center gap-1.5 min-h-[36px] rounded-lg bg-zinc-900 dark:bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 dark:hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 transition-colors disabled:opacity-60 disabled:pointer-events-none w-full sm:w-auto"
                          >
                            {connectingGoogle ? (
                              <span className="material-symbols-outlined text-[16px] animate-spin" aria-hidden>progress_activity</span>
                            ) : null}
                            {connectingGoogle ? t('common.loading') : t('settings.connect')}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Todoist */}
                    <div className="flex flex-col gap-4 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-800/90">
                      <div className="flex gap-4 min-w-0 flex-1">
                        <div
                          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-orange-50/90 dark:from-red-950/50 dark:to-orange-950/30 text-red-600 dark:text-red-400 ring-1 ring-red-100/90 dark:ring-red-900/50"
                          aria-hidden
                        >
                          <span className="material-symbols-outlined text-[24px]">task_alt</span>
                        </div>
                        <div className="min-w-0 flex flex-col gap-0.5 justify-center">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-white">{t('settings.todoist')}</span>
                          <span className="text-xs text-secondary dark:text-slate-400 leading-snug">{t('settings.importTasks')}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0 pt-1 border-t border-border-light/70 dark:border-slate-700/80 sm:border-0 sm:pt-0">
                        {plansSettings.todoistConnected ? (
                          <>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/45 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-400">
                              <span className="size-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" aria-hidden />
                              {t('settings.connected')}
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                setDisconnectingTodoist(true);
                                try {
                                  await integrationsAPI.disconnectTodoist();
                                  const data = await userAPI.getSettings();
                                  if (data?.plans) setPlansSettings(prev => ({ ...prev, ...data.plans }));
                                } catch (_) {
                                  // ignore
                                } finally {
                                  setDisconnectingTodoist(false);
                                }
                              }}
                              disabled={disconnectingTodoist}
                              aria-busy={disconnectingTodoist}
                              className="inline-flex items-center justify-center gap-1.5 min-h-[36px] rounded-lg px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/35 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                            >
                              {disconnectingTodoist ? (
                                <span className="material-symbols-outlined text-[16px] animate-spin" aria-hidden>progress_activity</span>
                              ) : null}
                              {t('settings.disconnect')}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={connectingTodoist}
                            aria-busy={connectingTodoist}
                            onClick={async () => {
                              setConnectingTodoist(true);
                              try {
                                const url = await integrationsAPI.getTodoistOAuthUrl();
                                window.location.href = url;
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setConnectingTodoist(false);
                              }
                            }}
                            className="inline-flex items-center justify-center gap-1.5 min-h-[36px] rounded-lg bg-zinc-900 dark:bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 dark:hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 transition-colors disabled:opacity-60 disabled:pointer-events-none w-full sm:w-auto"
                          >
                            {connectingTodoist ? (
                              <span className="material-symbols-outlined text-[16px] animate-spin" aria-hidden>progress_activity</span>
                            ) : null}
                            {connectingTodoist ? t('common.loading') : t('settings.connect')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 mt-2 border-t border-border-light dark:border-slate-700">
                  <button
                    onClick={handleCancel}
                    disabled={savePending}
                    className="px-6 py-2.5 rounded-lg border border-border-light dark:border-slate-600 text-zinc-500 dark:text-slate-300 font-medium text-sm hover:bg-zinc-50 dark:hover:bg-slate-700 transition-colors w-full sm:w-auto disabled:opacity-50"
                  >
                    {t('settings.cancel')}
                  </button>
                  <button
                    onClick={() => {
                      handleSave();
                      console.log('Saving plans settings:', plansSettings);
                    }}
                    disabled={savePending}
                    className="px-6 py-2.5 rounded-lg bg-zinc-900 dark:bg-primary hover:bg-zinc-800 dark:hover:bg-primary/90 text-white font-medium text-sm shadow-sm transition-all w-full sm:w-auto disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {savePending ? t('common.saving') : t('settings.saveChanges')}
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Settings Tab */}
            {activeTab === 'notifications' && (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-2 pb-6 border-b border-border-light dark:border-slate-700">
                  <h1 className="text-[#111418] dark:text-white text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em]">{t('settings.notificationsTitle')}</h1>
                  <p className="text-secondary dark:text-slate-400 text-sm font-normal leading-relaxed max-w-lg">
                    {t('settings.notificationsSubtitle')}
                  </p>
                </div>

                {/* Email Notifications Section */}
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-zinc-900 dark:text-white">mail</span>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{t('settings.emailNotifications')}</h3>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-border-light dark:border-slate-700 shadow-sm p-6 flex flex-col gap-6">
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-slate-700">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{t('settings.weeklySummary')}</span>
                        <span className="text-sm text-secondary dark:text-slate-400">{t('settings.weeklySummaryDesc')}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={notificationSettings.emailWeeklySummary}
                          onChange={(e) => handleNotificationSettingChange('emailWeeklySummary', e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-zinc-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-slate-700">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{t('settings.taskReminders')}</span>
                        <span className="text-sm text-secondary dark:text-slate-400">{t('settings.taskRemindersDesc')}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={notificationSettings.emailTaskReminders}
                          onChange={(e) => handleNotificationSettingChange('emailTaskReminders', e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-zinc-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-slate-700">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{t('settings.goalAchievementEmails')}</span>
                        <span className="text-sm text-secondary dark:text-slate-400">{t('settings.goalAchievementEmailsDesc')}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={!!notificationSettings.emailGoalAchievements}
                          onChange={(e) => handleNotificationSettingChange('emailGoalAchievements', e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-zinc-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between opacity-60 pointer-events-none">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{t('settings.promotionsNews')}</span>
                        <span className="text-sm text-secondary dark:text-slate-400">{t('settings.promotionsDesc')}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-not-allowed">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={false}
                          disabled
                          readOnly
                        />
                        <div className="w-10 h-6 bg-zinc-200 dark:bg-slate-600 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* In-App Notifications Section */}
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-zinc-900 dark:text-white">notifications_active</span>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{t('settings.inAppNotifications')}</h3>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-border-light dark:border-slate-700 shadow-sm p-6 flex flex-col gap-6">
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-slate-700 opacity-60 pointer-events-none">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{t('settings.newActivity')}</span>
                        <span className="text-sm text-secondary dark:text-slate-400">{t('settings.newActivityDesc')}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-not-allowed">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={false}
                          disabled
                          readOnly
                        />
                        <div className="w-10 h-6 bg-zinc-200 dark:bg-slate-600 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{t('settings.goalAchieved')}</span>
                        <span className="text-sm text-secondary dark:text-slate-400">{t('settings.goalAchievedDesc')}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={notificationSettings.inAppGoalAchievements}
                          onChange={(e) => handleNotificationSettingChange('inAppGoalAchievements', e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-zinc-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 mt-2 border-t border-border-light dark:border-slate-700">
                  <button
                    onClick={() => {
                      setNotificationSettings({
                        emailWeeklySummary: true,
                        emailTaskReminders: true,
                        emailGoalAchievements: true,
                        emailPromotions: false,
                        inAppNewActivities: true,
                        inAppGoalAchievements: true,
                        emailFrequency: 'Tổng hợp hàng ngày',
                        notificationSound: 'Mặc định (Ping)',
                      });
                    }}
                    disabled={savePending}
                    className="px-6 py-2.5 rounded-lg border border-border-light dark:border-slate-600 text-zinc-500 dark:text-slate-300 font-medium text-sm hover:bg-white dark:hover:bg-slate-700 hover:text-zinc-900 dark:hover:text-white transition-colors w-full sm:w-auto bg-transparent dark:bg-transparent disabled:opacity-50"
                  >
                    {t('settings.restoreDefaults')}
                  </button>
                  <button
                    onClick={() => {
                      handleSave();
                      console.log('Saving notification settings:', notificationSettings);
                    }}
                    disabled={savePending}
                    className="px-6 py-2.5 rounded-lg bg-zinc-900 dark:bg-primary hover:bg-zinc-800 dark:hover:bg-primary/90 text-white font-medium text-sm shadow-sm transition-all w-full sm:w-auto disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {savePending ? t('common.saving') : t('settings.saveChanges')}
                  </button>
                </div>
              </div>
            )}

            {/* Security Settings Tab */}
            {activeTab === 'security' && (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-2 pb-6 border-b border-border-light dark:border-slate-700">
                  <h1 className="text-[#111418] dark:text-white text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em]">{t('settings.securityTitle')}</h1>
                  <p className="text-secondary dark:text-slate-400 text-sm font-normal leading-relaxed max-w-lg">
                    {t('settings.securitySubtitle')}
                  </p>
                </div>

                {/* Change Password Section */}
                <div className="flex flex-col gap-6">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{t('settings.changePassword')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-w-4xl">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-zinc-900 dark:text-slate-200 mb-2 block" htmlFor="current-password">
                        {t('settings.currentPassword')}
                      </label>
                      <div className="relative">
                        <input
                          className={`w-full bg-white dark:bg-slate-700 border rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary focus:border-transparent transition-all placeholder-zinc-400 dark:placeholder-slate-500 ${securityPasswordErrors.currentPassword ? 'border-red-500' : 'border-border-light dark:border-slate-600'}`}
                          id="current-password"
                          placeholder={t('settings.currentPasswordPlaceholder')}
                          type="password"
                          value={securitySettings.currentPassword}
                          onChange={(e) => {
                            handleSecuritySettingChange('currentPassword', e.target.value);
                            if (securityPasswordErrors.currentPassword) setSecurityPasswordErrors(prev => ({ ...prev, currentPassword: null }));
                            if (securityCaptchaError) setSecurityCaptchaError('');
                          }}
                        />
                        {securityPasswordErrors.currentPassword && (
                          <p className="text-xs text-red-500 mt-1" role="alert">{securityPasswordErrors.currentPassword}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-900 dark:text-slate-200 mb-2 block" htmlFor="new-password">
                        {t('settings.newPassword')}
                      </label>
                      <div className="relative">
                        <input
                          className={`w-full bg-white dark:bg-slate-700 border rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary focus:border-transparent transition-all placeholder-zinc-400 dark:placeholder-slate-500 ${securityPasswordErrors.newPassword ? 'border-red-500' : 'border-border-light dark:border-slate-600'}`}
                          id="new-password"
                          placeholder={t('settings.newPasswordPlaceholder')}
                          type="password"
                          value={securitySettings.newPassword}
                          onChange={(e) => {
                            handleSecuritySettingChange('newPassword', e.target.value);
                            if (securityPasswordErrors.newPassword) setSecurityPasswordErrors(prev => ({ ...prev, newPassword: null }));
                            if (securityCaptchaError) setSecurityCaptchaError('');
                          }}
                        />
                        {securityPasswordErrors.newPassword && (
                          <p className="text-xs text-red-500 mt-1" role="alert">{securityPasswordErrors.newPassword}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-900 dark:text-slate-200 mb-2 block" htmlFor="confirm-password">
                        {t('settings.confirmPassword')}
                      </label>
                      <div className="relative">
                        <input
                          className={`w-full bg-white dark:bg-slate-700 border rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary focus:border-transparent transition-all placeholder-zinc-400 dark:placeholder-slate-500 ${securityPasswordErrors.confirmPassword ? 'border-red-500' : 'border-border-light dark:border-slate-600'}`}
                          id="confirm-password"
                          placeholder={t('settings.confirmPasswordPlaceholder')}
                          type="password"
                          value={securitySettings.confirmPassword}
                          onChange={(e) => {
                            handleSecuritySettingChange('confirmPassword', e.target.value);
                            if (securityPasswordErrors.confirmPassword) setSecurityPasswordErrors(prev => ({ ...prev, confirmPassword: null }));
                            if (securityCaptchaError) setSecurityCaptchaError('');
                          }}
                        />
                        {securityPasswordErrors.confirmPassword && (
                          <p className="text-xs text-red-500 mt-1" role="alert">{securityPasswordErrors.confirmPassword}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-secondary dark:text-slate-500 mt-1">
                    {t('settings.passwordRequirement')}
                  </p>
                  {recaptchaSiteKey && (
                    <div className="flex flex-col gap-2 mt-4">
                      {securityCaptchaError && <ErrorMessage message={securityCaptchaError} />}
                      <div ref={recaptchaContainerRef} className="flex justify-start" />
                    </div>
                  )}
                </div>

                <div className="w-full h-px bg-zinc-100 dark:bg-slate-700"></div>

                {/* Two-Factor Authentication Section */}
                <div className="flex flex-col gap-6">
                  <div className="flex items-start md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{t('settings.twoFactorAuth')}</h3>
                      <p className="text-sm text-secondary dark:text-slate-400 mt-1">
                        {t('settings.twoFactorDesc')}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        className="sr-only peer"
                        type="checkbox"
                        checked={securitySettings.twoFactorAuth}
                        onChange={handle2FAToggle}
                      />
                      <div className="w-10 h-6 bg-zinc-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                <div className="w-full h-px bg-zinc-100 dark:bg-slate-700"></div>

                {/* Active Devices Section */}
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{t('settings.activeDevices')}</h3>
                    <p className="text-sm text-secondary dark:text-slate-400 mt-1">{t('settings.activeDevicesDesc')}</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {devicesLoading && (
                      <p className="text-sm text-secondary dark:text-slate-400 py-4">{t('common.loading', 'Loading...')}</p>
                    )}
                    {!devicesLoading && devicesError && (
                      <p className="text-sm text-red-600 dark:text-red-400 py-2">{devicesError}</p>
                    )}
                    {!devicesLoading && !devicesError && securitySettings.devices.length === 0 && (
                      <p className="text-sm text-secondary dark:text-slate-400 py-4">{t('settings.noLoggedInDevices')}</p>
                    )}
                    {!devicesLoading && !devicesError && securitySettings.devices.map((device) => (
                      <div
                        key={device.id}
                        className={`flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-border-light dark:border-slate-700 rounded-lg shadow-sm ${!device.isCurrent ? 'hover:border-zinc-300 dark:hover:border-slate-600 transition-colors group' : ''
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-zinc-50 dark:bg-slate-700 rounded-full h-fit text-zinc-500 dark:text-slate-400">
                            <span className="material-symbols-outlined text-[24px]">{device.type}</span>
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{device.name}</p>
                              {device.isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 uppercase tracking-wide">
                                  {t('settings.currentDevice')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-secondary dark:text-slate-500 mt-0.5">
                              {device.platform} • {device.lastActive}
                              {device.ipAddress ? ` • ${device.ipAddress}` : ''}
                            </p>
                          </div>
                        </div>
                        {!device.isCurrent && (
                          <button
                            onClick={() => handleLogoutDevice(device.id)}
                            className="p-2 text-zinc-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title={t('settings.logoutDevice')}
                            aria-label={t('settings.logoutDeviceLabel', { name: device.name })}
                          >
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 mt-4 border-t border-border-light dark:border-slate-700">
                  <button
                    onClick={handleCancel}
                    disabled={savePending}
                    className="px-6 py-2.5 rounded-lg border border-border-light dark:border-slate-600 text-zinc-500 dark:text-slate-300 font-medium text-sm hover:bg-zinc-50 dark:hover:bg-slate-700 transition-colors w-full sm:w-auto disabled:opacity-50"
                  >
                    {t('settings.cancel')}
                  </button>
                  <button
                    onClick={() => {
                      handleSave();
                      console.log('Saving security settings:', securitySettings);
                    }}
                    disabled={savePending}
                    className="px-6 py-2.5 rounded-lg bg-zinc-900 dark:bg-primary hover:bg-zinc-800 dark:hover:bg-primary/90 text-white font-medium text-sm shadow-sm transition-all w-full sm:w-auto disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {savePending ? t('common.saving') : t('settings.saveChanges')}
                  </button>
                </div>
              </div>
            )}

            {/* Other tabs content */}
            {activeTab !== 'profile' && activeTab !== 'general' && activeTab !== 'plans' && activeTab !== 'notifications' && activeTab !== 'security' && (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-2 pb-6 border-b border-border-light dark:border-slate-700">
                  <h1 className="text-[#111418] dark:text-white text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em]">
                    {SETTINGS_MENU_ITEMS.find(item => item.id === activeTab) ? t(`settings.${activeTab}`) : t('sidebar.settings')}
                  </h1>
                  <p className="text-secondary dark:text-slate-400 text-sm font-normal leading-relaxed max-w-lg">
                    {t('settings.pageSubtitle')}
                  </p>
                </div>
                <div className="text-center py-12">
                  <p className="text-secondary dark:text-slate-400">{t('settings.contentComingSoon')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Enable 2FA Modal */}
      {modal2FA === 'enable' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 backdrop-blur-sm"
          onClick={close2FAModal}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{t('settings.twoFactorEnableTitle')}</h3>
              <button onClick={close2FAModal} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700" aria-label={t('common.close')}>
                <span className="material-symbols-outlined text-gray-400 dark:text-slate-400">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {twoFactorError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{twoFactorError}</p>
              )}
              {!setup2FAData && !twoFactorError && (
                <p className="text-sm text-secondary dark:text-slate-400">{t('common.loading', 'Loading...')}</p>
              )}
              {setup2FAData && setup2FAData.qrCodeUri && (
                <>
                  <p className="text-sm text-secondary dark:text-slate-400">{t('settings.twoFactorScanQR')}</p>
                  <div className="flex justify-center p-4 bg-white dark:bg-slate-700 border border-border-light dark:border-slate-600 rounded-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setup2FAData.qrCodeUri)}`}
                      alt="QR code"
                      width={200}
                      height={200}
                    />
                  </div>
                  {setup2FAData.sharedKey && (
                    <div>
                      <p className="text-sm text-secondary dark:text-slate-400 mb-1">{t('settings.twoFactorManualKey')}</p>
                      <p className="text-xs font-mono bg-zinc-100 dark:bg-slate-700 p-2 rounded break-all text-zinc-900 dark:text-slate-200">{setup2FAData.sharedKey}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-zinc-900 dark:text-slate-200 block mb-1">{t('settings.twoFactorEnterCode')}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={8}
                      placeholder="000000"
                      className="w-full border border-border-light dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700">
              <button onClick={close2FAModal} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg">
                {t('settings.cancel')}
              </button>
              <button
                onClick={handleEnable2FASubmit}
                disabled={!setup2FAData || !twoFactorCode.trim() || twoFactorLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-primary hover:bg-zinc-800 dark:hover:bg-primary/90 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {twoFactorLoading ? t('common.processing', 'Processing...') : t('settings.twoFactorVerifyEnable')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {modal2FA === 'disable' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 backdrop-blur-sm"
          onClick={close2FAModal}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{t('settings.twoFactorDisableTitle')}</h3>
              <button onClick={close2FAModal} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700" aria-label={t('common.close')}>
                <span className="material-symbols-outlined text-gray-400 dark:text-slate-400">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-secondary dark:text-slate-400">{t('settings.twoFactorDisableDesc')}</p>
              {twoFactorError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{twoFactorError}</p>
              )}
              <div>
                <label className="text-sm font-medium text-zinc-900 dark:text-slate-200 block mb-1">{t('settings.twoFactorEnterCode')}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  placeholder="000000"
                  className="w-full border border-border-light dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-primary"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700">
              <button onClick={close2FAModal} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg">
                {t('settings.cancel')}
              </button>
              <button
                onClick={handleDisable2FASubmit}
                disabled={!twoFactorCode.trim() || twoFactorLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {twoFactorLoading ? t('common.processing', 'Processing...') : t('settings.twoFactorDisableButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Image Modal */}
      {uploadImageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 backdrop-blur-sm transition-all duration-300"
          onClick={handleCloseUploadModal}
        >
          <div
            className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{t('settings.uploadAvatarTitle')}</h3>
                <p className="text-sm text-secondary dark:text-slate-400 mt-0.5">{t('settings.uploadAvatarHint')}</p>
              </div>
              <button
                onClick={handleCloseUploadModal}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                aria-label={t('common.close')}
              >
                <span className="material-symbols-outlined text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Image Preview */}
              {imagePreview ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt={t('settings.preview')}
                      className="w-48 h-48 rounded-full object-cover ring-4 ring-gray-100 dark:ring-slate-600"
                    />
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                      }}
                      className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                      aria-label={t('settings.removeSelectedImage')}
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                  <p className="text-sm text-secondary dark:text-slate-400">{selectedImage?.name}</p>
                </div>
              ) : (
                /* Upload Area */
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-gray-400 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="mb-4 p-4 bg-gray-100 dark:bg-slate-700 rounded-full group-hover:bg-gray-200 dark:group-hover:bg-slate-600 transition-colors">
                      <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-slate-500">cloud_upload</span>
                    </div>
                    <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                      {t('settings.clickOrDrag')}
                    </p>
                    <p className="text-xs text-secondary dark:text-slate-400">{t('settings.fileTypesHint')}</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/jpg,image/png,image/gif"
                    onChange={handleImageSelect}
                  />
                </label>
              )}

              {/* File Size Info */}
              {selectedImage && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">info</span>
                  <p className="text-xs text-blue-900 dark:text-blue-200">
                    {t('settings.fileSizeLabel', { size: (selectedImage.size / 1024).toFixed(2) })}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700">
              <button
                onClick={handleCloseUploadModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {t('settings.cancel')}
              </button>
              <button
                onClick={handleUploadImage}
                disabled={!selectedImage || uploadingAvatar}
                className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-primary hover:bg-zinc-800 dark:hover:bg-primary/90 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-zinc-900 dark:disabled:hover:bg-primary"
              >
                {uploadingAvatar ? t('settings.uploading') : t('settings.uploadImage')}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileSidebarDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );
};

export default SettingsPage;

