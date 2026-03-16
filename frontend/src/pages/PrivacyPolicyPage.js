import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';

const PrivacyPolicyPage = () => {
  const { t } = useTranslation();

  return (
    <div className="antialiased min-h-screen flex flex-col bg-slate-50">
      <PublicHeader />
      <main className="flex-grow py-12 md:py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
            <Link to="/" className="hover:text-blue-600 transition-colors">
              {t('privacyPolicy.breadcrumbHome')}
            </Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-slate-900 font-medium">{t('privacyPolicy.breadcrumbLabel')}</span>
          </div>
          <div className="mb-12 border-b border-slate-200 pb-8">
            <h1 className="text-[#111418] text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em] mb-4">
              {t('privacyPolicy.title')}
            </h1>
            <p className="text-lg text-slate-600">{t('privacyPolicy.updatedAt')}</p>
            <p className="mt-4 text-slate-600">
              {t('privacyPolicy.intro')}
            </p>
          </div>
          <article className="prose prose-lg max-w-none text-slate-700">
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">{t('privacyPolicy.section1Title')}</h2>
            <p className="mb-4 leading-relaxed">
              {t('privacyPolicy.section1Intro')}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-6">
              <li>
                {t('privacyPolicy.section1Account')}
              </li>
              <li>
                {t('privacyPolicy.section1PlanData')}
              </li>
              <li>
                {t('privacyPolicy.section1Device')}
              </li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">{t('privacyPolicy.section2Title')}</h2>
            <p className="mb-4 leading-relaxed">{t('privacyPolicy.section2Intro')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-6">
              <li>{t('privacyPolicy.section2Item1')}</li>
              <li>{t('privacyPolicy.section2Item2')}</li>
              <li>{t('privacyPolicy.section2Item3')}</li>
              <li>{t('privacyPolicy.section2Item4')}</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">{t('privacyPolicy.section3Title')}</h2>
            <p className="mb-4 leading-relaxed">
              {t('privacyPolicy.section3Intro')}
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-6 rounded-r-lg">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-600">security</span>
                <div>
                  <p className="font-medium text-blue-900 mb-1">{t('privacyPolicy.section3HighlightTitle')}</p>
                  <p className="text-sm text-blue-800 m-0">
                    {t('privacyPolicy.section3HighlightText')}
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">{t('privacyPolicy.section4Title')}</h2>
            <p className="mb-4 leading-relaxed">
              {t('privacyPolicy.section4Intro')}
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">{t('privacyPolicy.section5Title')}</h2>
            <p className="mb-4 leading-relaxed">
              {t('privacyPolicy.section5Intro')}
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">{t('privacyPolicy.section6Title')}</h2>
            <p className="mb-4 leading-relaxed">
              {t('privacyPolicy.section6Intro')}
            </p>

            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">{t('privacyPolicy.section7Title')}</h2>
            <p className="mb-4 leading-relaxed">
              {t('privacyPolicy.section7Intro')}
            </p>

            <div className="mt-12 pt-8 border-t border-slate-200">
              <p className="font-medium text-slate-900 mb-2">{t('privacyPolicy.questionsTitle')}</p>
              <p className="mb-4">{t('privacyPolicy.questionsText')}</p>
              <a
                className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline"
                href="mailto:support@dailyplan.com"
              >
                <span className="material-symbols-outlined text-sm">mail</span>
                {t('privacyPolicy.questionsEmail')}
              </a>
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;

