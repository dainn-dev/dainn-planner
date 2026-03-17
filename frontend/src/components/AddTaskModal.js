import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_TAGS, TAG_I18N_KEYS } from '../constants/tasks';
import { tasksAPI } from '../services/api';
import { DefaultTemplate } from './lexkit/DefaultTemplate';

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
    tags: []
  });
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  taskFormRef.current = taskForm;

  const getTagLabel = (tag) => (TAG_I18N_KEYS[tag] ? t(`daily.${TAG_I18N_KEYS[tag]}`) : tag);

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
        tags: initialTask.tags ? [...initialTask.tags] : []
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
        tags: initialTask?.tags ? [...initialTask.tags] : []
      });
    }
    setShowNewTagInput(false);
    setNewTagValue('');
  }, [open, initialTask, goalContext]);

  const handleEditorReady = useCallback((methods) => {
    editorMethodsRef.current = methods;
    const desc = taskFormRef.current?.description;
    if (desc) {
      methods.injectHTML(desc);
    }
  }, []);

  // Re-mount the editor when the modal opens so it picks up new initial content
  useEffect(() => {
    if (open) {
      setEditorKey(k => k + 1);
    }
  }, [open, editingTaskId]);

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
    if (!taskForm.name.trim()) return;

    const datePayload = taskForm.dueDate
      ? new Date(taskForm.dueDate).toISOString()
      : new Date().toISOString();
    const priorityMap = { low: 0, medium: 1, high: 2 };
    const priorityInt = priorityMap[taskForm.priority] ?? 0;
    const recurrenceMap = { none: 0, daily: 1, weekly: 2, monthly: 3 };
    const recurrence = recurrenceMap[taskForm.repeat] ?? 0;
    const descriptionFromEditor =
      editorMethodsRef.current?.getHTML() ?? taskForm.description ?? '';

    const payload = {
      title: taskForm.name.trim(),
      description: descriptionFromEditor,
      date: datePayload,
      priority: priorityInt,
      recurrence,
      reminderTime: taskForm.reminderTime || undefined,
      tags: taskForm.tags,
    };

    if (editingTaskId) {
      payload.goalMilestoneId = formGoalMilestoneId ?? null;
      payload.goalId = formGoalId ?? null;
    } else {
      if (formGoalMilestoneId) payload.goalMilestoneId = formGoalMilestoneId;
      if (formGoalId) payload.goalId = formGoalId;
    }

    try {
      if (editingTaskId) {
        await tasksAPI.updateTask(editingTaskId, payload);
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

      if (onSaved) {
        onSaved();
      }
      if (onClose) {
        onClose();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(editingTaskId ? 'Failed to update task:' : 'Failed to create task:', error);
    }
  };

  const handleCancel = () => {
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
        className="w-full max-w-[580px] flex flex-col bg-surface-light dark:bg-slate-800 rounded-2xl shadow-float border border-white/50 dark:border-slate-700 overflow-hidden max-h-[90vh] min-h-0 animate-fadeInScale ring-1 ring-black/5 dark:ring-slate-600/50"
        onClick={(e) => e.stopPropagation()}
      >
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
            className="group p-2 -mr-2 -mt-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors focus:outline-none"
            onClick={handleCancel}
          >
            <span className="material-symbols-outlined text-gray-400 dark:text-slate-400 group-hover:text-gray-600 dark:group-hover:text-slate-200 text-[24px]">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
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
                  className="form-input w-full rounded-lg border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 px-4 py-3 text-base focus:border-gray-400 dark:focus:border-primary focus:bg-white dark:focus:bg-slate-700 focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all font-medium shadow-sm hover:border-gray-300 dark:hover:border-slate-500"
                  placeholder={t('daily.taskNamePlaceholder')}
                  type="text"
                  value={taskForm.name}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                {t('daily.description')}
              </label>
              <div className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm hover:border-gray-300 dark:hover:border-slate-500 transition-all overflow-hidden">
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
                    className="form-input w-full rounded-lg border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-gray-400 dark:focus:border-primary focus:bg-white dark:focus:bg-slate-700 focus:ring-0 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm"
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
                    className="form-input w-full rounded-lg border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-gray-400 dark:focus:border-primary focus:bg-white dark:focus:bg-slate-700 focus:ring-0 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm"
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
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('daily.repeat')}
                </label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 dark:text-slate-500 text-[18px] pointer-events-none">repeat</span>
                  <select
                    className="form-input w-full rounded-lg border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-gray-400 dark:focus:border-primary focus:bg-white dark:focus:bg-slate-700 focus:ring-0 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm appearance-none"
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
                    className="form-input w-full rounded-lg border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-gray-400 dark:focus:border-primary focus:bg-white dark:focus:bg-slate-700 focus:ring-0 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm appearance-none"
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
                        onClick={() => handleTagToggle(tag)}
                        className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
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
                    className={`group flex items-center gap-1.5 px-3.5 py-1.5 border rounded-full transition-all duration-200 shadow-sm ${
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
                      onClick={handleAddNewTag}
                      className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white hover:bg-primary-hover transition-colors"
                      aria-label={t('daily.confirmAddTag')}
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewTagInput(false);
                        setNewTagValue('');
                      }}
                      className="flex items-center justify-center w-7 h-7 rounded-full text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-600 transition-all"
                      aria-label={t('common.cancel')}
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="group flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
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
              className="px-5 py-2.5 rounded-lg text-gray-500 dark:text-slate-300 font-medium hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-sm"
              onClick={handleCancel}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover transition-all shadow-minimal active:scale-[0.98] text-sm tracking-wide"
            >
              {editingTaskId ? t('daily.update') : t('daily.createTask')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;

