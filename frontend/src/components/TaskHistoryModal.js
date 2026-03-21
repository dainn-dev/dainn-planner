import React, { useEffect, useMemo, useState } from 'react';
import { tasksAPI } from '../services/api';
import { formatDate, formatTime } from '../utils/dateFormat';

const stripHtmlToText = (html) => {
  if (!html || typeof html !== 'string') return '';
  // Minimal HTML -> text conversion for history display.
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const TaskHistoryModal = ({ open, onClose, taskId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  const title = useMemo(() => {
    if (!taskId) return 'Task history';
    return 'Task history';
  }, [taskId]);

  useEffect(() => {
    if (!open || !taskId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await tasksAPI.getTaskHistory(taskId);
        const list = res?.items ?? res?.Items ?? [];
        if (!cancelled) setItems(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, taskId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span>
            <h2 className="text-base font-semibold text-[#111418] dark:text-slate-100">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-[#111418] dark:hover:text-white transition-colors p-1 rounded"
            aria-label="Close history"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="text-sm text-gray-600 dark:text-slate-300">Loading…</div>
          )}

          {!loading && error && (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="text-sm text-gray-600 dark:text-slate-300">
              No history yet.
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="flex flex-col gap-3">
              {items.map((it) => (
                <div
                  key={it.id ?? `${it.taskId ?? ''}-${it.date ?? ''}`}
                  className="rounded-lg border border-gray-100 dark:border-slate-700 p-3 bg-gray-50/50 dark:bg-slate-900/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        Date
                      </div>
                      <div className="text-sm font-medium text-[#111418] dark:text-slate-100">
                        {formatDate(it.date) || '—'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!it.isCompleted} readOnly className="h-4 w-4" />
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        {it.isCompleted ? 'Done' : 'Incomplete'}
                      </span>
                    </div>
                  </div>

                  {it.description != null && it.description !== '' && (
                    <div className="mt-2 text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap">
                      {stripHtmlToText(it.description)}
                    </div>
                  )}

                  {it.completedDate && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                      Completed: {formatDate(it.completedDate)}{formatTime(it.completedDate) ? ` ${formatTime(it.completedDate)}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskHistoryModal;

