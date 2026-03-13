import React from 'react';
import { useTranslation } from 'react-i18next';

const Hero = ({ onGetStarted, onViewDemo }) => {
  const { t } = useTranslation();
  return (
    <section className="w-full max-w-[960px] px-4 py-12 md:py-20 lg:py-24">
      <div className="@container">
        <div className="flex flex-col gap-10 md:flex-row items-center">
          <div className="flex flex-col gap-6 md:w-1/2">
            <div className="flex flex-col gap-4 text-left">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                <span className="material-symbols-outlined text-[16px]">new_releases</span>
                <span>{t('home.versionLive')}</span>
              </div>
              <h1 className="text-4xl font-black leading-tight tracking-tight md:text-5xl lg:text-6xl text-gray-900">
                {t('home.heroTitle')} <span className="text-primary">{t('home.heroTitleHighlight')}</span>.
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed max-w-[500px]">
                {t('home.heroSubtitle')}
              </p>
            </div>
            <div className="flex gap-4 flex-wrap">
              <button
                type="button"
                onClick={onGetStarted}
                className="flex items-center justify-center rounded-lg h-12 px-6 bg-primary text-white text-base font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                {t('home.getStartedFree')}
              </button>
              <button
                type="button"
                onClick={onViewDemo}
                className="flex items-center justify-center rounded-lg h-12 px-6 bg-transparent border border-gray-300 text-gray-900 text-base font-bold hover:bg-gray-50 transition-all"
              >
                {t('home.viewDemo')}
              </button>
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <div className="relative w-full aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-gray-200 group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-500/10 mix-blend-multiply z-10"></div>
              <div 
                className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105" 
                data-alt="Modern abstract dashboard interface with charts and calendar elements"
                style={{
                  backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuChsxP4QZRNY7HAxzWYVyaCd4Bc-v36DYET1cBA1jtlKbORJJZA5p0f-03ciZETdWIcWmfjbIjfATAZR4b1pzV-vfbjbo1dD0TIe06DnZsf9cYODsGvJ5Yzr1XJNM12rC8ZBg_4PWZ7Ni9VL1g1ACQmJ1nJSRwrYc8SPCSxofUPTS4DAMUGqYyGFfL2xjHmX7NaT_PJdDem6MdunIpzzbz4_OMfSgzf1tBmNsL2B2T1SQJZ-c-9uYjwPbZOJcWRUlAvAVmM7NdJSKtE")'
                }}
              >
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

