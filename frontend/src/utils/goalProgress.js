/**
 * Goal progress utilities.
 */

/**
 * Compute goal completion percent by tasks (completed tasks / total tasks).
 * Task items can have isCompleted or completed (boolean).
 *
 * @param {Array<{ isCompleted?: boolean, completed?: boolean }>} tasks - List of tasks for the goal.
 * @returns {number} 0–100. Returns 0 if no tasks.
 */
export function getGoalTaskCompletionPercent(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.isCompleted === true || t.completed === true).length;
  const percent = (completed / tasks.length) * 100;
  return Math.min(100, Math.max(0, Math.round(percent * 10) / 10));
}

/**
 * Compute goal completion percent by milestones (completed milestones / total milestones).
 * Milestone items can have isCompleted or completed (boolean).
 *
 * @param {Array<{ isCompleted?: boolean, completed?: boolean }>} milestones - List of milestones for the goal.
 * @returns {number} 0–100. Returns 0 if no milestones.
 */
export function getGoalMilestoneCompletionPercent(milestones) {
  if (!Array.isArray(milestones) || milestones.length === 0) return 0;
  const completed = milestones.filter((m) => m.isCompleted === true || m.completed === true).length;
  const percent = (completed / milestones.length) * 100;
  return Math.min(100, Math.max(0, Math.round(percent * 10) / 10));
}

/**
 * Compute goal completion percent by time elapsed.
 * Uses the period from startDate to targetDate; if startDate is missing, uses now as start (result 0 until target).
 *
 * @param {string|Date|null} targetDate - Goal target/end date (required).
 * @param {string|Date|null} [startDate] - Goal start date. If null/undefined, uses current date (time % = 0 until target).
 * @param {Date} [asOf=new Date()] - Date to compute "now" (for tests).
 * @returns {number} 0–100 (percentage of time elapsed), or 0 if target is in the past or invalid.
 */
export function getGoalTimeCompletionPercent(targetDate, startDate, asOf = new Date()) {
  const end = targetDate ? new Date(targetDate) : null;
  if (!end || Number.isNaN(end.getTime())) return 0;

  const now = asOf instanceof Date ? asOf : new Date(asOf);
  const start = startDate ? new Date(startDate) : now;
  if (Number.isNaN(start.getTime())) return 0;

  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0) return 100; // already past target

  const elapsedMs = now.getTime() - start.getTime();
  if (elapsedMs <= 0) return 0;

  const percent = (elapsedMs / totalMs) * 100;
  return Math.min(100, Math.max(0, Math.round(percent * 10) / 10));
}
