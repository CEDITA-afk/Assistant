import React, { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Droplets,
  Footprints,
  Plus,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import type { NavSection, WorkspaceData } from '../types/workspace';
import { getTodayISO } from '../utils/storage';
import { PomodoroTimer, type PomodoroMode } from './PomodoroTimer';

interface OverviewDashboardProps {
  data: WorkspaceData;
  pomodoroTrigger: { mode: PomodoroMode; minutes?: number; nonce: number } | null;
  onNavigate: (section: NavSection) => void;
  onToggleReminder: (id: string) => void;
  onToggleTaskDone: (id: string) => void;
  onToggleShoppingItem: (id: string) => void;
  onAddShoppingItem: (name: string) => void;
  onLogWater: (ml: number) => void;
  onLogSteps: (steps: number) => void;
  onPomodoroComplete: (mode: PomodoroMode, minutes: number, taskId?: string) => void;
  onUpdatePomodoroDurations: (focusMin: number, shortMin: number, longMin: number) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  data,
  pomodoroTrigger,
  onNavigate,
  onToggleReminder,
  onToggleTaskDone,
  onToggleShoppingItem,
  onAddShoppingItem,
  onLogWater,
  onLogSteps,
  onPomodoroComplete,
  onUpdatePomodoroDurations,
}) => {
  const [quickShop, setQuickShop] = useState('');
  const today = getTodayISO();

  const todayEvents = data.events
    .filter((e) => e.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const openTasks = data.tasks.filter((t) => t.kanbanStatus !== 'done');
  const q1Count = openTasks.filter((t) => t.quadrant === 'Q1').length;

  const currentMonth = today.slice(0, 7);
  const monthSpent = data.expenses
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((acc, e) => acc + e.amount, 0);
  const budgetRemaining = Math.max(0, data.budget.totalLimit - monthSpent);
  const budgetPct = Math.min(100, Math.round((monthSpent / Math.max(1, data.budget.totalLimit)) * 100));

  const todayHealth = data.healthLogs.find((h) => h.date === today) || {
    date: today,
    steps: 0,
    stepGoal: 10000,
    kcalBurned: 0,
    kcalGoal: 600,
    waterMl: 0,
    waterGoalMl: 2500,
    workouts: [],
  };

  const waterPct = Math.min(
    100,
    Math.round((todayHealth.waterMl / Math.max(1, todayHealth.waterGoalMl)) * 100)
  );
  const stepPct = Math.min(
    100,
    Math.round((todayHealth.steps / Math.max(1, todayHealth.stepGoal)) * 100)
  );

  const handleQuickShopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickShop.trim()) return;
    onAddShoppingItem(quickShop.trim());
    setQuickShop('');
  };

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('schedule')}
          className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 hover:border-blue-500/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Today&apos;s Agenda</span>
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {todayEvents.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              events · {data.reminders.filter((r) => !r.completed).length} reminders
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('projects')}
          className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 hover:border-blue-500/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Priority Tasks</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {openTasks.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              open · {q1Count} urgent Q1
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('finance')}
          className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 hover:border-blue-500/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Monthly Budget Left</span>
            <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              ${budgetRemaining.toFixed(0)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {budgetPct}% used of ${data.budget.totalLimit}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('fitness')}
          className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 hover:border-blue-500/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Steps &amp; Hydration</span>
            <Footprints className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {todayHealth.steps.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {stepPct}% steps · {todayHealth.waterMl}ml water
            </span>
          </div>
        </button>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 cols: Pomodoro + Schedule & Reminders */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <PomodoroTimer
            tasks={data.tasks}
            focusMinutes={data.preferences.pomodoroFocusMin}
            shortBreakMinutes={data.preferences.pomodoroShortBreakMin}
            longBreakMinutes={data.preferences.pomodoroLongBreakMin}
            externalTrigger={pomodoroTrigger}
            onSessionComplete={onPomodoroComplete}
            onUpdateDurations={onUpdatePomodoroDurations}
          />

          <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Today&apos;s Timeline &amp; Reminders
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Check off reminders for instant haptic confirmation
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('schedule')}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap cursor-pointer"
              >
                Full Calendar <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5">
                  Scheduled Events
                </h4>
                {todayEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
                    No events scheduled for today. Use Voice Command to schedule one.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {todayEvents.map((ev) => (
                      <div key={ev.id} className="py-2.5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {ev.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            {ev.startTime} – {ev.endTime}
                            {ev.location ? ` · ${ev.location}` : ''}
                          </p>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 capitalize shrink-0">
                          {ev.category}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5">
                  Daily Reminders
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.reminders.slice(0, 5).map((rem) => (
                    <label
                      key={rem.id}
                      className="py-2.5 flex items-start gap-2.5 cursor-pointer group"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleReminder(rem.id)}
                        aria-label={`Mark reminder ${rem.title} ${rem.completed ? 'incomplete' : 'complete'}`}
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer ${
                          rem.completed
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 group-hover:border-blue-500'
                        }`}
                      >
                        {rem.completed && <Check className="h-3 w-3" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm leading-snug ${
                            rem.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {rem.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {rem.time} · {rem.repeat === 'none' ? 'Once' : rem.repeat}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 cols: Eisenhower Top Tasks + Quick Health + Quick Shopping */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Quick Eisenhower Priority Focus */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Top Eisenhower Priorities
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('projects')}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap cursor-pointer"
              >
                Matrix &amp; Board <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {openTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleTaskDone(task.id)}
                      aria-label={`Complete task ${task.title}`}
                      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 dark:border-slate-600 hover:border-emerald-500 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {task.quadrant} · {task.priority} · Due {task.dueDate}
                        {task.attachments.length > 0
                          ? ` · ${task.attachments.length} file`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                    {task.progress}%
                  </span>
                </div>
              ))}
              {openTasks.length === 0 && (
                <p className="py-4 text-xs text-slate-500 dark:text-slate-400">
                  All priority tasks completed.
                </p>
              )}
            </div>
          </div>

          {/* Quick Hydration & Steps */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Daily Wellness Quick Log
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('fitness')}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap cursor-pointer"
              >
                Health Charts <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <Droplets className="h-3.5 w-3.5 text-blue-500" /> Water Intake
                  </span>
                  <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {todayHealth.waterMl} / {todayHealth.waterGoalMl} ml ({waterPct}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                    style={{ width: `${waterPct}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onLogWater(250)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    +250 ml
                  </button>
                  <button
                    type="button"
                    onClick={() => onLogWater(500)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    +500 ml
                  </button>
                  <button
                    type="button"
                    onClick={() => onLogSteps(1500)}
                    className="ml-auto rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    +1,500 Steps
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Shopping List */}
          <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Shopping List
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('finance')}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap cursor-pointer"
              >
                Budget &amp; Sheets <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <form onSubmit={handleQuickShopSubmit} className="flex gap-2 mb-3">
              <input
                type="text"
                value={quickShop}
                onChange={(e) => setQuickShop(e.target.value)}
                placeholder="Quick add grocery or item..."
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Add shopping item"
                className="rounded-lg bg-slate-900 dark:bg-slate-100 px-3 py-1.5 text-xs font-medium text-white dark:text-slate-900 hover:opacity-90 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </form>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.shoppingList.slice(0, 4).map((item) => (
                <label
                  key={item.id}
                  className="py-2 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleShoppingItem(item.id)}
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border cursor-pointer ${
                        item.checked
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {item.checked && <Check className="h-3 w-3" />}
                    </button>
                    <span
                      className={`text-xs truncate ${
                        item.checked
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {item.name} · {item.quantity}
                    </span>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                    ${item.estimatedPrice.toFixed(2)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
