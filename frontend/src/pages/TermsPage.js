import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';

const TermsPage = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col antialiased bg-gray-50">
      <PublicHeader />
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
            <Link to="/" className="hover:text-blue-600 transition-colors">
              {t('termsPage.breadcrumbHome')}
            </Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-slate-900 font-medium">{t('termsPage.breadcrumbLabel')}</span>
          </div>
          <div className="text-center mb-12">
            <p className="text-indigo-600 font-medium text-sm uppercase tracking-wide mb-2">{t('termsPage.heroTag')}</p>
            <h1 className="text-[#111418] text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-[-0.033em] mb-4">{t('termsPage.title')}</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('termsPage.subtitle')}
            </p>
            <p className="text-sm text-gray-500 mt-4">{t('termsPage.updatedAt')}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
            <div className="prose prose-indigo prose-lg max-w-none text-gray-600">
              <section className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 font-bold">
                    1
                  </span>
                  {t('termsPage.section1Title')}
                </h2>
                <p className="mb-4 leading-relaxed">
                  {t('termsPage.section1Body')}
                </p>
              </section>
              <section className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 font-bold">
                    2
                  </span>
                  {t('termsPage.section2Title')}
                </h2>
                <p className="mb-4 leading-relaxed">
                  {t('termsPage.section2Intro')}
                </p>
                <ul className="list-disc pl-5 space-y-2 ml-11">
                  <li>{t('termsPage.section2Item1')}</li>
                  <li>{t('termsPage.section2Item2')}</li>
                  <li>{t('termsPage.section2Item3')}</li>
                  <li>{t('termsPage.section2Item4')}</li>
                </ul>
              </section>
              <section className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 font-bold">
                    3
                  </span>
                  {t('termsPage.section3Title')}
                </h2>
                <p className="mb-4 leading-relaxed">
                  {t('termsPage.section3Body1')}
                </p>
                <p className="mb-4 leading-relaxed">
                  {t('termsPage.section3Body2')}
                </p>
              </section>
              <section className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 font-bold">
                    4
                  </span>
                  {t('termsPage.section4Title')}
                </h2>
                <p className="mb-4 leading-relaxed">
                  {t('termsPage.section4Intro')}
                </p>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 ml-11">
                  <div className="flex items-start mb-3">
                    <span className="material-symbols-outlined text-red-400 mr-2 text-lg mt-0.5">block</span>
                    <span>{t('termsPage.section4Item1')}</span>
                  </div>
                  <div className="flex items-start mb-3">
                    <span className="material-symbols-outlined text-red-400 mr-2 text-lg mt-0.5">block</span>
                    <span>{t('termsPage.section4Item2')}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="material-symbols-outlined text-red-400 mr-2 text-lg mt-0.5">block</span>
                    <span>{t('termsPage.section4Item3')}</span>
                  </div>
                </div>
              </section>
              <section className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 font-bold">
                    5
                  </span>
                  {t('termsPage.section5Title')}
                </h2>
                <p className="mb-4 leading-relaxed">
                  {t('termsPage.section5Intro')}
                </p>
                <ul className="list-disc pl-5 space-y-2 ml-11">
                  <li>{t('termsPage.section5Item1')}</li>
                  <li>{t('termsPage.section5Item2')}</li>
                  <li>{t('termsPage.section5Item3')}</li>
                </ul>
              </section>
              <section className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 font-bold">
                    6
                  </span>
                  {t('termsPage.section6Title')}
                </h2>
                <p className="mb-4 leading-relaxed">
                  {t('termsPage.section6Intro')}
                </p>
              </section>
            </div>
            <div className="mt-12 pt-8 border-t border-gray-100">
              <p className="text-center text-gray-500 mb-6">{t('termsPage.questionsTitle')}</p>
              <div className="flex justify-center space-x-4">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                >
                  <span className="material-symbols-outlined mr-2">mail</span>
                  {t('termsPage.contactSupport')}
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center px-6 py-3 border border-gray-200 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="material-symbols-outlined mr-2">help</span>
                  {t('termsPage.helpCenter')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsPage;

