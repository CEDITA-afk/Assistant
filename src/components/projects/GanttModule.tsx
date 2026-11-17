import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import type { Project, TaskItem } from '../../types/workspace';
import { formatShortDateIT } from '../../utils/formatters';
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
  const [windowOffset, setWindowOffset] = useState(-3);
  const [spanDays, setSpanDays] = useState<14 | 30>(14);

  const ganttDays = useMemo(() => {
    return Array.from({ length: spanDays }, (_, idx) => {
      const iso = shiftDateISO(today, windowOffset + idx);
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return {
        iso,
        label: dt.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
        isToday: iso === today,
      };
    });
  }, [today, windowOffset, spanDays]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Timeline Gantt Interattiva
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sposta le date, cambia zoom (2 settimane o mese) e aggiorna l&apos;avanzamento
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-[#0B0F17] p-1">
            {([
              [14, '14 Giorni'],
              [30, '30 Giorni'],
            ] as const).map(([days, label]) => (
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
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setWindowOffset((w) => w - 7)}
            aria-label="Settimana precedente"
            className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setWindowOffset(-3)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Oggi
          </button>
          <button
            type="button"
            onClick={() => setWindowOffset((w) => w + 7)}
            aria-label="Settimana successiva"
            className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className={spanDays === 30 ? 'min-w-[1380px]' : 'min-w-[860px]'}>
          <div
            className="grid border-b border-slate-200 dark:border-slate-800 pb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400"
            style={{
              gridTemplateColumns: `260px repeat(${spanDays}, minmax(34px, 1fr))`,
            }}
          >
            <div>Task · Progetto · Date</div>
            {ganttDays.map((day) => (
              <div
                key={day.iso}
                className={`text-center tabular-nums px-0.5 rounded ${
                  day.isToday
                    ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10'
                    : ''
                }`}
              >
                {day.isToday ? 'OGGI' : day.label}
              </div>
            ))}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                Nessun task presente in questo filtro.
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
                      gridTemplateColumns: `260px repeat(${spanDays}, minmax(34px, 1fr))`,
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
                          aria-label={`Modifica ${task.title}`}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer shrink-0"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {project ? project.name : 'Non assegnato'} · {formatShortDateIT(task.startDate)} →{' '}
                        {formatShortDateIT(task.dueDate)}
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
                          aria-label={`Avanzamento per ${task.title}`}
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
                          title="Anticipa di 1 giorno"
                          className="rounded border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          -1g
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTask(task.id, {
                              startDate: shiftDateISO(task.startDate, 1),
                              dueDate: shiftDateISO(task.dueDate, 1),
                            })
                          }
                          title="Posticipa di 1 giorno"
                          className="rounded border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          +1g
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
