import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_TAGS, TAG_I18N_KEYS } from '../constants/tasks';
import { tasksAPI } from '../services/api';
import { formatDate, formatLocalDateIso } from '../utils/dateFormat';
import { DefaultTemplate } from './lexkit/DefaultTemplate';
import ModalMutationProgressBar from './ModalMutationProgressBar';
import { sanitizeTaskHtml } from '../utils/sanitizeTaskHtml';

const USER_SETTINGS_STORAGE_KEY = 'user_settings';

const dateToDatetimeLocal = (dateVal) => {
  if (!dateVal) return '';
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
};

/** Get default duration in minutes from user_settings.plans.defaultDuration (e.g. "30 phút" -> 30). */
const getDefaultDurationMinutes = () => {
  try {
    const raw = typeof window !== 'undefined' && localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (!raw) return 30;
    const settings = JSON.parse(raw);
    const value = settings?.plans?.defaultDuration ?? settings?.Plans?.defaultDuration ?? '';
    const match = String(value).match(/\d+/);
    const minutes = match ? parseInt(match[0], 10) : 30;
    return Number.isNaN(minutes) || minutes <= 0 ? 30 : Math.min(120, minutes);
  } catch {
    return 30;
  }
};

/** Return current time + minutes in datetime-local string. */
const getDueDateNowPlusMinutes = (minutes) => {
  const d = new Date(Date.now() + minutes * 60 * 1000);
  return dateToDatetimeLocal(d);
};

const getPriorityFlagClass = (priority) => {
  switch (priority) {
    case 'high':
      return 'text-red-500 dark:text-red-400';
    case 'medium':
      return 'text-yellow-500 dark:text-yellow-400';
    default:
      return 'text-gray-400 dark:text-slate-500';
  }
};

