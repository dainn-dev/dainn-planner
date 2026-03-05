import React from 'react';

const SmartScheduling = () => {
  const features = [
    {
      icon: 'drag_indicator',
      title: 'Drag & Drop',
      description: 'Rearrange your day in seconds. Move tasks between time slots or days with a simple click and hold.'
    },
    {
      icon: 'sync',
      title: 'Auto-Sync',
      description: 'Changes update instantly across your phone, tablet, and desktop so you never miss a beat.'
    },
    {
      icon: 'notifications_active',
      title: 'Smart Alerts',
      description: 'Get context-aware notifications that remind you when to start preparing, not just when to start.'
    }
  ];

  return (
    <section className="w-full bg-gray-50 border-y border-gray-200">
      <div className="w-full max-w-[960px] px-4 py-16 mx-auto">
        <div className="flex flex-col gap-12">
          <div className="text-center max-w-[700px] mx-auto">
            <h2 className="text-3xl font-bold tracking-tight mb-4 text-gray-900">Smart Scheduling</h2>
            <p className="text-gray-600 text-lg">
              Stop fighting with your calendar. Our intelligent system helps you organize your time efficiently without the hassle.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-300 group">
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-3xl">{feature.icon}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2 text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {feature.description}
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

