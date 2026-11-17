import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import type { Project, TaskItem } from '../../types/workspace';
import { getTodayISO } from '../../utils/storage';

interface GanttModuleProps {
  tasks: TaskItem[];
  projects: Project[];
  onUpdateTask: (taskId: string, patch: Partial<TaskItem>) => void;
  onEditTask: (task: TaskItem) => void;
}

function shiftDateISO(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`;
}

export const GanttModule: React.FC<GanttModuleProps> = ({
  tasks,
  projects,
  onUpdateTask,
  onEditTask,
}) => {
  const today = getTodayISO();
  const [windowOffset, setWindowOffset] = useState(-4);
  const [spanDays, setSpanDays] = useState<14 | 21>(14);

  const ganttDays = useMemo(() => {
    return Array.from({ length: spanDays }, (_, idx) => {
      const iso = shiftDateISO(today, windowOffset + idx);
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return {
        iso,
        label: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isToday: iso === today,
      };
    });
  }, [today, windowOffset, spanDays]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Interactive Project Gantt Timeline
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Adjust task schedule dates, shift timelines, and update completion progress inline
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-[#0B0F17] p-1">
            {([14, 21] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setSpanDays(days)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${
                  spanDays === days
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setWindowOffset((w) => w - 7)}
            aria-label="Previous week"
            className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setWindowOffset(-4)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setWindowOffset((w) => w + 7)}
            aria-label="Next week"
            className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className={spanDays === 21 ? 'min-w-[1120px]' : 'min-w-[860px]'}>
          <div
            className="grid border-b border-slate-200 dark:border-slate-800 pb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400"
            style={{
              gridTemplateColumns: `280px repeat(${spanDays}, minmax(36px, 1fr))`,
            }}
          >
            <div>Task · Project · Dates</div>
            {ganttDays.map((day) => (
              <div
                key={day.iso}
                className={`text-center tabular-nums ${
                  day.isToday ? 'font-semibold text-blue-600 dark:text-blue-400' : ''
                }`}
              >
                {day.label}
              </div>
            ))}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                No tasks in this project yet.
              </p>
            ) : (
              tasks.map((task) => {
                const project = projects.find((p) => p.id === task.projectId);
                const firstDay = ganttDays[0].iso;
                const lastDay = ganttDays[ganttDays.length - 1].iso;

                const visible = !(task.dueDate < firstDay || task.startDate > lastDay);
                const startIdx = Math.max(
                  0,
                  ganttDays.findIndex((d) => d.iso >= task.startDate)
                );
                const rawEndIdx = ganttDays.findIndex((d) => d.iso >= task.dueDate);
                const endIdx =
                  rawEndIdx === -1 ? spanDays - 1 : Math.max(startIdx, rawEndIdx);
                const span = Math.max(1, endIdx - startIdx + 1);

                return (
                  <div
                    key={task.id}
                    className="grid items-center py-3"
                    style={{
                      gridTemplateColumns: `280px repeat(${spanDays}, minmax(36px, 1fr))`,
                    }}
                  >
                    <div className="pr-4 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                          {task.title}
                        </p>
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          aria-label={`Edit ${task.title}`}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer shrink-0"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {project ? project.name : 'Unassigned'} · {task.startDate} →{' '}
                        {task.dueDate}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={task.progress}
                          onChange={(e) => {
                            const nextProg = Number(e.target.value);
                            onUpdateTask(task.id, {
                              progress: nextProg,
                              kanbanStatus: nextProg === 100 ? 'done' : task.kanbanStatus,
                            });
                          }}
                          className="w-24 accent-blue-600 cursor-pointer"
                          aria-label={`Progress for ${task.title}`}
                        />
                        <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                          {task.progress}%
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTask(task.id, {
                              startDate: shiftDateISO(task.startDate, -1),
                              dueDate: shiftDateISO(task.dueDate, -1),
                            })
                          }
                          title="Shift earlier 1 day"
                          className="rounded border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          -1d
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTask(task.id, {
                              startDate: shiftDateISO(task.startDate, 1),
                              dueDate: shiftDateISO(task.dueDate, 1),
                            })
                          }
                          title="Shift later 1 day"
                          className="rounded border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          +1d
                        </button>
                      </div>
                    </div>

                    {visible && (
                      <div
                        style={{
                          gridColumn: `${startIdx + 2} / span ${span}`,
                        }}
                        className="px-0.5"
                      >
                        <div
                          className={`h-7 rounded-md px-2 flex items-center justify-between text-[11px] font-medium text-white ${
                            task.kanbanStatus === 'done'
                              ? 'bg-emerald-600'
                              : task.quadrant === 'Q1'
                              ? 'bg-red-600'
                              : 'bg-blue-600'
                          }`}
                        >
                          <span className="truncate">{task.quadrant}</span>
                          <span className="font-mono tabular-nums ml-1">{task.progress}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
