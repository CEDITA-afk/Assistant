import React from 'react';
import {
  Check,
  CloudUpload,
  ExternalLink,
  FileText,
  GripVertical,
  Paperclip,
  Pencil,
  Trash2,
} from 'lucide-react';
import type {
  EisenhowerQuadrant,
  KanbanColumn,
  Project,
  TaskItem,
} from '../../types/workspace';

interface TaskCardProps {
  task: TaskItem;
  project?: Project;
  isGoogleConnected: boolean;
  onDragStart: () => void;
  onToggleDone: () => void;
  onEdit: () => void;
  onOpenAttach: () => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onPushToGoogle: () => void;
  onDelete: () => void;
  onMoveQuadrant?: (q: EisenhowerQuadrant) => void;
  onMoveKanban?: (c: KanbanColumn) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  project,
  isGoogleConnected,
  onDragStart,
  onToggleDone,
  onEdit,
  onOpenAttach,
  onRemoveAttachment,
  onPushToGoogle,
  onDelete,
  onMoveQuadrant,
  onMoveKanban,
}) => {
  const isDone = task.kanbanStatus === 'done';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] p-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <GripVertical className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <button
            type="button"
            onClick={onToggleDone}
            aria-label={`Toggle completion for ${task.title}`}
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border cursor-pointer ${
              isDone
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-slate-300 dark:border-slate-600'
            }`}
          >
            {isDone && <Check className="h-3 w-3" />}
          </button>
          <div className="min-w-0">
            <p
              className={`text-sm font-medium leading-snug ${
                isDone
                  ? 'line-through text-slate-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {task.title}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              {project ? `${project.name} · ` : ''}
              <span
                className={
                  task.priority === 'critical'
                    ? 'text-red-600 dark:text-red-400 font-medium'
                    : task.priority === 'high'
                    ? 'text-amber-600 dark:text-amber-400 font-medium'
                    : ''
                }
              >
                {task.priority}
              </span>{' '}
              · Due {task.dueDate} · {task.progress}%
            </p>
            {task.notes && (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                {task.notes}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            title="Edit task"
            className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onOpenAttach}
            title="Attach Drive file"
            className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          {isGoogleConnected && !task.googleTaskId && (
            <button
              type="button"
              onClick={onPushToGoogle}
              title="Sync to Google Tasks"
              className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
            >
              <CloudUpload className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            title="Delete task"
            className="rounded p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {task.attachments.length > 0 && (
        <div className="mt-2 pl-6 space-y-1">
          {task.attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300"
            >
              <span className="inline-flex items-center gap-1 truncate">
                <FileText className="h-3 w-3 text-blue-500 shrink-0" />
                {att.webViewLink ? (
                  <a
                    href={att.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline inline-flex items-center gap-1 truncate"
                  >
                    {att.name}
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                  </a>
                ) : (
                  <span className="truncate">{att.name}</span>
                )}
                {att.autoMatched && (
                  <span className="text-slate-400">· auto-linked</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(att.id)}
                className="text-slate-400 hover:text-red-500 cursor-pointer"
                aria-label={`Remove attachment ${att.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {(onMoveQuadrant || onMoveKanban) && (
        <div className="mt-2 pl-6 flex items-center gap-2">
          {onMoveQuadrant && (
            <select
              value={task.quadrant}
              onChange={(e) => onMoveQuadrant(e.target.value as EisenhowerQuadrant)}
              aria-label="Move quadrant"
              className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-2 py-0.5 text-[11px] text-slate-600 dark:text-slate-300"
            >
              <option value="Q1">Move to Q1</option>
              <option value="Q2">Move to Q2</option>
              <option value="Q3">Move to Q3</option>
              <option value="Q4">Move to Q4</option>
            </select>
          )}
          {onMoveKanban && (
            <select
              value={task.kanbanStatus}
              onChange={(e) => onMoveKanban(e.target.value as KanbanColumn)}
              aria-label="Move kanban column"
              className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-2 py-0.5 text-[11px] text-slate-600 dark:text-slate-300"
            >
              <option value="backlog">Backlog</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          )}
        </div>
      )}
    </div>
  );
};
