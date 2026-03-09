import React from 'react';
import { useTranslation } from 'react-i18next';

const AdditionalFeatures = () => {
  const { t } = useTranslation();
  const features = [
    { icon: 'edit_note', titleKey: 'home.featureRichNotes', descKey: 'home.featureRichNotesDesc' },
    { icon: 'group_add', titleKey: 'home.featureCollaboration', descKey: 'home.featureCollaborationDesc' },
    { icon: 'repeat', titleKey: 'home.featureRecurring', descKey: 'home.featureRecurringDesc' },
    { icon: 'palette', titleKey: 'home.featureThemes', descKey: 'home.featureThemesDesc' }
  ];

  return (
    <section className="w-full bg-gray-50 text-gray-900 py-20 border-t border-gray-200">
      <div className="w-full max-w-[960px] px-4 mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-12 text-center">{t('home.featuresSectionTitle')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-full bg-white border border-gray-200 text-primary mb-2 shadow-sm">
                <span className="material-symbols-outlined">{feature.icon}</span>
              </div>
              <h3 className="font-bold text-lg">{t(feature.titleKey)}</h3>
              <p className="text-sm text-gray-600">{t(feature.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AdditionalFeatures;

