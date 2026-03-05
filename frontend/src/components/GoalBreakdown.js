import React from 'react';

const GoalBreakdown = () => {
  const benefits = [
    {
      title: 'Visual Progress',
      description: 'See exactly how close you are to finishing with beautiful charts.'
    },
    {
      title: 'Actionable Steps',
      description: 'Convert abstract goals into concrete to-do items instantly.'
    },
    {
      title: 'Daily Momentum',
      description: 'Keep your streak alive with daily check-ins.'
    }
  ];

  return (
    <section className="w-full max-w-[960px] px-4 py-16 md:py-24">
      <div className="flex flex-col md:flex-row gap-12 items-center">
        <div className="w-full md:w-1/2 order-2 md:order-1">
          <div className="grid grid-cols-2 gap-4">
            <div 
              className="col-span-2 rounded-xl overflow-hidden aspect-[2/1] bg-cover bg-center shadow-lg border border-gray-100"
              data-alt="Detailed line chart showing progress over time with green trend line"
              style={{
                backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDA6D9xm4MOwRNcZmxSOUtVQ9NfmnnqkjmC9ojIxIgiCWL6l2k7Fw39SsFMymzVHWLJ5tJtGLhRxD-hZWZDI3Wj7p36LPK4_H8q6XPX9WvATbocxdE-aJP9p9fbBQwvf934D9WCyD_7JNuYbZjhpyfJObzQbNeOC_1fw3r7SpYTr1g9ZkjMmOdKNkDn0pFr3Fs9XmJTS3NI0njdLUCJ_Qi5vii9_QhcIT7j9OuXlvZjoVVTbyO3nEhaXU-uzA546GejEejk6J_RUuo3")'
              }}
            >
            </div>
            <div 
              className="rounded-xl overflow-hidden aspect-square bg-cover bg-center shadow-lg border border-gray-100"
              data-alt="Person writing in a planner with focus"
              style={{
                backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC0o7XSZGWfm-pULtN9yCrSNbNDGbpFx1xfiCiqOoFclq8ZldNoWdzGAUnqNrewm_oe5j4slQ06-ssbKUI31uXJ7RFRjDcNd7kQWWXA4tZUx9YNVZzJ0j4HprHim7OatrFM_KNwNHKeTJXeZUxs7vKz9QnXw7B_-hWm2GatkLcFQ7CgAIkF7W76F_WciVQNAR82pUWu2fo3h9sGrtdnv9mwQYsa_Nl06tZYb9WyJf1GKOjWVTDEiZ0BPGgt288WPXvv6XHZ1NV5tg1Q")'
              }}
            >
            </div>
            <div className="rounded-xl bg-gray-50 p-4 flex flex-col justify-center items-center text-center gap-2 border border-gray-200">
              <span className="material-symbols-outlined text-4xl text-primary">flag</span>
              <div className="font-bold text-gray-900">Milestones</div>
              <div className="text-xs text-gray-500">Track key achievements</div>
            </div>
          </div>
        </div>
        <div className="w-full md:w-1/2 flex flex-col gap-6 order-1 md:order-2">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Goal Breakdown</h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Big dreams can be overwhelming. PlanLife helps you break them down into manageable daily actions.
          </p>
          <ul className="flex flex-col gap-4">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-1">check_circle</span>
                <div>
                  <span className="font-bold text-gray-900 block">{benefit.title}</span>
                  <span className="text-sm text-gray-600">{benefit.description}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="pt-2">
            <button className="text-primary font-bold hover:underline flex items-center gap-1">
              Learn more about Goals <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GoalBreakdown;

