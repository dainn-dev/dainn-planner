import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import FormTextarea from '../components/FormTextarea';
import Toggle from '../components/Toggle';
import WarningMessage from '../components/WarningMessage';
import {
  validateName,
  validateEmail,
  validateText,
  validateDescription,
} from '../utils/formValidation';
import {
  INITIAL_PROFILE_FORM,
  INITIAL_SETTINGS,
  INITIAL_GENERAL_SETTINGS,
  INITIAL_PLANS_SETTINGS,
  INITIAL_NOTIFICATION_SETTINGS,
  INITIAL_SECURITY_SETTINGS,
  INITIAL_LOGS_SETTINGS,
  SETTINGS_MENU_ITEMS,
  SETTINGS_ROUTES,
} from '../constants/settings';
import { userAPI, notificationsAPI } from '../services/api';

const SettingsPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('profile');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadImageModalOpen, setUploadImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

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
  const [logsSettings, setLogsSettings] = useState(INITIAL_LOGS_SETTINGS);
  const [profileErrors, setProfileErrors] = useState({});
  const [warningMessage, setWarningMessage] = useState('');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileData, notificationsData] = await Promise.all([
          userAPI.getProfile(),
          notificationsAPI.getNotifications({ limit: 20 }),
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
      } catch (error) {
        console.error('Failed to load profile or notifications:', error);
      }
    };
    load();
  }, []);

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
  const handleLogsSettingChange = createHandler(setLogsSettings);

  const showWarning = (message = 'Thay đổi đã được lưu thành công.') => {
    setWarningMessage(message);
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setWarningMessage('');
    }, 3000);
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
        errors.job = validateText(value, 'Nghề nghiệp', false, 1, 100);
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
    const errors = {};
    errors.fullname = validateName(profileForm.fullname, true, 2, 255);
    errors.email = validateEmail(profileForm.email, true);
    errors.job = validateText(profileForm.job, 'Nghề nghiệp', false, 1, 100);
    errors.bio = validateDescription(profileForm.bio, false, 150);

    const hasErrors = Object.values(errors).some(error => error !== null);
    if (hasErrors) {
      setProfileErrors(errors);
      return;
    }

    try {
      await userAPI.updateProfile({
        fullName: profileForm.fullname,
        phone: profileForm.phone || undefined,
        location: profileForm.location || undefined,
      });
      showWarning('Thay đổi đã được lưu thành công.');
    } catch (error) {
      console.error('Failed to save profile:', error);
      showWarning(error.message || 'Không thể lưu thay đổi.');
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setProfileForm(INITIAL_PROFILE_FORM);
    setSettings(INITIAL_SETTINGS);
    setGeneralSettings(INITIAL_GENERAL_SETTINGS);
    setPlansSettings(INITIAL_PLANS_SETTINGS);
    setNotificationSettings(INITIAL_NOTIFICATION_SETTINGS);
    setSecuritySettings(INITIAL_SECURITY_SETTINGS);
    setLogsSettings(INITIAL_LOGS_SETTINGS);
    setProfileErrors({});
  };

  const handleLogoutDevice = (deviceId) => {
    showWarning();
    setSecuritySettings(prev => ({
      ...prev,
      devices: prev.devices.filter(device => device.id !== deviceId)
    }));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước file không được vượt quá 5MB');
        return;
      }
      
      // Check file type
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
        alert('Chỉ chấp nhận file JPG, PNG hoặc GIF');
        return;
      }
      
      showWarning();
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImage = () => {
    if (selectedImage) {
      showWarning();
      // Handle image upload logic here
      console.log('Uploading image:', selectedImage);
      // Reset and close modal
      setUploadImageModalOpen(false);
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleCloseUploadModal = () => {
    setUploadImageModalOpen(false);
    setSelectedImage(null);
    setImagePreview(null);
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background-subtle text-zinc-900 antialiased selection:bg-zinc-200">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative bg-background-subtle">
        <Header 
          title="Thiết lập"
          icon="settings"
          notifications={notifications}
          onNotificationsChange={setNotifications}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Mobile Navigation - horizontal scrollable nav bar on mobile only */}
        <div className="md:hidden flex border-t border-gray-100 bg-white overflow-x-auto overflow-y-hidden shrink-0">
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
                  className={`flex items-center gap-1.5 py-3 font-medium text-sm whitespace-nowrap px-3 transition-colors shrink-0 ${
                    isActive
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="w-full max-w-[1000px] mx-auto px-6 sm:px-10 py-10 flex flex-col md:flex-row gap-12">
          {/* Desktop Sidebar Navigation */}
          <aside className="hidden md:flex w-64 shrink-0 flex-col gap-8">
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
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                    activeTab === item.id
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
                );
              })}
            </nav>
            <div className="mt-auto pt-6 border-t border-border-light">
              <div className="flex items-center gap-3 p-2 mb-4 rounded-lg">
                <div 
                  className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 border border-border-light" 
                  style={{
                    backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBCtFx01cYSACUL07m2FoxkYifPJxc1kikrbJHPn_2E4F5XbO4gz5pRaBdG13t81QaQ6hf87qSRVvSx2pRBPbDdHwQUuRMarZR3wCFUEPfMw74y8dPn75sHD7rxRHVkw_OTCRhPWcIbg27FcTi2IitDK80BVMyPZcBQ4YXWt-LW1iQSBDYpxa1-1kmWPjaIqWudiePV1T8rMiKJx_-fr5r4AraA4xW6KZNoJTMdUMwMq7MwO6HidMTyIzePmO22QihHKy4TqjBfo-BT")'
                  }}
                  aria-label="User profile picture"
                />
                <div className="flex flex-col overflow-hidden">
                  <h3 className="text-zinc-900 text-sm font-semibold truncate">{profileForm.fullname}</h3>
                  <p className="text-secondary text-xs truncate">{profileForm.email}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  window.location.href = '/login';
                }}
                className="flex items-center gap-3 px-2 py-2 text-zinc-500 hover:text-red-600 text-sm font-medium transition-colors w-full text-left group"
              >
                <span className="material-symbols-outlined text-zinc-400 group-hover:text-red-600 transition-colors" style={{ fontSize: '20px' }}>logout</span>
                <span>Đăng xuất</span>
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {activeTab === 'profile' && (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-2 pb-6 border-b border-border-light">
                  <h1 className="text-2xl font-light tracking-tight text-zinc-900">Hồ sơ cá nhân</h1>
                  <p className="text-secondary text-sm font-normal leading-relaxed max-w-lg">
                    Quản lý thông tin cá nhân và cách bạn xuất hiện trên MyPlanner.
                  </p>
                </div>
                {warningMessage && (
                  <WarningMessage 
                    message={warningMessage} 
                    onClose={() => setWarningMessage('')}
                  />
                )}

                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
                  <div className="relative group cursor-pointer">
                    <div 
                      className="bg-center bg-no-repeat bg-cover rounded-full size-24 ring-1 ring-border-light" 
                      style={{
                        backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB7PvkbSdyu-lOROzAqIltyjA0Ro2rU2T002DOP8tnhXDqkJaEtlN7pMb5rlIoDPszc4CWKBB0KOf7F7YSDItkuv1Nl6foUVE4jUst9hIFyxkXl8Q9S4Fv9t52DEetKKoJuWspDxqlZE4vC9P7Pgiz5qDQ-Z6SGGqszqA8iDf2OXXsmMaeIRGU4qZxQ-Wr6tHPn_wUS4-dD_h0UelOsnDHjryZJOmtxArgH4rX7GovnpUA5lTs2eidUmZ87AtGizMKuqDNr97FnsN6p")'
                      }}
                      aria-label="Large user avatar preview"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white">edit</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 flex-1">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-900">Ảnh đại diện</h3>
                      <p className="text-sm text-secondary mt-1">Chấp nhận JPG, GIF hoặc PNG. Tối đa 5MB.</p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          showWarning();
                          setUploadImageModalOpen(true);
                        }}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                      >
                        Tải ảnh mới
                      </button>
                      <button 
                        onClick={() => showWarning()}
                        className="px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-900 text-sm font-medium rounded-lg border border-border-light transition-colors"
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="flex flex-col gap-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <FormInput
                          id="fullname"
                      label="Họ và tên"
                          type="text"
                          value={profileForm.fullname}
                          onChange={(e) => handleProfileChange('fullname', e.target.value)}
                          onBlur={(e) => handleProfileBlur('fullname', e.target.value)}
                      placeholder="Nhập họ tên của bạn"
                          required
                          error={profileErrors.fullname}
                    />
                    <FormInput
                          id="email"
                      label="Địa chỉ Email"
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => handleProfileChange('email', e.target.value)}
                          onBlur={(e) => handleProfileBlur('email', e.target.value)}
                      placeholder="name@example.com"
                          required
                          error={profileErrors.email}
                    />
                    <FormInput
                          id="job"
                      label="Nghề nghiệp"
                          type="text"
                          value={profileForm.job}
                          onChange={(e) => handleProfileChange('job', e.target.value)}
                          onBlur={(e) => handleProfileBlur('job', e.target.value)}
                      placeholder="Ví dụ: Product Designer"
                          error={profileErrors.job}
                    />
                    <FormSelect
                          id="location"
                      label="Địa điểm"
                          value={profileForm.location}
                          onChange={(e) => handleProfileChange('location', e.target.value)}
                      options={[
                        'Hà Nội, Việt Nam',
                        'Hồ Chí Minh, Việt Nam',
                        'Đà Nẵng, Việt Nam'
                      ]}
                    />
                      </div>
                  <FormTextarea
                      id="bio"
                    label="Câu châm ngôn / Giới thiệu"
                      value={profileForm.bio}
                      onChange={(e) => handleProfileChange('bio', e.target.value)}
                      onBlur={(e) => handleProfileBlur('bio', e.target.value)}
                    placeholder="Viết một câu ngắn gọn về mục tiêu của bạn..."
                    rows={4}
                      maxLength={150}
                      error={profileErrors.bio}
                    />
                </div>

                {/* Display Options */}
                <div className="pt-6 border-t border-border-light">
                  <h3 className="text-base font-semibold text-zinc-900 mb-6">Tùy chọn hiển thị</h3>
                  <div className="flex flex-col gap-6">
                    <Toggle
                      id="darkMode"
                      label="Chế độ tối"
                      description="Sử dụng giao diện tối cho ứng dụng."
                          checked={settings.darkMode}
                          onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                      className="pb-4 border-b border-zinc-100"
                        />
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900">Ngày bắt đầu tuần</span>
                        <span className="text-sm text-secondary">Chọn ngày bắt đầu lịch của bạn.</span>
                      </div>
                      <div className="flex bg-zinc-100 rounded-lg p-1 border border-border-light">
                        <button
                          onClick={() => handleSettingChange('weekStartDay', 'monday')}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                            settings.weekStartDay === 'monday'
                              ? 'bg-white text-zinc-900 font-semibold shadow-sm border border-border-light'
                              : 'text-zinc-500 hover:text-zinc-900'
                          }`}
                        >
                          Thứ Hai
                        </button>
                        <button
                          onClick={() => handleSettingChange('weekStartDay', 'sunday')}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                            settings.weekStartDay === 'sunday'
                              ? 'bg-white text-zinc-900 font-semibold shadow-sm border border-border-light'
                              : 'text-zinc-500 hover:text-zinc-900'
                          }`}
                        >
                          Chủ Nhật
                        </button>
                      </div>
                    </div>
                    <Toggle
                      id="publicProfile"
                      label="Hồ sơ công khai"
                      description="Cho phép người khác tìm thấy bạn qua email."
                          checked={settings.publicProfile}
                          onChange={(e) => handleSettingChange('publicProfile', e.target.checked)}
                        />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 mt-2 border-t border-border-light">
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2.5 rounded-lg border border-border-light text-zinc-500 font-medium text-sm hover:bg-zinc-50 transition-colors w-full sm:w-auto"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm shadow-sm transition-all w-full sm:w-auto"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            )}

            {/* General Settings Tab */}
            {activeTab === 'general' && (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-2 pb-6 border-b border-border-light">
                  <h1 className="text-2xl font-light tracking-tight text-zinc-900">Tùy chọn chung</h1>
                  <p className="text-secondary text-sm font-normal leading-relaxed max-w-lg">
                    Tùy chỉnh trải nghiệm của bạn với các cài đặt về ngôn ngữ, thời gian và hiển thị.
                  </p>
                </div>
                {warningMessage && (
                  <WarningMessage 
                    message={warningMessage} 
                    onClose={() => setWarningMessage('')}
                  />
                )}

                {/* Region & Language Section */}
                <div className="flex flex-col gap-8">
                  <h3 className="text-base font-semibold text-zinc-900">Khu vực & Ngôn ngữ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-zinc-900" htmlFor="language">
                        Ngôn ngữ hiển thị
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none bg-white border border-border-light rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all shadow-sm cursor-pointer"
                          id="language"
                          value={generalSettings.language}
                          onChange={(e) => handleGeneralSettingChange('language', e.target.value)}
                        >
                          <option>Tiếng Việt (Vietnamese)</option>
                          <option>English (United States)</option>
                          <option>Français (French)</option>
                          <option>日本語 (Japanese)</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-2.5 text-zinc-400 pointer-events-none text-[18px]">expand_more</span>
                      </div>
                      <p className="text-xs text-secondary">Thay đổi này sẽ áp dụng cho toàn bộ giao diện.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-zinc-900" htmlFor="timezone">
                        Múi giờ
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none bg-white border border-border-light rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all shadow-sm cursor-pointer"
                          id="timezone"
                          value={generalSettings.timezone}
                          onChange={(e) => handleGeneralSettingChange('timezone', e.target.value)}
                        >
                          <option>(GMT+00:00) UTC</option>
                          <option>(GMT+07:00) Bangkok, Hanoi, Jakarta</option>
                          <option>(GMT+08:00) Singapore</option>
                          <option>(GMT+09:00) Tokyo, Seoul</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-2.5 text-zinc-400 pointer-events-none text-[18px]">expand_more</span>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-zinc-100" />

                {/* Date & Time Section */}
                <div className="flex flex-col gap-8">
                  <div className="flex justify-between items-end">
                    <h3 className="text-base font-semibold text-zinc-900">Ngày & Giờ</h3>
                  </div>
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900">Định dạng ngày</span>
                        <span className="text-sm text-secondary">Cách hiển thị ngày tháng trong lịch trình.</span>
                      </div>
                      <div className="relative w-full sm:w-48">
                        <select
                          className="w-full appearance-none bg-white border border-border-light rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all shadow-sm cursor-pointer"
                          value={generalSettings.dateFormat}
                          onChange={(e) => handleGeneralSettingChange('dateFormat', e.target.value)}
                        >
                          <option>31/12/2024 (DD/MM/YYYY)</option>
                          <option>12/31/2024 (MM/DD/YYYY)</option>
                          <option>2024-12-31 (YYYY-MM-DD)</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-2 text-zinc-400 pointer-events-none text-[18px]">expand_more</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900">Định dạng giờ</span>
                        <span className="text-sm text-secondary">Chọn giữa hệ thống 12 giờ hoặc 24 giờ.</span>
                      </div>
                      <div className="flex bg-white rounded-lg p-1 border border-border-light shadow-sm">
                        <button
                          onClick={() => handleGeneralSettingChange('timeFormat', '12')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            generalSettings.timeFormat === '12'
                              ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-sm border border-border-light'
                              : 'text-zinc-500 hover:text-zinc-900'
                          }`}
                        >
                          12 giờ (2:30 PM)
                        </button>
                        <button
                          onClick={() => handleGeneralSettingChange('timeFormat', '24')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            generalSettings.timeFormat === '24'
                              ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-sm border border-border-light'
                              : 'text-zinc-500 hover:text-zinc-900'
                          }`}
                        >
                          24 giờ (14:30)
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900">Ngày bắt đầu tuần</span>
                        <span className="text-sm text-secondary">Ngày đầu tiên hiển thị trên lịch tuần.</span>
                      </div>
                      <div className="flex bg-white rounded-lg p-1 border border-border-light shadow-sm">
                        <button
                          onClick={() => handleGeneralSettingChange('weekStartDay', 'monday')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            generalSettings.weekStartDay === 'monday'
                              ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-sm border border-border-light'
                              : 'text-zinc-500 hover:text-zinc-900'
                          }`}
                        >
                          Thứ Hai
                        </button>
                        <button
                          onClick={() => handleGeneralSettingChange('weekStartDay', 'sunday')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            generalSettings.weekStartDay === 'sunday'
                              ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-sm border border-border-light'
                              : 'text-zinc-500 hover:text-zinc-900'
                          }`}
                        >
                          Chủ Nhật
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 mt-2 border-t border-border-light">
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2.5 rounded-lg border border-border-light bg-white text-zinc-500 font-medium text-sm hover:bg-zinc-50 hover:text-zinc-900 transition-colors w-full sm:w-auto shadow-sm"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={() => {
                      handleSave();
                      console.log('Saving general settings:', generalSettings);
                    }}
                    className="px-6 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm shadow-md transition-all w-full sm:w-auto"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            )}

            {/* Plans & Goals Settings Tab */}
            {activeTab === 'plans' && (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-2 pb-6 border-b border-border-light">
                  <h1 className="text-2xl font-light tracking-tight text-zinc-900">Kế hoạch & Mục tiêu</h1>
                  <p className="text-secondary text-sm font-normal leading-relaxed max-w-lg">
                    Tùy chỉnh cách bạn lập kế hoạch và theo dõi tiến độ mục tiêu cá nhân.
                  </p>
                </div>
                {warningMessage && (
                  <WarningMessage 
                    message={warningMessage} 
                    onClose={() => setWarningMessage('')}
                  />
                )}

                {/* Task Configuration Section */}
                <div className="flex flex-col gap-8">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900 mb-4">Cấu hình Nhiệm vụ</h3>
                    <div className="space-y-6">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1 pr-6">
                          <span className="text-sm font-medium text-zinc-900">Thời lượng mặc định</span>
                          <span className="text-sm text-secondary">Thời gian được gán tự động cho nhiệm vụ mới.</span>
                        </div>
                        <div className="relative">
                          <select
                            className="appearance-none bg-white border border-border-light rounded-lg pl-3 pr-8 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all cursor-pointer hover:border-zinc-300"
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
                          <span className="text-sm font-medium text-zinc-900">Tự động chuyển nhiệm vụ chưa hoàn thành</span>
                          <span className="text-sm text-secondary">Tự động dời các nhiệm vụ chưa xong sang ngày hôm sau.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            className="sr-only peer"
                            type="checkbox"
                            checked={plansSettings.autoMoveIncomplete}
                            onChange={(e) => handlePlansSettingChange('autoMoveIncomplete', e.target.checked)}
                          />
                          <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Goal Display Section */}
                <div className="pt-6 border-t border-border-light">
                  <h3 className="text-base font-semibold text-zinc-900 mb-4">Hiển thị Mục tiêu</h3>
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1 pr-6">
                        <span className="text-sm font-medium text-zinc-900">Phương pháp theo dõi</span>
                        <span className="text-sm text-secondary">Cách tính % hoàn thành mục tiêu.</span>
                      </div>
                      <div className="flex bg-zinc-100 rounded-lg p-1 border border-border-light">
                        <button
                          onClick={() => handlePlansSettingChange('trackingMethod', 'tasks')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            plansSettings.trackingMethod === 'tasks'
                              ? 'bg-white text-zinc-900 font-semibold shadow-sm border border-border-light'
                              : 'text-zinc-500 hover:text-zinc-900'
                          }`}
                        >
                          Theo đầu việc
                        </button>
                        <button
                          onClick={() => handlePlansSettingChange('trackingMethod', 'time')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            plansSettings.trackingMethod === 'time'
                              ? 'bg-white text-zinc-900 font-semibold shadow-sm border border-border-light'
                              : 'text-zinc-500 hover:text-zinc-900'
                          }`}
                        >
                          Theo thời gian
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-zinc-900" htmlFor="goal-vision">
                          Tầm nhìn dài hạn (Năm)
                        </label>
                        <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">Xem ví dụ</span>
                      </div>
                      <textarea
                        className="w-full bg-white border border-border-light rounded-lg px-3 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all resize-none placeholder-zinc-400"
                        id="goal-vision"
                        placeholder="Mô tả ngắn gọn về điều bạn muốn đạt được trong năm nay..."
                        rows="3"
                        value={plansSettings.goalVision}
                        onChange={(e) => handlePlansSettingChange('goalVision', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Integration & Sync Section */}
                <div className="pt-6 border-t border-border-light">
                  <h3 className="text-base font-semibold text-zinc-900 mb-4">Tích hợp & Đồng bộ</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-border-light rounded-lg p-4 flex items-center justify-between hover:border-zinc-300 transition-colors bg-white">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                          <span className="material-symbols-outlined">calendar_today</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-900">Google Calendar</h4>
                          <p className="text-xs text-secondary">Đồng bộ lịch biểu</p>
                        </div>
                      </div>
                      {plansSettings.googleCalendarConnected ? (
                        <button className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-transparent">
                          Đã kết nối
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePlansSettingChange('googleCalendarConnected', true)}
                          className="text-xs font-medium text-zinc-900 border border-border-light px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors"
                        >
                          Kết nối
                        </button>
                      )}
                    </div>
                    <div className="border border-border-light rounded-lg p-4 flex items-center justify-between hover:border-zinc-300 transition-colors bg-white">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                          <span className="material-symbols-outlined">check_circle</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-900">Todoist</h4>
                          <p className="text-xs text-secondary">Nhập nhiệm vụ</p>
                        </div>
                      </div>
                      {plansSettings.todoistConnected ? (
                        <button className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-transparent">
                          Đã kết nối
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePlansSettingChange('todoistConnected', true)}
                          className="text-xs font-medium text-zinc-900 border border-border-light px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors"
                        >
                          Kết nối
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 mt-2 border-t border-border-light">
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2.5 rounded-lg border border-border-light text-zinc-500 font-medium text-sm hover:bg-zinc-50 transition-colors w-full sm:w-auto"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={() => {
                      handleSave();
                      console.log('Saving plans settings:', plansSettings);
                    }}
                    className="px-6 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm shadow-sm transition-all w-full sm:w-auto"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Settings Tab */}
            {activeTab === 'notifications' && (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-2 pb-6 border-b border-border-light">
                  <h1 className="text-2xl font-light tracking-tight text-zinc-900">Cài đặt thông báo</h1>
                  <p className="text-secondary text-sm font-normal leading-relaxed max-w-lg">
                    Quản lý cách bạn nhận thông báo và cập nhật từ MyPlanner.
                  </p>
                </div>
                {warningMessage && (
                  <WarningMessage 
                    message={warningMessage} 
                    onClose={() => setWarningMessage('')}
                  />
                )}

                {/* Email Notifications Section */}
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-zinc-900">mail</span>
                    <h3 className="text-base font-semibold text-zinc-900">Thông báo qua Email</h3>
                  </div>
                  <div className="bg-white rounded-lg border border-border-light shadow-sm p-6 flex flex-col gap-6">
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900">Tổng kết tuần</span>
                        <span className="text-sm text-secondary">Nhận email tóm tắt hiệu suất làm việc mỗi tuần.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={notificationSettings.emailWeeklySummary}
                          onChange={(e) => handleNotificationSettingChange('emailWeeklySummary', e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900">Nhắc nhở công việc</span>
                        <span className="text-sm text-secondary">Nhận email khi có công việc sắp đến hạn hoặc quá hạn.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={notificationSettings.emailTaskReminders}
                          onChange={(e) => handleNotificationSettingChange('emailTaskReminders', e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900">Khuyến mãi & Tin tức</span>
                        <span className="text-sm text-secondary">Thông tin về các tính năng mới và mẹo sử dụng.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={notificationSettings.emailPromotions}
                          onChange={(e) => handleNotificationSettingChange('emailPromotions', e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* In-App Notifications Section */}
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-zinc-900">notifications_active</span>
                    <h3 className="text-base font-semibold text-zinc-900">Thông báo trong ứng dụng</h3>
                  </div>
                  <div className="bg-white rounded-lg border border-border-light shadow-sm p-6 flex flex-col gap-6">
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900">Hoạt động mới</span>
                        <span className="text-sm text-secondary">Thông báo khi có bình luận hoặc tương tác mới.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={notificationSettings.inAppNewActivities}
                          onChange={(e) => handleNotificationSettingChange('inAppNewActivities', e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-zinc-900">Mục tiêu đạt được</span>
                        <span className="text-sm text-secondary">Chúc mừng khi bạn hoàn thành mục tiêu đề ra.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={notificationSettings.inAppGoalAchievements}
                          onChange={(e) => handleNotificationSettingChange('inAppGoalAchievements', e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* General Configuration Section */}
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-zinc-900">tune</span>
                    <h3 className="text-base font-semibold text-zinc-900">Cấu hình chung</h3>
                  </div>
                  <div className="bg-white rounded-lg border border-border-light shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-zinc-900" htmlFor="frequency">
                        Tần suất gửi email
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none bg-background-subtle border border-border-light rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all cursor-pointer hover:bg-white"
                          id="frequency"
                          value={notificationSettings.emailFrequency}
                          onChange={(e) => handleNotificationSettingChange('emailFrequency', e.target.value)}
                        >
                          <option>Ngay lập tức</option>
                          <option>Tổng hợp hàng ngày</option>
                          <option>Tổng hợp hàng tuần</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-2.5 text-zinc-400 pointer-events-none text-[18px]">expand_more</span>
                      </div>
                      <p className="text-xs text-secondary">Tần suất bạn nhận email tổng hợp các thông báo.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-zinc-900" htmlFor="sound">
                        Âm thanh thông báo
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none bg-background-subtle border border-border-light rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all cursor-pointer hover:bg-white"
                          id="sound"
                          value={notificationSettings.notificationSound}
                          onChange={(e) => handleNotificationSettingChange('notificationSound', e.target.value)}
                        >
                          <option>Mặc định (Ping)</option>
                          <option>Nhẹ nhàng (Ripple)</option>
                          <option>Vui nhộn (Bounce)</option>
                          <option>Tắt âm thanh</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-2.5 text-zinc-400 pointer-events-none text-[18px]">volume_up</span>
                      </div>
                      <p className="text-xs text-secondary">Âm thanh phát ra khi bạn đang sử dụng ứng dụng.</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 mt-2 border-t border-border-light">
                  <button
                    onClick={() => {
                      showWarning();
                      setNotificationSettings({
                        emailWeeklySummary: true,
                        emailTaskReminders: true,
                        emailPromotions: false,
                        inAppNewActivities: true,
                        inAppGoalAchievements: true,
                        emailFrequency: 'Tổng hợp hàng ngày',
                        notificationSound: 'Mặc định (Ping)',
                      });
                    }}
                    className="px-6 py-2.5 rounded-lg border border-border-light text-zinc-500 font-medium text-sm hover:bg-white hover:text-zinc-900 transition-colors w-full sm:w-auto bg-transparent"
                  >
                    Khôi phục mặc định
                  </button>
                  <button
                    onClick={() => {
                      handleSave();
                      console.log('Saving notification settings:', notificationSettings);
                    }}
                    className="px-6 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm shadow-sm transition-all w-full sm:w-auto"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            )}

            {/* Security Settings Tab */}
            {activeTab === 'security' && (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-2 pb-6 border-b border-border-light">
                  <h1 className="text-2xl font-light tracking-tight text-zinc-900">Bảo mật & Đăng nhập</h1>
                  <p className="text-secondary text-sm font-normal leading-relaxed max-w-lg">
                    Quản lý mật khẩu, xác thực hai yếu tố và các phiên đăng nhập của bạn để giữ tài khoản an toàn.
                  </p>
                </div>
                {warningMessage && (
                  <WarningMessage 
                    message={warningMessage} 
                    onClose={() => setWarningMessage('')}
                  />
                )}

                {/* Change Password Section */}
                <div className="flex flex-col gap-6">
                  <h3 className="text-base font-semibold text-zinc-900">Đổi mật khẩu</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-w-4xl">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-zinc-900 mb-2 block" htmlFor="current-password">
                        Mật khẩu hiện tại
                      </label>
                      <div className="relative">
                        <input
                          className="w-full bg-white border border-border-light rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder-zinc-400"
                          id="current-password"
                          placeholder="Nhập mật khẩu hiện tại"
                          type="password"
                          value={securitySettings.currentPassword}
                          onChange={(e) => handleSecuritySettingChange('currentPassword', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-900 mb-2 block" htmlFor="new-password">
                        Mật khẩu mới
                      </label>
                      <div className="relative">
                        <input
                          className="w-full bg-white border border-border-light rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder-zinc-400"
                          id="new-password"
                          placeholder="Nhập mật khẩu mới"
                          type="password"
                          value={securitySettings.newPassword}
                          onChange={(e) => handleSecuritySettingChange('newPassword', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-900 mb-2 block" htmlFor="confirm-password">
                        Xác nhận mật khẩu mới
                      </label>
                      <div className="relative">
                        <input
                          className="w-full bg-white border border-border-light rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder-zinc-400"
                          id="confirm-password"
                          placeholder="Nhập lại mật khẩu mới"
                          type="password"
                          value={securitySettings.confirmPassword}
                          onChange={(e) => handleSecuritySettingChange('confirmPassword', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-secondary mt-1">
                    Mật khẩu phải có ít nhất 8 ký tự, bao gồm cả chữ và số để đảm bảo an toàn.
                  </p>
                </div>

                <div className="w-full h-px bg-zinc-100"></div>

                {/* Two-Factor Authentication Section */}
                <div className="flex flex-col gap-6">
                  <div className="flex items-start md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-900">Xác thực hai yếu tố (2FA)</h3>
                      <p className="text-sm text-secondary mt-1">
                        Thêm một lớp bảo mật bổ sung bằng cách yêu cầu mã xác minh từ ứng dụng điện thoại.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        className="sr-only peer"
                        type="checkbox"
                        checked={securitySettings.twoFactorAuth}
                        onChange={(e) => handleSecuritySettingChange('twoFactorAuth', e.target.checked)}
                      />
                      <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                    </label>
                  </div>
                </div>

                <div className="w-full h-px bg-zinc-100"></div>

                {/* Active Devices Section */}
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">Thiết bị đã đăng nhập</h3>
                    <p className="text-sm text-secondary mt-1">Bạn đang đăng nhập trên các thiết bị này.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {securitySettings.devices.map((device) => (
                      <div
                        key={device.id}
                        className={`flex items-center justify-between p-4 bg-white border border-border-light rounded-lg shadow-sm ${
                          !device.isCurrent ? 'hover:border-zinc-300 transition-colors group' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-zinc-50 rounded-full h-fit text-zinc-500">
                            <span className="material-symbols-outlined text-[24px]">{device.type}</span>
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-zinc-900">{device.name}</p>
                              {device.isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 uppercase tracking-wide">
                                  Hiện tại
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-secondary mt-0.5">
                              {device.location} • {device.lastActive}
                            </p>
                          </div>
                        </div>
                        {!device.isCurrent && (
                          <button
                            onClick={() => handleLogoutDevice(device.id)}
                            className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Đăng xuất khỏi thiết bị này"
                            aria-label={`Đăng xuất khỏi ${device.name}`}
                          >
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 mt-4 border-t border-border-light">
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2.5 rounded-lg border border-border-light text-zinc-500 font-medium text-sm hover:bg-zinc-50 transition-colors w-full sm:w-auto"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={() => {
                      handleSave();
                      console.log('Saving security settings:', securitySettings);
                    }}
                    className="px-6 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm shadow-sm transition-all w-full sm:w-auto"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            )}

            {/* Logs Settings Tab */}
            {activeTab === 'logs' && (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-2 pb-6 border-b border-border-light">
                  <h1 className="text-2xl font-light tracking-tight text-zinc-900">Cài đặt Nhật ký</h1>
                  <p className="text-secondary text-sm font-normal leading-relaxed max-w-lg">
                    Quản lý cài đặt nhật ký hoạt động, lưu trữ và xuất dữ liệu nhật ký của bạn.
                  </p>
                </div>

                {/* Log Level Section */}
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">Mức độ nhật ký</h3>
                    <p className="text-sm text-secondary mt-1">Chọn mức độ chi tiết của nhật ký được ghi lại.</p>
                  </div>
                  <div className="max-w-md">
                    <FormSelect
                      label="Mức độ nhật ký"
                      value={logsSettings.logLevel}
                      onChange={(e) => handleLogsSettingChange('logLevel', e.target.value)}
                      options={[
                        { value: 'debug', label: 'Debug - Tất cả thông tin chi tiết' },
                        { value: 'info', label: 'Info - Thông tin chung (Khuyến nghị)' },
                        { value: 'warn', label: 'Warning - Chỉ cảnh báo và lỗi' },
                        { value: 'error', label: 'Error - Chỉ lỗi' },
                      ]}
                    />
                  </div>
                </div>

                <div className="w-full h-px bg-zinc-100"></div>

                {/* Log Retention Section */}
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">Lưu trữ nhật ký</h3>
                    <p className="text-sm text-secondary mt-1">Cài đặt thời gian lưu trữ nhật ký trước khi tự động xóa.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-w-4xl">
                    <div>
                      <label className="text-sm font-medium text-zinc-900 mb-2 block" htmlFor="log-retention">
                        Thời gian lưu trữ (ngày)
                      </label>
                      <input
                        className="w-full bg-white border border-border-light rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder-zinc-400"
                        id="log-retention"
                        type="number"
                        min="1"
                        max="365"
                        value={logsSettings.logRetentionDays}
                        onChange={(e) => handleLogsSettingChange('logRetentionDays', e.target.value)}
                      />
                      <p className="text-xs text-secondary mt-1">Nhật ký cũ hơn sẽ tự động bị xóa.</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-900 mb-2 block" htmlFor="max-log-size">
                        Kích thước tệp tối đa (MB)
                      </label>
                      <input
                        className="w-full bg-white border border-border-light rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder-zinc-400"
                        id="max-log-size"
                        type="number"
                        min="1"
                        max="100"
                        value={logsSettings.maxLogFileSize}
                        onChange={(e) => handleLogsSettingChange('maxLogFileSize', e.target.value)}
                      />
                      <p className="text-xs text-secondary mt-1">Tệp nhật ký sẽ được tách khi đạt kích thước này.</p>
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-zinc-100"></div>

                {/* Log Types Section */}
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">Loại nhật ký</h3>
                    <p className="text-sm text-secondary mt-1">Chọn các loại nhật ký bạn muốn ghi lại.</p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start md:items-center justify-between gap-4 p-4 bg-white border border-border-light rounded-lg">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900">Nhật ký hoạt động</h4>
                        <p className="text-xs text-secondary mt-1">Ghi lại các hoạt động và thay đổi trong tài khoản của bạn.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={logsSettings.enableActivityLogs}
                          onChange={(e) => handleLogsSettingChange('enableActivityLogs', e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                      </label>
                    </div>
                    <div className="flex items-start md:items-center justify-between gap-4 p-4 bg-white border border-border-light rounded-lg">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900">Nhật ký lỗi</h4>
                        <p className="text-xs text-secondary mt-1">Ghi lại các lỗi và sự cố hệ thống để khắc phục.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={logsSettings.enableErrorLogs}
                          onChange={(e) => handleLogsSettingChange('enableErrorLogs', e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                      </label>
                    </div>
                    <div className="flex items-start md:items-center justify-between gap-4 p-4 bg-white border border-border-light rounded-lg">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900">Nhật ký truy cập</h4>
                        <p className="text-xs text-secondary mt-1">Ghi lại thông tin đăng nhập và truy cập tài khoản.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={logsSettings.enableAccessLogs}
                          onChange={(e) => handleLogsSettingChange('enableAccessLogs', e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-zinc-100"></div>

                {/* Export Settings Section */}
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">Xuất nhật ký</h3>
                    <p className="text-sm text-secondary mt-1">Cài đặt tự động xuất và gửi nhật ký.</p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start md:items-center justify-between gap-4 p-4 bg-white border border-border-light rounded-lg">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900">Tự động xuất nhật ký</h4>
                        <p className="text-xs text-secondary mt-1">Tự động xuất nhật ký theo lịch trình định kỳ.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={logsSettings.autoExportLogs}
                          onChange={(e) => handleLogsSettingChange('autoExportLogs', e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                      </label>
                    </div>
                    {logsSettings.autoExportLogs && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-w-4xl pl-4">
                        <div>
                          <label className="text-sm font-medium text-zinc-900 mb-2 block" htmlFor="export-frequency">
                            Tần suất xuất
                          </label>
                          <FormSelect
                            value={logsSettings.exportFrequency}
                            onChange={(e) => handleLogsSettingChange('exportFrequency', e.target.value)}
                            options={[
                              { value: 'daily', label: 'Hàng ngày' },
                              { value: 'weekly', label: 'Hàng tuần' },
                              { value: 'monthly', label: 'Hàng tháng' },
                            ]}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-zinc-900 mb-2 block" htmlFor="log-format">
                            Định dạng
                          </label>
                          <FormSelect
                            value={logsSettings.logFormat}
                            onChange={(e) => handleLogsSettingChange('logFormat', e.target.value)}
                            options={[
                              { value: 'json', label: 'JSON' },
                              { value: 'csv', label: 'CSV' },
                              { value: 'txt', label: 'TXT' },
                            ]}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-start md:items-center justify-between gap-4 p-4 bg-white border border-border-light rounded-lg">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900">Gửi nhật ký qua email</h4>
                        <p className="text-xs text-secondary mt-1">Tự động gửi nhật ký xuất đến địa chỉ email của bạn.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={logsSettings.sendLogsToEmail}
                          onChange={(e) => handleLogsSettingChange('sendLogsToEmail', e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                      </label>
                    </div>
                    {logsSettings.sendLogsToEmail && (
                      <div className="max-w-md pl-4">
                        <label className="text-sm font-medium text-zinc-900 mb-2 block" htmlFor="email-logs">
                          Địa chỉ email
                        </label>
                        <input
                          className="w-full bg-white border border-border-light rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder-zinc-400"
                          id="email-logs"
                          type="email"
                          placeholder="email@example.com"
                          value={logsSettings.emailForLogs}
                          onChange={(e) => handleLogsSettingChange('emailForLogs', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full h-px bg-zinc-100"></div>

                {/* Compression Section */}
                <div className="flex flex-col gap-6">
                  <div className="flex items-start md:items-center justify-between gap-4 p-4 bg-white border border-border-light rounded-lg">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900">Nén nhật ký cũ</h4>
                      <p className="text-xs text-secondary mt-1">Tự động nén các tệp nhật ký cũ để tiết kiệm dung lượng lưu trữ.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        className="sr-only peer"
                        type="checkbox"
                        checked={logsSettings.compressOldLogs}
                        onChange={(e) => handleLogsSettingChange('compressOldLogs', e.target.checked)}
                      />
                      <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 mt-4 border-t border-border-light">
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2.5 rounded-lg border border-border-light text-zinc-500 font-medium text-sm hover:bg-zinc-50 transition-colors w-full sm:w-auto"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={() => {
                      handleSave();
                      console.log('Saving logs settings:', logsSettings);
                    }}
                    className="px-6 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm shadow-sm transition-all w-full sm:w-auto"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            )}

            {/* Other tabs content */}
            {activeTab !== 'profile' && activeTab !== 'general' && activeTab !== 'plans' && activeTab !== 'notifications' && activeTab !== 'security' && activeTab !== 'logs' && (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-2 pb-6 border-b border-border-light">
                  <h1 className="text-2xl font-light tracking-tight text-zinc-900">
                    {SETTINGS_MENU_ITEMS.find(item => item.id === activeTab)?.label || 'Thiết lập'}
                  </h1>
                  <p className="text-secondary text-sm font-normal leading-relaxed max-w-lg">
                    Cài đặt và tùy chọn cho {SETTINGS_MENU_ITEMS.find(item => item.id === activeTab)?.label.toLowerCase()}.
                  </p>
                </div>
                <div className="text-center py-12">
                  <p className="text-secondary">Nội dung này sẽ được cập nhật sau.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Upload Image Modal */}
      {uploadImageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300"
          onClick={handleCloseUploadModal}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Tải ảnh đại diện mới</h3>
                <p className="text-sm text-secondary mt-0.5">Chọn ảnh JPG, PNG hoặc GIF. Tối đa 5MB.</p>
              </div>
              <button
                onClick={handleCloseUploadModal}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Đóng"
              >
                <span className="material-symbols-outlined text-gray-400 hover:text-gray-600">close</span>
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
                      alt="Preview"
                      className="w-48 h-48 rounded-full object-cover ring-4 ring-gray-100"
                    />
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                      }}
                      className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                      aria-label="Xóa ảnh đã chọn"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                  <p className="text-sm text-secondary">{selectedImage?.name}</p>
                </div>
              ) : (
                /* Upload Area */
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="mb-4 p-4 bg-gray-100 rounded-full group-hover:bg-gray-200 transition-colors">
                      <span className="material-symbols-outlined text-4xl text-gray-400">cloud_upload</span>
                    </div>
                    <p className="mb-2 text-sm font-medium text-gray-700">
                      <span className="text-primary hover:underline">Nhấn để chọn</span> hoặc kéo thả ảnh vào đây
                    </p>
                    <p className="text-xs text-secondary">JPG, PNG, GIF (Tối đa 5MB)</p>
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
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <span className="material-symbols-outlined text-blue-600 text-[20px]">info</span>
                  <p className="text-xs text-blue-900">
                    Kích thước: {(selectedImage.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={handleCloseUploadModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleUploadImage}
                disabled={!selectedImage}
                className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-zinc-900"
              >
                Tải ảnh lên
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <nav className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">calendar_today</span>
          </div>
          <h1 className="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em]">PlanDaily</h1>
          <button 
            className="ml-auto p-1 rounded-md text-gray-600 hover:bg-gray-100"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex flex-col gap-2 p-4 flex-1">
          <Link 
            to="/daily" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">today</span>
            <span>Kế hoạch hôm nay</span>
          </Link>
          <Link 
            to="/goals" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">target</span>
            <span>Quản lý mục tiêu</span>
          </Link>
          <Link 
            to="/calendar" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span>Lịch biểu</span>
          </Link>
          <Link 
            to="/settings" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 text-primary font-medium transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined fill-1">settings</span>
            <span>Thiết lập</span>
          </Link>
          <div className="mt-auto border-t border-gray-100 pt-4">
            <button 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-[#111418] font-medium transition-colors w-full"
              onClick={() => {
                window.location.href = '/login';
              }}
            >
              <span className="material-symbols-outlined">logout</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default SettingsPage;

