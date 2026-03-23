import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicHeader from '../components/PublicHeader';
import Hero from '../components/Hero';
import SmartScheduling from '../components/SmartScheduling';
import GoalBreakdown from '../components/GoalBreakdown';
import FocusMode from '../components/FocusMode';
import AdditionalFeatures from '../components/AdditionalFeatures';
import Footer from '../components/Footer';
import { getPostLoginPath } from '../utils/auth';

// Optional: set REACT_APP_DEMO_VIDEO_URL to a YouTube embed URL (e.g. https://www.youtube.com/embed/VIDEO_ID)
const DEMO_VIDEO_URL = process.env.REACT_APP_DEMO_VIDEO_URL || '';

const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      // Get user role to determine redirect
      try {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;

        if (user) {
          navigate(getPostLoginPath(user), { replace: true });
        } else {
          navigate('/daily', { replace: true });
        }
      } catch (error) {
        // If error parsing user, redirect to daily page
        navigate('/daily', { replace: true });
      }
    }
  }, [navigate]);

  const handleGetStarted = () => {
    navigate('/login');
  };

  const handleViewDemo = () => {
    setDemoModalOpen(true);
  };

  return (
    <div className="bg-[#f6f7f8] text-[#111418] font-display overflow-x-hidden">
      <PublicHeader />
      <main className="flex flex-col items-center">
        <Hero onGetStarted={handleGetStarted} onViewDemo={handleViewDemo} />
        <SmartScheduling />
        <GoalBreakdown />
        <FocusMode />
        <AdditionalFeatures />
        {/* <CTA /> */}
        <Footer />
      </main>

      {demoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setDemoModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t('home.viewDemo')}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
              <span className="font-semibold text-gray-900">{t('home.viewDemo')}</span>
              <button
                type="button"
                onClick={() => setDemoModalOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label={t('common.close')}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="aspect-video bg-gray-900">
              {DEMO_VIDEO_URL ? (
                <iframe
                  src={DEMO_VIDEO_URL}
                  title={t('home.viewDemo')}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-6">
                  <span className="material-symbols-outlined text-5xl mb-2">videocam_off</span>
                  <p className="text-sm">{t('home.demoVideoNotConfigured')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;

