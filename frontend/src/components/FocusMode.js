import React from 'react';

const FocusMode = () => {
  return (
    <section className="w-full max-w-[960px] px-4 py-16 md:py-24 border-t border-gray-200">
      <div className="flex flex-col md:flex-row gap-12 items-center">
        <div className="w-full md:w-1/2 flex flex-col gap-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-purple-500/30 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-600">
            <span className="material-symbols-outlined text-[16px]">psychology</span>
            <span>Productivity Booster</span>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Focus Mode</h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Distractions are the enemy of progress. Enter Focus Mode to silence the noise and get deep work done.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <span className="material-symbols-outlined text-primary mb-2">timer</span>
              <h4 className="font-bold text-gray-900">Pomodoro Timer</h4>
              <p className="text-xs text-gray-500 mt-1">Built-in timers to manage work/rest cycles.</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <span className="material-symbols-outlined text-primary mb-2">block</span>
              <h4 className="font-bold text-gray-900">App Blocking</h4>
              <p className="text-xs text-gray-500 mt-1">Integrations to block distracting sites.</p>
            </div>
          </div>
        </div>
        <div className="w-full md:w-1/2 relative">
          <div className="absolute -inset-4 bg-primary/10 blur-2xl rounded-full opacity-50"></div>
          <div 
            className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-gray-200"
            data-alt="Minimalist dark mode interface showing a countdown timer and a single task in focus"
            style={{
              backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC1MBkUzRQm6C-5gDmN8gSPXgd0huV8hyYgh_WvscFGSSQ5My8XgopfLr0LzRj9nUEGzGR78bYtV6vSoc4r6zRIevVO8wlMh8V0W4udVFplEu6YJpgHtugYWBCR1M2uR6auxPqxjiQg5m27UJMD09LNZEiTAc7aCScfgFwsA5qcqR3Fhl4RvvpUZfiBu3e-kPTic_LISuiVyRIjS2kzN3JALHSHNR1WQYri9iddpFSRgz2QvZofsUudPuewJQoZtzHInAZkdLJHD70K")'
            }}
          >
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
              <div className="bg-white/30 backdrop-blur-md border border-white/40 rounded-full p-4 cursor-pointer hover:bg-white/50 transition-all shadow-lg">
                <span className="material-symbols-outlined text-white text-4xl">play_arrow</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FocusMode;

