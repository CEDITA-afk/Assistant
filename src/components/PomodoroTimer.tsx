import React, { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import type { TaskItem } from '../types/workspace';

export type PomodoroMode = 'focus' | 'short_break' | 'long_break';

interface PomodoroTimerProps {
  tasks: TaskItem[];
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  externalTrigger?: { mode: PomodoroMode; minutes?: number; nonce: number } | null;
  onSessionComplete: (mode: PomodoroMode, minutes: number, taskId?: string) => void;
  onUpdateDurations: (focusMin: number, shortMin: number, longMin: number) => void;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  tasks,
  focusMinutes,
  shortBreakMinutes,
  longBreakMinutes,
  externalTrigger,
  onSessionComplete,
  onUpdateDurations,
}) => {
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(focusMinutes * 60);
  const [running, setRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    tasks.find((t) => t.kanbanStatus !== 'done')?.id || ''
  );
  const [completedCount, setCompletedCount] = useState(0);

  const getDurationForMode = (m: PomodoroMode) => {
    if (m === 'focus') return focusMinutes * 60;
    if (m === 'short_break') return shortBreakMinutes * 60;
    return longBreakMinutes * 60;
  };

  useEffect(() => {
    if (!running) {
      setSecondsLeft(getDurationForMode(mode));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMinutes, shortBreakMinutes, longBreakMinutes]);

  useEffect(() => {
    if (!externalTrigger) return;
    setMode(externalTrigger.mode);
    const customSeconds = externalTrigger.minutes
      ? externalTrigger.minutes * 60
      : getDurationForMode(externalTrigger.mode);
    setSecondsLeft(customSeconds);
    setRunning(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTrigger?.nonce]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          const mins =
            mode === 'focus'
              ? focusMinutes
              : mode === 'short_break'
              ? shortBreakMinutes
              : longBreakMinutes;
          onSessionComplete(mode, mins, selectedTaskId || undefined);
          if (mode === 'focus') {
            setCompletedCount((c) => c + 1);
          }
          const nextMode: PomodoroMode =
            mode === 'focus'
              ? (completedCount + 1) % 4 === 0
                ? 'long_break'
                : 'short_break'
              : 'focus';
          setMode(nextMode);
          return nextMode === 'focus'
            ? focusMinutes * 60
            : nextMode === 'short_break'
            ? shortBreakMinutes * 60
            : longBreakMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [
    running,
    mode,
    focusMinutes,
    shortBreakMinutes,
    longBreakMinutes,
    selectedTaskId,
    completedCount,
    onSessionComplete,
  ]);

  const switchMode = (next: PomodoroMode) => {
    setRunning(false);
    setMode(next);
    setSecondsLeft(getDurationForMode(next));
  };

  const totalDuration = getDurationForMode(mode);
  const progress = Math.max(0, Math.min(1, 1 - secondsLeft / Math.max(1, totalDuration)));
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const minsDisplay = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secsDisplay = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Deep Work Pomodoro
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Session {completedCount + 1} · Haptic alerts on phase finish
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-[#0B0F17] p-1">
          {([
            ['focus', 'Focus'],
            ['short_break', 'Short'],
            ['long_break', 'Long'],
          ] as Array<[PomodoroMode, string]>).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
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

      <div className="flex flex-col sm:flex-row items-center gap-6 py-1">
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
              {mode === 'focus' ? 'Deep Focus' : mode === 'short_break' ? 'Recovery' : 'Long Rest'}
            </span>
          </div>
        </div>

        <div className="flex-1 w-full space-y-3">
          <div>
            <label
              htmlFor="pomodoro-task-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Linked Priority Task
            </label>
            <select
              id="pomodoro-task-select"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="">General Deep Work (Unlinked)</option>
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
              onClick={() => setRunning((r) => !r)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              {running ? (
                <>
                  <Pause className="h-3.5 w-3.5" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" /> Start Flow
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setRunning(false);
                setSecondsLeft(getDurationForMode(mode));
              }}
              aria-label="Reset timer"
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const mins =
                  mode === 'focus'
                    ? focusMinutes
                    : mode === 'short_break'
                    ? shortBreakMinutes
                    : longBreakMinutes;
                onSessionComplete(mode, mins, selectedTaskId || undefined);
                switchMode(mode === 'focus' ? 'short_break' : 'focus');
              }}
              aria-label="Complete and skip phase"
              title="Complete current phase"
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
              <span>Short (m)</span>
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
              <span>Long (m)</span>
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
