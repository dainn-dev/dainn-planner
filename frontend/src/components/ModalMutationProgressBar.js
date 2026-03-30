import React from 'react';

/**
 * Indeterminate progress strip for modals / panels during create-update-delete.
 * Parent should be `position: relative` (e.g. `relative` class).
 */
const ModalMutationProgressBar = ({ active, label }) => {
  if (!active) return null;
  return (
    <div
      className="pointer-events-none absolute top-0 left-0 right-0 z-[60] h-1 overflow-hidden rounded-t-2xl sm:rounded-t-xl"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="h-full w-full bg-zinc-200/90 dark:bg-slate-600/60">
        <div className="modal-mutation-progress-indeterminate h-full rounded-full bg-primary shadow-sm" />
      </div>
    </div>
  );
};

export default ModalMutationProgressBar;
