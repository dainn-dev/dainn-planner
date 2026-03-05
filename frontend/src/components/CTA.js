import React from 'react';

const CTA = () => {
  return (
    <section className="w-full py-24 bg-gradient-to-b from-white to-gray-50 border-t border-gray-200">
      <div className="max-w-[960px] px-4 mx-auto text-center flex flex-col items-center gap-8">
        <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
          Start building your future today.
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl">
          Join thousands of users who have transformed their chaotic days into structured success stories with PlanLife.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button className="flex items-center justify-center rounded-lg h-14 px-8 bg-primary text-white text-lg font-bold shadow-xl shadow-primary/25 hover:bg-primary/90 transition-all w-full sm:w-auto">
            Create Free Account
          </button>
          <button className="flex items-center justify-center rounded-lg h-14 px-8 bg-white text-gray-900 text-lg font-bold border border-gray-200 hover:bg-gray-50 transition-all w-full sm:w-auto">
            View Pricing
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-4">No credit card required for free plan.</p>
      </div>
    </section>
  );
};

export default CTA;

