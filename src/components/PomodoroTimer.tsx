import React from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import type { TaskItem } from '../types/workspace';

export type PomodoroMode = 'focus' | 'short_break' | 'long_break';

interface PomodoroTimerProps {
  tasks: TaskItem[];
  mode: PomodoroMode;
  secondsLeft: number;
  running: boolean;
  selectedTaskId: string;
  completedCount: number;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  onToggleRun: () => void;
  onReset: () => void;
  onSwitchMode: (mode: PomodoroMode) => void;
  onSkipPhase: () => void;
  onSelectTask: (taskId: string) => void;
  onUpdateDurations: (focusMin: number, shortMin: number, longMin: number) => void;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  tasks,
  mode,
  secondsLeft,
  running,
  selectedTaskId,
  completedCount,
  focusMinutes,
  shortBreakMinutes,
  longBreakMinutes,
  onToggleRun,
  onReset,
  onSwitchMode,
  onSkipPhase,
  onSelectTask,
  onUpdateDurations,
}) => {
  const totalDuration =
    mode === 'focus'
      ? focusMinutes * 60
      : mode === 'short_break'
      ? shortBreakMinutes * 60
      : longBreakMinutes * 60;
  const progress = Math.max(0, Math.min(1, 1 - secondsLeft / Math.max(1, totalDuration)));
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const minsDisplay = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secsDisplay = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 sm:p-5 flex flex-col justify-between gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Pomodoro Deep Work
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sessione {completedCount + 1} · Avviso aptico a fine fase
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-[#0B0F17] p-1">
          {([
            ['focus', 'Focus'],
            ['short_break', 'Breve'],
            ['long_break', 'Lunga'],
          ] as Array<[PomodoroMode, string]>).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => onSwitchMode(m)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                mode === m
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 py-1">
        <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
          <svg className="h-36 w-36 -rotate-90" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-100 dark:text-slate-800"
            />
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className={`transition-all duration-300 ${
                mode === 'focus'
                  ? 'text-blue-600 dark:text-blue-500'
                  : 'text-emerald-600 dark:text-emerald-500'
              }`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
              {minsDisplay}:{secsDisplay}
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {mode === 'focus'
                ? 'Focus Profondo'
                : mode === 'short_break'
                ? 'Pausa Breve'
                : 'Pausa Lunga'}
            </span>
          </div>
        </div>

        <div className="flex-1 w-full space-y-3">
          <div>
            <label
              htmlFor="pomodoro-task-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Task Prioritario Collegato
            </label>
            <select
              id="pomodoro-task-select"
              value={selectedTaskId}
              onChange={(e) => onSelectTask(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Deep Work Generale (Nessun task)</option>
              {tasks
                .filter((t) => t.kanbanStatus !== 'done')
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.quadrant}] {t.title}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleRun}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              {running ? (
                <>
                  <Pause className="h-3.5 w-3.5" /> Pausa
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" /> Avvia Flow
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onReset}
              aria-label="Reimposta timer"
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onSkipPhase}
              aria-label="Completa e passa alla fase successiva"
              title="Completa fase attuale"
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <label className="flex flex-col gap-0.5">
              <span>Focus (m)</span>
              <input
                type="number"
                min={5}
                max={90}
                value={focusMinutes}
                onChange={(e) =>
                  onUpdateDurations(
                    Math.max(5, Number(e.target.value) || 25),
                    shortBreakMinutes,
                    longBreakMinutes
                  )
                }
                className="w-full rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2 py-1 font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span>Breve (m)</span>
              <input
                type="number"
                min={1}
                max={30}
                value={shortBreakMinutes}
                onChange={(e) =>
                  onUpdateDurations(
                    focusMinutes,
                    Math.max(1, Number(e.target.value) || 5),
                    longBreakMinutes
                  )
                }
                className="w-full rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2 py-1 font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span>Lunga (m)</span>
              <input
                type="number"
                min={5}
                max={45}
                value={longBreakMinutes}
                onChange={(e) =>
                  onUpdateDurations(
                    focusMinutes,
                    shortBreakMinutes,
                    Math.max(5, Number(e.target.value) || 15)
                  )
                }
                className="w-full rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2 py-1 font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
