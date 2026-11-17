import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type {
  EisenhowerQuadrant,
  Project,
  TaskItem,
  TaskPriority,
} from '../../types/workspace';
import { getTodayISO } from '../../utils/storage';
import { TaskCard } from './TaskCard';

interface EisenhowerModuleProps {
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

const QUADRANTS: Array<{
  id: EisenhowerQuadrant;
  title: string;
  subtitle: string;
  defaultPriority: TaskPriority;
}> = [
  { id: 'Q1', title: 'Q1 · Do First', subtitle: 'Urgent & Important', defaultPriority: 'critical' },
  { id: 'Q2', title: 'Q2 · Schedule', subtitle: 'Not Urgent & Important', defaultPriority: 'high' },
  { id: 'Q3', title: 'Q3 · Delegate', subtitle: 'Urgent & Not Important', defaultPriority: 'medium' },
  { id: 'Q4', title: 'Q4 · Eliminate', subtitle: 'Neither Urgent Nor Important', defaultPriority: 'low' },
];

export const EisenhowerModule: React.FC<EisenhowerModuleProps> = ({
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
  const [quickInputs, setQuickInputs] = useState<Record<EisenhowerQuadrant, string>>({
    Q1: '',
    Q2: '',
    Q3: '',
    Q4: '',
  });

  const handleQuickAdd = (q: EisenhowerQuadrant, defaultPriority: TaskPriority) => {
    const val = quickInputs[q].trim();
    if (!val) return;
    const today = getTodayISO();
    onQuickAddTask({
      projectId: activeProjectId === 'ALL' ? projects[0]?.id : activeProjectId,
      title: val,
      quadrant: q,
      kanbanStatus: 'backlog',
      priority: defaultPriority,
      startDate: today,
      dueDate: today,
      progress: 0,
      pomodoroSessions: 0,
      attachments: [],
    });
    setQuickInputs((prev) => ({ ...prev, [q]: '' }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {QUADRANTS.map((q) => {
        const qTasks = tasks.filter((t) => t.quadrant === q.id);
        return (
          <div
            key={q.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragTaskId) {
                onUpdateTask(dragTaskId, { quadrant: q.id });
                setDragTaskId(null);
              }
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 min-h-[260px] flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {q.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {q.subtitle}
                  </p>
                </div>
                <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {qTasks.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {qTasks.map((task) => (
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
                    onMoveQuadrant={(nextQ) => onUpdateTask(task.id, { quadrant: nextQ })}
                  />
                ))}
                {qTasks.length === 0 && (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    Drag tasks here or quick-add below for {q.id}
                  </p>
                )}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleQuickAdd(q.id, q.defaultPriority);
              }}
              className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"
            >
              <input
                type="text"
                value={quickInputs[q.id]}
                onChange={(e) =>
                  setQuickInputs((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                placeholder={`Quick add to ${q.id}...`}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                aria-label={`Add task to ${q.id}`}
                className="rounded-lg bg-slate-900 dark:bg-slate-100 p-1.5 text-white dark:text-slate-900 hover:opacity-90 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        );
      })}
    </div>
  );
};
