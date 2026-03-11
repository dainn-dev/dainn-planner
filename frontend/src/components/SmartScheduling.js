import React from 'react';
import { useTranslation } from 'react-i18next';

const SmartScheduling = () => {
  const { t } = useTranslation();
  const features = [
    { icon: 'drag_indicator', titleKey: 'home.featureDragDrop', descKey: 'home.featureDragDropDesc' },
    { icon: 'sync', titleKey: 'home.featureAutoSync', descKey: 'home.featureAutoSyncDesc' },
    { icon: 'notifications_active', titleKey: 'home.featureSmartAlerts', descKey: 'home.featureSmartAlertsDesc' }
  ];

  return (
    <section id="features" className="w-full bg-gray-50 border-y border-gray-200">
      <div className="w-full max-w-[960px] px-4 py-16 mx-auto">
        <div className="flex flex-col gap-12">
          <div className="text-center max-w-[700px] mx-auto">
            <h2 className="text-3xl font-bold tracking-tight mb-4 text-gray-900">{t('home.smartSchedulingTitle')}</h2>
            <p className="text-gray-600 text-lg">
              {t('home.smartSchedulingSubtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-300 group">
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-3xl">{feature.icon}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2 text-gray-900">{t(feature.titleKey)}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {t(feature.descKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SmartScheduling;

