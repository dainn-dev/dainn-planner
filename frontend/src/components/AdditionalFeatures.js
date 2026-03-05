import React from 'react';

const AdditionalFeatures = () => {
  const features = [
    {
      icon: 'edit_note',
      title: 'Rich Notes',
      description: 'Add detailed notes and files to any task.'
    },
    {
      icon: 'group_add',
      title: 'Collaboration',
      description: 'Share lists and plan with family or team.'
    },
    {
      icon: 'repeat',
      title: 'Recurring Tasks',
      description: 'Set it once and never forget a habit again.'
    },
    {
      icon: 'palette',
      title: 'Custom Themes',
      description: 'Make your planner truly yours with colors.'
    }
  ];

  return (
    <section className="w-full bg-gray-50 text-gray-900 py-20 border-t border-gray-200">
      <div className="w-full max-w-[960px] px-4 mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-12 text-center">Everything else you need</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-full bg-white border border-gray-200 text-primary mb-2 shadow-sm">
                <span className="material-symbols-outlined">{feature.icon}</span>
              </div>
              <h3 className="font-bold text-lg">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AdditionalFeatures;

