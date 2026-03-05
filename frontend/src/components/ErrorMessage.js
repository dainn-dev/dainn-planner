import React from 'react';

const ErrorMessage = ({ message, className = '' }) => {
  if (!message) return null;

  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm ${className}`}
      role="alert"
      aria-live="polite"
    >
      <span className="material-symbols-outlined text-lg">error</span>
      <span>{message}</span>
    </div>
  );
};

export default ErrorMessage;

