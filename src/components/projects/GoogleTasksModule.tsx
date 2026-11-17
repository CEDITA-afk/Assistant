import React from 'react';
import { CloudUpload, RefreshCw } from 'lucide-react';
import type { GoogleTaskList } from '../../services/googleWorkspace';
import type { Project, TaskItem } from '../../types/workspace';

interface GoogleTasksModuleProps {
  tasks: TaskItem[];
  projects: Project[];
  googleTaskLists: GoogleTaskList[];
  selectedTaskListId: string;
  isGoogleConnected: boolean;
  syncingTasks: boolean;
  onSelectTaskListId: (id: string) => void;
  onSyncGoogleTasks: (listId?: string) => void;
  onPushTaskToGoogle: (task: TaskItem) => void;
  onAssignProject: (taskId: string, projectId: string) => void;
}

export const GoogleTasksModule: React.FC<GoogleTasksModuleProps> = ({
  tasks,
  projects,
  googleTaskLists,
  selectedTaskListId,
  isGoogleConnected,
  syncingTasks,
  onSelectTaskListId,
  onSyncGoogleTasks,
  onPushTaskToGoogle,
  onAssignProject,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Google Tasks Bi-Directional Sync
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pull tasks from your Google Task Lists, assign them to Projects, or push local tasks to Google Tasks
          </p>
        </div>

        <div className="flex items-center gap-2">
          {googleTaskLists.length > 0 && (
            <select
              value={selectedTaskListId}
              onChange={(e) => {
                onSelectTaskListId(e.target.value);
                onSyncGoogleTasks(e.target.value);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              {googleTaskLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.title}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => onSyncGoogleTasks()}
            disabled={!isGoogleConnected || syncingTasks}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncingTasks ? 'animate-spin' : ''}`} />
            {isGoogleConnected ? 'Sync Google Tasks' : 'Sign in to Google to Sync'}
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {task.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {task.quadrant} · {task.kanbanStatus.replace('_', ' ')} · Due {task.dueDate} ·{' '}
                {task.googleTaskId ? 'Synced with Google Tasks' : 'Local Only'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={task.projectId || ''}
                onChange={(e) => onAssignProject(task.id, e.target.value)}
                aria-label={`Assign project for ${task.title}`}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="">Unassigned Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {isGoogleConnected && !task.googleTaskId && (
                <button
                  type="button"
                  onClick={() => onPushTaskToGoogle(task)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                >
                  <CloudUpload className="h-3.5 w-3.5" />
                  Push to Google Tasks
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
