import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { KanbanColumn, Project, TaskItem } from '../../types/workspace';
import { KANBAN_LABELS } from '../../utils/formatters';
import { getTodayISO } from '../../utils/storage';
import { TaskCard } from './TaskCard';

interface KanbanModuleProps {
  tasks: TaskItem[];
  projects: Project[];
  activeProjectId: string;
  isGoogleConnected: boolean;
  onQuickAddTask: (task: Omit<TaskItem, 'id' | 'updatedAt'>) => void;
  onUpdateTask: (taskId: string, patch: Partial<TaskItem>) => void;
  onDeleteTask: (task: TaskItem) => void;
  onEditTask: (task: TaskItem) => void;
  onOpenAttach: (taskId: string) => void;
  onRemoveAttachment: (task: TaskItem, attachmentId: string) => void;
  onPushToGoogle: (task: TaskItem) => void;
}

const KANBAN_COLS: Array<{ id: KanbanColumn; title: string; defaultProgress: number }> = [
  { id: 'backlog', title: KANBAN_LABELS.backlog, defaultProgress: 0 },
  { id: 'in_progress', title: KANBAN_LABELS.in_progress, defaultProgress: 45 },
  { id: 'review', title: KANBAN_LABELS.review, defaultProgress: 85 },
  { id: 'done', title: KANBAN_LABELS.done, defaultProgress: 100 },
];

export const KanbanModule: React.FC<KanbanModuleProps> = ({
  tasks,
  projects,
  activeProjectId,
  isGoogleConnected,
  onQuickAddTask,
  onUpdateTask,
  onDeleteTask,
  onEditTask,
  onOpenAttach,
  onRemoveAttachment,
  onPushToGoogle,
}) => {
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [mobileColFilter, setMobileColFilter] = useState<'ALL' | KanbanColumn>('ALL');
  const [colInputs, setColInputs] = useState<Record<KanbanColumn, string>>({
    backlog: '',
    in_progress: '',
    review: '',
    done: '',
  });

  const handleQuickAdd = (col: KanbanColumn, defaultProgress: number) => {
    const val = colInputs[col].trim();
    if (!val) return;
    const today = getTodayISO();
    onQuickAddTask({
      projectId: activeProjectId === 'ALL' ? projects[0]?.id : activeProjectId,
      title: val,
      quadrant: 'Q2',
      kanbanStatus: col,
      priority: 'medium',
      startDate: today,
      dueDate: today,
      progress: defaultProgress,
      pomodoroSessions: 0,
      attachments: [],
    });
    setColInputs((prev) => ({ ...prev, [col]: '' }));
  };

  return (
    <div className="space-y-3">
      {/* Filtro colonna rapido per smartphone Pixel Pro */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setMobileColFilter('ALL')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
            mobileColFilter === 'ALL'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          Tutte ({tasks.length})
        </button>
        {KANBAN_COLS.map((c) => {
          const count = tasks.filter((t) => t.kanbanStatus === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setMobileColFilter(c.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                mobileColFilter === c.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {c.title} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {KANBAN_COLS.filter(
          (col) => mobileColFilter === 'ALL' || mobileColFilter === col.id
        ).map((col) => {
          const colTasks = tasks.filter((t) => t.kanbanStatus === col.id);
          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragTaskId) {
                  onUpdateTask(dragTaskId, {
                    kanbanStatus: col.id,
                    progress: col.defaultProgress,
                  });
                  setDragTaskId(null);
                }
              }}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 min-h-[260px] md:min-h-[380px] flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {col.title}
                  </h3>
                  <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      project={projects.find((p) => p.id === task.projectId)}
                      isGoogleConnected={isGoogleConnected}
                      onDragStart={() => setDragTaskId(task.id)}
                      onToggleDone={() =>
                        onUpdateTask(task.id, {
                          kanbanStatus: task.kanbanStatus === 'done' ? 'backlog' : 'done',
                          progress: task.kanbanStatus === 'done' ? 50 : 100,
                        })
                      }
                      onEdit={() => onEditTask(task)}
                      onOpenAttach={() => onOpenAttach(task.id)}
                      onRemoveAttachment={(aid) => onRemoveAttachment(task, aid)}
                      onPushToGoogle={() => onPushToGoogle(task)}
                      onDelete={() => onDeleteTask(task)}
                      onMoveKanban={(nextCol) =>
                        onUpdateTask(task.id, {
                          kanbanStatus: nextCol,
                          progress: nextCol === 'done' ? 100 : task.progress,
                        })
                      }
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <p className="text-xs text-slate-400 py-8 text-center">
                      Trascina qui o aggiungi un task sotto
                    </p>
                  )}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleQuickAdd(col.id, col.defaultProgress);
                }}
                className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"
              >
                <input
                  type="text"
                  value={colInputs[col.id]}
                  onChange={(e) =>
                    setColInputs((prev) => ({ ...prev, [col.id]: e.target.value }))
                  }
                  placeholder={`Aggiungi in ${col.title}...`}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  aria-label={`Aggiungi task in ${col.title}`}
                  className="rounded-lg bg-slate-900 dark:bg-slate-100 p-1.5 text-white dark:text-slate-900 hover:opacity-90 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
};
