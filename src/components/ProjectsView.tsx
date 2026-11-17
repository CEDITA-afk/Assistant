import React, { useMemo, useState } from 'react';
import {
  FileText,
  FolderKanban,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { DriveFileRecord, GoogleTaskList } from '../services/googleWorkspace';
import type {
  DriveAttachment,
  EisenhowerQuadrant,
  KanbanColumn,
  Project,
  TaskItem,
  TaskPriority,
} from '../types/workspace';
import { getTodayISO } from '../utils/storage';
import { EisenhowerModule } from './projects/EisenhowerModule';
import { GanttModule } from './projects/GanttModule';
import { GoogleTasksModule } from './projects/GoogleTasksModule';
import { KanbanModule } from './projects/KanbanModule';

type ProjectTab = 'eisenhower' | 'kanban' | 'gantt' | 'google_tasks';

interface ProjectsViewProps {
  projects: Project[];
  tasks: TaskItem[];
  driveFiles: DriveFileRecord[];
  googleTaskLists: GoogleTaskList[];
  selectedTaskListId: string;
  isGoogleConnected: boolean;
  syncingTasks: boolean;
  onAddProject: (project: Omit<Project, 'id'>) => void;
  onDeleteProject: (projectId: string) => void;
  onAddTask: (task: Omit<TaskItem, 'id' | 'updatedAt'>) => void;
  onUpdateTask: (taskId: string, patch: Partial<TaskItem>) => void;
  onDeleteTask: (task: TaskItem) => void;
  onAutoMatchDriveFiles: () => void;
  onSyncGoogleTasks: (listId?: string) => void;
  onPushTaskToGoogle: (task: TaskItem) => void;
  onSelectTaskListId: (id: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  tasks,
  driveFiles,
  googleTaskLists,
  selectedTaskListId,
  isGoogleConnected,
  syncingTasks,
  onAddProject,
  onDeleteProject,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAutoMatchDriveFiles,
  onSyncGoogleTasks,
  onPushTaskToGoogle,
  onSelectTaskListId,
}) => {
  const today = getTodayISO();
  const [tab, setTab] = useState<ProjectTab>('kanban');
  const [activeProjectId, setActiveProjectId] = useState<string>('ALL');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectTarget, setNewProjectTarget] = useState(today);

  const [attachModalTaskId, setAttachModalTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Add Task Form
  const [title, setTitle] = useState('');
  const [quadrant, setQuadrant] = useState<EisenhowerQuadrant>('Q1');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [startDate, setStartDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);

  const filteredTasks = useMemo(() => {
    if (activeProjectId === 'ALL') return tasks;
    return tasks.filter((t) => t.projectId === activeProjectId);
  }, [tasks, activeProjectId]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onAddProject({
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || undefined,
      color: 'blue',
      targetDate: newProjectTarget,
    });
    setNewProjectName('');
    setNewProjectDesc('');
    setShowNewProject(false);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask({
      projectId: activeProjectId === 'ALL' ? projects[0]?.id : activeProjectId,
      title: title.trim(),
      quadrant,
      kanbanStatus: 'backlog',
      priority,
      startDate,
      dueDate: dueDate < startDate ? startDate : dueDate,
      progress: 0,
      pomodoroSessions: 0,
      attachments: [],
    });
    setTitle('');
  };

  const attachModalTask = tasks.find((t) => t.id === attachModalTaskId) || null;

  const handleAttachDriveFile = (task: TaskItem, file: DriveFileRecord) => {
    if (task.attachments.some((a) => a.id === file.id)) return;
    const nextAttachment: DriveAttachment = {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink,
      modifiedTime: file.modifiedTime,
      autoMatched: false,
      source: 'drive',
    };
    onUpdateTask(task.id, {
      attachments: [...task.attachments, nextAttachment],
    });
  };

  const handleRemoveAttachment = (task: TaskItem, attachmentId: string) => {
    onUpdateTask(task.id, {
      attachments: task.attachments.filter((a) => a.id !== attachmentId),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Projects: Kanban, Gantt &amp; Eisenhower Tasks
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage projects across Kanban, Gantt, Eisenhower Matrix, and Google Tasks with Drive attachments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-1">
            {([
              ['kanban', 'Kanban'],
              ['eisenhower', 'Eisenhower'],
              ['gantt', 'Gantt'],
              ['google_tasks', 'Google Tasks'],
            ] as Array<[ProjectTab, string]>).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  tab === id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onAutoMatchDriveFiles}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Auto-Attach Drive Files
          </button>
        </div>
      </div>

      {/* Project Selector Strip */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 mr-2">
              <FolderKanban className="h-3.5 w-3.5 text-blue-500" />
              Projects:
            </span>
            <button
              type="button"
              onClick={() => setActiveProjectId('ALL')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                activeProjectId === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-[#0B0F17] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              All Projects ({tasks.length})
            </button>
            {projects.map((proj) => {
              const count = tasks.filter((t) => t.projectId === proj.id).length;
              const isSelected = activeProjectId === proj.id;
              return (
                <div key={proj.id} className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveProjectId(proj.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-[#0B0F17] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {proj.name} ({count})
                  </button>
                  {isSelected && projects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteProject(proj.id);
                        setActiveProjectId('ALL');
                      }}
                      title={`Delete project ${proj.name}`}
                      className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowNewProject((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> New Project
          </button>
        </div>

        {showNewProject && (
          <form
            onSubmit={handleCreateProject}
            className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2.5"
          >
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name (e.g., Mobile App Launch)"
              className="sm:col-span-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
            />
            <input
              type="text"
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              placeholder="Brief goal or description"
              className="sm:col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
            />
            <input
              type="date"
              value={newProjectTarget}
              onChange={(e) => setNewProjectTarget(e.target.value)}
              className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="sm:col-span-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer"
            >
              Save
            </button>
          </form>
        )}
      </div>

      {/* Add Task Bar */}
      <form
        onSubmit={handleCreateTask}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 flex flex-col lg:flex-row items-stretch lg:items-center gap-3"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add task to selected project..."
          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={quadrant}
            onChange={(e) => setQuadrant(e.target.value as EisenhowerQuadrant)}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100"
          >
            <option value="Q1">Q1 · Do First</option>
            <option value="Q2">Q2 · Schedule</option>
            <option value="Q3">Q3 · Delegate</option>
            <option value="Q4">Q4 · Eliminate</option>
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label="Start date"
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-2 font-mono text-xs text-slate-900 dark:text-slate-100"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="Due date"
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-2 font-mono text-xs text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add Task
          </button>
        </div>
      </form>

      {/* ACTIVE MODULE */}
      {tab === 'kanban' && (
        <KanbanModule
          tasks={filteredTasks}
          projects={projects}
          activeProjectId={activeProjectId}
          isGoogleConnected={isGoogleConnected}
          onQuickAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onEditTask={setEditingTask}
          onOpenAttach={setAttachModalTaskId}
          onRemoveAttachment={handleRemoveAttachment}
          onPushToGoogle={onPushTaskToGoogle}
        />
      )}

      {tab === 'eisenhower' && (
        <EisenhowerModule
          tasks={filteredTasks}
          projects={projects}
          activeProjectId={activeProjectId}
          isGoogleConnected={isGoogleConnected}
          onQuickAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onEditTask={setEditingTask}
          onOpenAttach={setAttachModalTaskId}
          onRemoveAttachment={handleRemoveAttachment}
          onPushToGoogle={onPushTaskToGoogle}
        />
      )}

      {tab === 'gantt' && (
        <GanttModule
          tasks={filteredTasks}
          projects={projects}
          onUpdateTask={onUpdateTask}
          onEditTask={setEditingTask}
        />
      )}

      {tab === 'google_tasks' && (
        <GoogleTasksModule
          tasks={filteredTasks}
          projects={projects}
          googleTaskLists={googleTaskLists}
          selectedTaskListId={selectedTaskListId}
          isGoogleConnected={isGoogleConnected}
          syncingTasks={syncingTasks}
          onSelectTaskListId={onSelectTaskListId}
          onSyncGoogleTasks={onSyncGoogleTasks}
          onPushTaskToGoogle={onPushTaskToGoogle}
          onAssignProject={(taskId, projectId) =>
            onUpdateTask(taskId, { projectId: projectId || undefined })
          }
        />
      )}

      {/* TASK EDITOR MODAL */}
      {editingTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Edit Project Task
              </h3>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                Title
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, title: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="block text-xs text-slate-500 dark:text-slate-400">
                Notes
                <textarea
                  rows={3}
                  value={editingTask.notes || ''}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, notes: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  Project
                  <select
                    value={editingTask.projectId || ''}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        projectId: e.target.value || undefined,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Unassigned</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  Priority
                  <select
                    value={editingTask.priority}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        priority: e.target.value as TaskPriority,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>

                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  Eisenhower Quadrant
                  <select
                    value={editingTask.quadrant}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        quadrant: e.target.value as EisenhowerQuadrant,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="Q1">Q1 · Do First</option>
                    <option value="Q2">Q2 · Schedule</option>
                    <option value="Q3">Q3 · Delegate</option>
                    <option value="Q4">Q4 · Eliminate</option>
                  </select>
                </label>

                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  Kanban Column
                  <select
                    value={editingTask.kanbanStatus}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        kanbanStatus: e.target.value as KanbanColumn,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </label>

                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  Start Date
                  <input
                    type="date"
                    value={editingTask.startDate}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, startDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-2 font-mono text-xs text-slate-900 dark:text-slate-100"
                  />
                </label>

                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  Due Date
                  <input
                    type="date"
                    value={editingTask.dueDate}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, dueDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-2 font-mono text-xs text-slate-900 dark:text-slate-100"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateTask(editingTask.id, editingTask);
                  setEditingTask(null);
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRIVE ATTACHMENT PICKER MODAL */}
      {attachModalTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Attach Drive File to Task
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
                  {attachModalTask.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAttachModalTaskId(null)}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="mt-4 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {driveFiles.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  {isGoogleConnected
                    ? 'No Drive files loaded yet. Open Notes & Drive to refresh your Drive index.'
                    : 'Connect your Google account in Sync & Encryption to browse and attach real Google Drive files.'}
                </p>
              ) : (
                driveFiles.map((file) => {
                  const alreadyAttached = attachModalTask.attachments.some(
                    (a) => a.id === file.id
                  );
                  return (
                    <div
                      key={file.id}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                            {file.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {file.mimeType}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyAttached}
                        onClick={() => handleAttachDriveFile(attachModalTask, file)}
                        className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                      >
                        {alreadyAttached ? 'Attached' : 'Attach'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