const AddTaskModal = ({
  open,
  onClose,
  onSaved,
  initialTask = null,
  goalContext = null // { goalMilestoneId, goalId }
}) => {
  const { t } = useTranslation();
  const editorMethodsRef = useRef(null);
  const taskFormRef = useRef(null);
  const pendingInjectRef = useRef(null);       // queues HTML to inject when editor becomes ready
  const selectedHistoryItemRef = useRef(null); // always mirrors the currently selected history item
  const [editorKey, setEditorKey] = useState(0);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [formGoalMilestoneId, setFormGoalMilestoneId] = useState(null);
  const [formGoalId, setFormGoalId] = useState(null);
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    dueDate: '',
    reminderTime: '',
    repeat: 'none',
    priority: 'low', // 'low' | 'medium' | 'high'
    tags: [],
    startTime: '',
    endTime: '',
  });
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(null);
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  taskFormRef.current = taskForm;

  const getTagLabel = (tag) => (TAG_I18N_KEYS[tag] ? t(`daily.${TAG_I18N_KEYS[tag]}`) : tag);

  useEffect(() => {
    if (!open) setIsSubmitting(false);
  }, [open]);

  // Initialize form when modal opens or initialTask/goalContext change
  useEffect(() => {
    if (!open) return;

    const recurrenceToOption = { 0: 'none', 1: 'daily', 2: 'weekly', 3: 'monthly' };
    const priorityNumToOption = { 0: 'low', 1: 'medium', 2: 'high' };

    if (initialTask && initialTask.id) {
      // Edit existing task
      setEditingTaskId(initialTask.id);
      setFormGoalMilestoneId(initialTask.goalMilestoneId ?? goalContext?.goalMilestoneId ?? null);
      setFormGoalId(initialTask.goalId ?? goalContext?.goalId ?? null);
      setTaskForm({
        name: initialTask.title || initialTask.text || '',
        description: initialTask.description ?? '',
        dueDate: dateToDatetimeLocal(initialTask.date),
        reminderTime: initialTask.reminderTime ?? '',
        repeat: recurrenceToOption[initialTask.recurrence] ?? 'none',
        priority: priorityNumToOption[initialTask.priority] ?? 'low',
        tags: initialTask.tags ? [...initialTask.tags] : [],
        startTime: initialTask.startTime ?? '',
        endTime: initialTask.endTime ?? '',
      });
    } else {
      // Create new task (optionally prefilled from milestone)
      const prefilledName = initialTask?.title || initialTask?.name || '';
      const prefilledDate = initialTask?.dueDate || initialTask?.date || '';
      const defaultMinutes = getDefaultDurationMinutes();
      const dueDate = prefilledDate
        ? (dateToDatetimeLocal(prefilledDate) || getDueDateNowPlusMinutes(defaultMinutes))
        : getDueDateNowPlusMinutes(defaultMinutes);
      setEditingTaskId(null);
      setFormGoalMilestoneId(goalContext?.goalMilestoneId ?? null);
      setFormGoalId(goalContext?.goalId ?? null);
      setTaskForm({
        name: prefilledName,
        description: initialTask?.description ?? '',
        dueDate,
        reminderTime: initialTask?.reminderTime ?? '',
        repeat: 'none',
        priority: 'low',
        tags: initialTask?.tags ? [...initialTask.tags] : [],
        startTime: initialTask?.startTime ?? '',
        endTime: initialTask?.endTime ?? '',
      });
    }
    setShowNewTagInput(false);
    setNewTagValue('');
  }, [open, initialTask, goalContext]);

  // Load task history when editing a recurring task
  useEffect(() => {
    if (!open || !editingTaskId) {
      setHistoryItems([]);
      setSelectedHistoryDate(null);
      selectedHistoryItemRef.current = null;
      pendingInjectRef.current = null;
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    const todayIso = formatLocalDateIso(new Date());
    tasksAPI.getTaskHistory(editingTaskId)
      .then((res) => {
        if (cancelled) return;
        const list = res?.items ?? res?.Items ?? [];
        const items = Array.isArray(list) ? list : [];
        setHistoryItems(items);

        // Auto-select today's item, or fall back to the most recent one
        const getItemDateStr = (it) => (it.date ? it.date.slice(0, 10) : '');
        const todayItem = items.find((it) => getItemDateStr(it) === todayIso);
        const autoItem = todayItem ?? items[0] ?? null;
        if (autoItem) {
          selectedHistoryItemRef.current = autoItem;
          setSelectedHistoryDate(getItemDateStr(autoItem));
          // Sync the dueDate field to this instance's date
          setTaskForm((prev) => ({ ...prev, dueDate: dateToDatetimeLocal(autoItem.date) }));
          const html = sanitizeTaskHtml(autoItem.description ?? '');
          if (editorMethodsRef.current?.injectHTML) {
            editorMethodsRef.current.injectHTML(html);
          } else {
            // Editor not ready yet — queue for handleEditorReady
            pendingInjectRef.current = html;
          }
        }
      })
      .catch(() => { if (!cancelled) setHistoryItems([]); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [open, editingTaskId]);

  const handleHistoryDateClick = useCallback((item) => {
    const dateStr = item.date ? item.date.slice(0, 10) : null;
    const html = sanitizeTaskHtml(item.description ?? '');
    selectedHistoryItemRef.current = item;
    setSelectedHistoryDate(dateStr);
    // Sync the dueDate field so the save targets this instance's date
    setTaskForm((prev) => ({ ...prev, dueDate: dateToDatetimeLocal(item.date) }));
    if (editorMethodsRef.current?.injectHTML) {
      editorMethodsRef.current.injectHTML(html);
    } else {
      pendingInjectRef.current = html;
      setEditorKey((k) => k + 1);
    }
  }, []);

  const handleEditorReady = useCallback((methods) => {
    editorMethodsRef.current = methods;
    // A history date was selected before the editor was ready — inject it with priority
    if (pendingInjectRef.current !== null) {
      const html = pendingInjectRef.current;
      pendingInjectRef.current = null;
      methods.injectHTML(html);
      return;
    }
    // If a history item is already selected, use its description (not the template description)
    if (selectedHistoryItemRef.current) {
      methods.injectHTML(
        sanitizeTaskHtml(selectedHistoryItemRef.current.description ?? ''),
      );
      return;
    }
    const desc = taskFormRef.current?.description;
    if (desc) {
      methods.injectHTML(sanitizeTaskHtml(desc));
    }
  }, []);

  // Re-mount the editor when the modal opens so it picks up new initial content
  useEffect(() => {
    if (open) {
      setEditorKey(k => k + 1);
    }
  }, [open, editingTaskId]);

  const handleDeleteInstance = useCallback(async (item, e) => {
    e.stopPropagation();
    if (!item?.id || isSubmitting) return;
    try {
      await tasksAPI.deleteTaskInstance(item.id);
      setHistoryItems((prev) => prev.filter((h) => h.id !== item.id));
      if (selectedHistoryDate && item.date?.slice(0, 10) === selectedHistoryDate) {
        selectedHistoryItemRef.current = null;
        setSelectedHistoryDate(null);
      }
    } catch (err) {
      console.error('Failed to delete instance:', err);
    }
  }, [isSubmitting, selectedHistoryDate]);

  const handleCreateTodayInstance = useCallback(async () => {
    if (!editingTaskId || isCreatingInstance) return;
    const todayStr = formatLocalDateIso(new Date());
    setIsCreatingInstance(true);
    try {
      const isoDate = new Date(`${todayStr}T12:00:00`).toISOString();
      const res = await tasksAPI.upsertTaskInstance({ taskId: editingTaskId, date: isoDate, description: null, isCompleted: false });
      const newItem = res?.data ?? res;
      if (newItem?.id) {
        setHistoryItems((prev) => {
          const exists = prev.some((h) => h.id === newItem.id);
          return exists ? prev : [newItem, ...prev];
        });
        handleHistoryDateClick(newItem);
      }
    } catch (err) {
      console.error('Failed to create instance:', err);
    } finally {
      setIsCreatingInstance(false);
    }
  }, [editingTaskId, isCreatingInstance, handleHistoryDateClick]);

  const handleTagToggle = (tag) => {
    setTaskForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleAddNewTag = () => {
    if (newTagValue.trim()) {
      handleTagToggle(newTagValue.trim());
      setNewTagValue('');
      setShowNewTagInput(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.name.trim() || isSubmitting) return;

    const datePayload = taskForm.dueDate
      ? new Date(taskForm.dueDate).toISOString()
      : (initialTask?.date ? new Date(initialTask.date).toISOString() : new Date().toISOString());
    const priorityMap = { low: 0, medium: 1, high: 2 };
    const priorityInt = priorityMap[taskForm.priority] ?? 0;
    const recurrenceMap = { none: 0, daily: 1, weekly: 2, monthly: 3 };
    const recurrence = recurrenceMap[taskForm.repeat] ?? 0;
    const descriptionFromEditor =
      editorMethodsRef.current?.getHTML() ?? taskForm.description ?? '';
    const descriptionFromEditorSanitized = sanitizeTaskHtml(descriptionFromEditor);

    const payload = {
      title: taskForm.name.trim(),
      description: descriptionFromEditorSanitized,
      date: datePayload,
      priority: priorityInt,
      recurrence,
      reminderTime: taskForm.reminderTime || undefined,
      tags: taskForm.tags,
      startTime: taskForm.startTime || undefined,
      endTime: taskForm.endTime || undefined,
    };

    if (editingTaskId) {
      payload.goalMilestoneId = formGoalMilestoneId ?? null;
      payload.goalId = formGoalId ?? null;
    } else {
      if (formGoalMilestoneId) payload.goalMilestoneId = formGoalMilestoneId;
      if (formGoalId) payload.goalId = formGoalId;
    }

    setIsSubmitting(true);
    try {
      if (editingTaskId) {
        // Split: template update (no per-day fields), then instance upsert for selected dueDate.
        const templatePayload = {
          title: payload.title,
          priority: payload.priority,
          recurrence: payload.recurrence,
          date: datePayload,
          reminderTime: payload.reminderTime,
          tags: payload.tags,
          startTime: payload.startTime,
          endTime: payload.endTime,
        };

        // Keep goal associations consistent with existing update behavior.
        templatePayload.goalMilestoneId = payload.goalMilestoneId ?? null;
        templatePayload.goalId = payload.goalId ?? null;

        await tasksAPI.updateTask(editingTaskId, templatePayload);

        // Always use datePayload (from taskForm.dueDate) as the instance date so that
        // manually changing the due date field is respected. selectedItem is only used
        // for the completion status of the matching instance.
        const selectedItem = selectedHistoryItemRef.current;
        const instanceDate = datePayload;
        const instanceCompleted = selectedItem
          ? (selectedItem.isCompleted ?? false)
          : (initialTask?.isCompleted ?? initialTask?.completed ?? false);

        // For non-recurring tasks: if the date changed, delete the old instance first
        // so there's no stale instance left on the previous date.
        const isNoRepeat = recurrence === 0;
        const oldInstanceDate = selectedItem?.date ?? initialTask?.date;
        const oldInstanceId = selectedItem?.id;
        const dateChanged = oldInstanceDate &&
          new Date(oldInstanceDate).toISOString().slice(0, 10) !== new Date(instanceDate).toISOString().slice(0, 10);

        if (isNoRepeat && dateChanged && oldInstanceId) {
          await tasksAPI.deleteTaskInstance(oldInstanceId);
        }

        await tasksAPI.upsertTaskInstance({
          taskId: editingTaskId,
          date: instanceDate,
          description: descriptionFromEditorSanitized ?? null,
          isCompleted: instanceCompleted,
          startTime: taskForm.startTime || null,
          endTime: taskForm.endTime || null,
          updateTimes: true,
        });
      } else {
        await tasksAPI.createTask(payload);
      }

      setTaskForm({
        name: '',
        description: '',
        dueDate: '',
        reminderTime: '',
        repeat: 'none',
        priority: 'low',
        tags: []
      });
      setFormGoalMilestoneId(null);
      setFormGoalId(null);
      setEditingTaskId(null);
      setShowNewTagInput(false);
      setNewTagValue('');
      selectedHistoryItemRef.current = null;

      if (onSaved) {
        onSaved();
      }
      if (onClose) {
        onClose();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(editingTaskId ? 'Failed to update task:' : 'Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    setShowNewTagInput(false);
    setNewTagValue('');
    if (onClose) onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/10 dark:bg-black/60 backdrop-blur-sm transition-all duration-300"
      onClick={handleCancel}
    >
      <div
        className="relative w-full max-w-[980px] flex flex-col bg-surface-light dark:bg-slate-800 rounded-2xl shadow-float border border-white/50 dark:border-slate-700 overflow-hidden max-h-[90vh] min-h-0 animate-fadeInScale ring-1 ring-black/5 dark:ring-slate-600/50"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalMutationProgressBar active={isSubmitting} label={t('common.processing')} />
        <div className="flex items-start justify-between px-8 pt-8 pb-4 bg-surface-light dark:bg-slate-800 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {editingTaskId ? t('daily.editTaskTitle') : t('daily.addTaskTitle')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 font-normal">
              {editingTaskId ? t('daily.editTaskDesc') : t('daily.addTaskDesc')}
            </p>
          </div>
          <button
            aria-label={t('common.close')}
            type="button"
            disabled={isSubmitting}
            className="group p-2 -mr-2 -mt-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
            onClick={handleCancel}
          >
            <span className="material-symbols-outlined text-gray-400 dark:text-slate-400 group-hover:text-gray-600 dark:group-hover:text-slate-200 text-[24px]">close</span>
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col min-h-0 flex-1"
          aria-busy={isSubmitting}
        >
          <div
            className="px-8 py-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-6 custom-scrollbar bg-surface-light dark:bg-slate-800 overscroll-contain touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                {t('daily.taskName')}
              </label>
              <div className="relative group">
                <input
                  autoFocus
                  disabled={isSubmitting}
                  className="form-input w-full rounded-lg border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 px-4 py-3 text-base focus:border-gray-400 dark:focus:border-primary focus:bg-white dark:focus:bg-slate-700 focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all font-medium shadow-sm hover:border-gray-300 dark:hover:border-slate-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder={t('daily.taskNamePlaceholder')}
                  type="text"
                  value={taskForm.name}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <label className="shrink-0 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('daily.description')}
                </label>
                {editingTaskId && (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 pb-0.5" style={{ scrollbarWidth: 'none' }}>
                    {historyLoading && (
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 shrink-0 italic">Loading…</span>
                    )}
                    {!historyLoading && historyItems.map((item) => {
                      const dateLabel = formatDate(item.date) || item.date || '—';
                      const done = !!item.isCompleted;
                      const isSelected = selectedHistoryDate && item.date
                        ? item.date.slice(0, 10) === selectedHistoryDate
                        : false;
                      return (
                        <span
                          key={item.id ?? `${item.taskId}-${item.date}`}
                          className={`group/pill shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border transition-colors text-[11px] ${isSubmitting ? 'opacity-50 pointer-events-none' : ''} ${
                            isSelected
                              ? 'border-primary bg-primary text-white dark:border-blue-400 dark:bg-blue-500 dark:text-white'
                              : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:border-primary dark:hover:border-blue-400 hover:bg-primary/5 dark:hover:bg-blue-900/20'
                          }`}
                        >
                          <button
                            type="button"
                            title={done ? 'Completed' : 'Not completed'}
                            onClick={() => handleHistoryDateClick(item)}
                            className="inline-flex items-center gap-1 focus:outline-none"
                          >
                            <span className={`material-symbols-outlined text-[13px] ${
                              isSelected
                                ? 'text-white'
                                : done ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'
                            }`}>
                              {done ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            {dateLabel}
                          </button>
                          <button
                            type="button"
                            aria-label={t('daily.deleteInstance')}
                            onClick={(e) => handleDeleteInstance(item, e)}
                            className="hidden group-hover/pill:inline-flex items-center justify-center ml-0.5 rounded-full text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 focus:outline-none transition-colors"
                          >
                            <span className="material-symbols-outlined text-[12px]">close</span>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                  {/* Plus button — create instance for today */}
                  {!historyLoading && (() => {
                    const todayStr = formatLocalDateIso(new Date());
                    const todayExists = historyItems.some((h) => h.date?.slice(0, 10) === todayStr);
                    const plusDisabled = isSubmitting || isCreatingInstance || todayExists;
                    return (
                      <button
                        type="button"
                        aria-label={t('daily.addInstance')}
                        disabled={plusDisabled}
                        onClick={handleCreateTodayInstance}
                        className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500 hover:border-primary hover:text-primary dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-400"
                      >
                        <span className="material-symbols-outlined text-[13px]">add</span>
                      </button>
                    );
                  })()}
                  </div>
                )}
              </div>
              <div
                className={`rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm hover:border-gray-300 dark:hover:border-slate-500 transition-all overflow-hidden ${isSubmitting ? 'pointer-events-none opacity-70' : ''}`}
              >
                <DefaultTemplate
                  key={editorKey}
                  placeholder={t('daily.descriptionPlaceholder')}
                  onReady={handleEditorReady}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col gap-2 flex-[2] min-w-0">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t('daily.dueDate')}</label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 dark:text-slate-500 text-[18px] pointer-events-none">event</span>
                  <input
                    disabled={isSubmitting}
                    className="form-input w-full rounded-lg border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-gray-400 dark:focus:border-primary focus:bg-white dark:focus:bg-slate-700 focus:ring-0 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    type="datetime-local"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    aria-label={t('daily.dueDateAria')}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-[1] min-w-0">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t('daily.reminderTime')}</label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 dark:text-slate-500 text-[18px] pointer-events-none">schedule</span>
                  <input
                    disabled={isSubmitting}
                    className="form-input w-full rounded-lg border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-gray-400 dark:focus:border-primary focus:bg-white dark:focus:bg-slate-700 focus:ring-0 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    type="time"
                    value={taskForm.reminderTime}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, reminderTime: e.target.value }))}
                    aria-label={t('daily.reminderTime')}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t('daily.startTime')}</label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 dark:text-slate-500 text-[18px] pointer-events-none">play_circle</span>
                  <input
                    disabled={isSubmitting}
                    className="form-input w-full rounded-lg border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-gray-400 dark:focus:border-primary focus:bg-white dark:focus:bg-slate-700 focus:ring-0 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    type="time"
                    value={taskForm.startTime}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, startTime: e.target.value }))}
                    aria-label={t('daily.startTime')}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t('daily.endTime')}</label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 dark:text-slate-500 text-[18px] pointer-events-none">stop_circle</span>
                  <input
                    disabled={isSubmitting}
                    className="form-input w-full rounded-lg border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-gray-400 dark:focus:border-primary focus:bg-white dark:focus:bg-slate-700 focus:ring-0 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    type="time"
                    value={taskForm.endTime}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, endTime: e.target.value }))}
                    aria-label={t('daily.endTime')}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('daily.repeat')}
                </label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 dark:text-slate-500 text-[18px] pointer-events-none">repeat</span>
                  <select
                    disabled={isSubmitting}
                    className="form-input w-full rounded-lg border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-gray-400 dark:focus:border-primary focus:bg-white dark:focus:bg-slate-700 focus:ring-0 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
                    value={taskForm.repeat}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, repeat: e.target.value }))}
                    aria-label={t('daily.repeat')}
                  >
                    <option value="none">{t('daily.recurrenceNone')}</option>
                    <option value="daily">{t('daily.recurrenceDaily')}</option>
                    <option value="weekly">{t('daily.recurrenceWeekly')}</option>
                    <option value="monthly">{t('daily.recurrenceMonthly')}</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('daily.priorityLabel')}
                </label>
                <div className="relative group">
                  <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] pointer-events-none ${getPriorityFlagClass(taskForm.priority)}`}>flag</span>
                  <select
                    disabled={isSubmitting}
                    className="form-input w-full rounded-lg border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-gray-400 dark:focus:border-primary focus:bg-white dark:focus:bg-slate-700 focus:ring-0 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                    aria-label={t('daily.priorityLabel')}
                  >
                    <option value="low">{t('daily.priorityLow')}</option>
                    <option value="medium">{t('daily.priorityMedium')}</option>
                    <option value="high">{t('daily.priorityHigh')}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 pb-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  {t('daily.tags')}
                </label>
              </div>
              {taskForm.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                  {taskForm.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-full shadow-sm"
                    >
                      {getTagLabel(tag)}
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleTagToggle(tag)}
                        className="hover:bg-white/20 rounded-full p-0.5 transition-colors disabled:opacity-50"
                        aria-label={t('daily.removeTag', { tag: getTagLabel(tag) })}
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {DEFAULT_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    disabled={isSubmitting}
                    className={`group flex items-center gap-1.5 px-3.5 py-1.5 border rounded-full transition-all duration-200 shadow-sm disabled:opacity-50 ${
                      taskForm.tags.includes(tag)
                        ? 'bg-primary border-primary text-white hover:bg-primary-hover'
                        : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-600'
                    }`}
                    onClick={() => handleTagToggle(tag)}
                  >
                    <span className="text-xs font-medium">{getTagLabel(tag)}</span>
                    {taskForm.tags.includes(tag) && (
                      <span className="material-symbols-outlined text-[14px] ml-0.5">close</span>
                    )}
                  </button>
                ))}
                {showNewTagInput ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      disabled={isSubmitting}
                      value={newTagValue}
                      onChange={(e) => setNewTagValue(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewTag();
                        }
                      }}
                      placeholder={t('daily.newTagPlaceholder')}
                      autoFocus
                      className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 rounded-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleAddNewTag}
                      className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
                      aria-label={t('daily.confirmAddTag')}
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setShowNewTagInput(false);
                        setNewTagValue('');
                      }}
                      className="flex items-center justify-center w-7 h-7 rounded-full text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
                      aria-label={t('common.cancel')}
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    className="group flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                    onClick={() => setShowNewTagInput(true)}
                    aria-label={t('daily.addNewTag')}
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="px-8 py-6 bg-surface-light dark:bg-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg text-gray-500 dark:text-slate-300 font-medium hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-sm disabled:opacity-50 disabled:pointer-events-none"
              onClick={handleCancel}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover transition-all shadow-minimal active:scale-[0.98] text-sm tracking-wide disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('common.processing') : (editingTaskId ? t('daily.update') : t('daily.createTask'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;

