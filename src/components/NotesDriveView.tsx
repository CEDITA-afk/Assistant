import React, { useState } from 'react';
import {
  Check,
  ExternalLink,
  FileEdit,
  FilePlus,
  FileText,
  FolderOpen,
  Paperclip,
  Pencil,
  Pin,
  Plus,
  RefreshCw,
  Save,
  Search,
  StickyNote,
  Trash2,
  Upload,
} from 'lucide-react';
import type { DriveFileRecord } from '../services/googleWorkspace';
import type { KeepNote, TaskItem } from '../types/workspace';

interface NotesDriveViewProps {
  notes: KeepNote[];
  tasks: TaskItem[];
  driveFiles: DriveFileRecord[];
  activeDriveDoc: DriveFileRecord | null;
  activeDriveDocContent: string;
  loadingDocContent: boolean;
  isGoogleConnected: boolean;
  loadingDrive: boolean;
  onAddNote: (note: Omit<KeepNote, 'id' | 'updatedAt'>) => void;
  onUpdateNote: (id: string, patch: Partial<KeepNote>) => void;
  onTogglePinNote: (id: string) => void;
  onToggleNoteChecklist: (noteId: string, lineId: string) => void;
  onDeleteNote: (id: string) => void;
  onImportKeepNotes: (notes: KeepNote[]) => void;
  onExportNoteToDrive: (note: KeepNote) => void;
  onRefreshDriveFiles: (query?: string) => void;
  onCreateDriveDoc: (title: string, content: string) => void;
  onReadDriveDoc: (file: DriveFileRecord) => void;
  onSaveDriveDocContent: (file: DriveFileRecord, content: string) => void;
  onAttachDriveFileToTask: (taskId: string, file: DriveFileRecord) => void;
}

const TINT_CLASSES: Record<KeepNote['tint'], string> = {
  default: 'bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800',
  slate: 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700',
  blue: 'bg-blue-50/70 dark:bg-blue-950/25 border-blue-200/80 dark:border-blue-900/60',
  emerald: 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-900/60',
  amber: 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-200/80 dark:border-amber-900/60',
};

export const NotesDriveView: React.FC<NotesDriveViewProps> = ({
  notes,
  tasks,
  driveFiles,
  activeDriveDoc,
  activeDriveDocContent,
  loadingDocContent,
  isGoogleConnected,
  loadingDrive,
  onAddNote,
  onUpdateNote,
  onTogglePinNote,
  onToggleNoteChecklist,
  onDeleteNote,
  onImportKeepNotes,
  onExportNoteToDrive,
  onRefreshDriveFiles,
  onCreateDriveDoc,
  onReadDriveDoc,
  onSaveDriveDocContent,
  onAttachDriveFileToTask,
}) => {
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteTags, setNoteTags] = useState('');
  const [noteTint, setNoteTint] = useState<KeepNote['tint']>('default');
  const [checklistDraft, setChecklistDraft] = useState('');

  // Inline note editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editTags, setEditTags] = useState('');

  // Drive docs reader/writer state
  const [driveSearch, setDriveSearch] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [docDraftContent, setDocDraftContent] = useState<string | null>(null);
  const [attachTargetTaskId, setAttachTargetTaskId] = useState<string>(
    tasks[0]?.id || ''
  );

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !noteBody.trim() && !checklistDraft.trim()) return;

    const checklist = checklistDraft
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text, idx) => ({ id: `cl-${Date.now()}-${idx}`, text, done: false }));

    onAddNote({
      title: noteTitle.trim() || 'Untitled Note',
      body: noteBody.trim(),
      checklist,
      pinned: false,
      tint: noteTint,
      tags: noteTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });

    setNoteTitle('');
    setNoteBody('');
    setNoteTags('');
    setChecklistDraft('');
  };

  const startEditingNote = (note: KeepNote) => {
    setEditingNoteId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body);
    setEditTags(note.tags.join(', '));
  };

  const saveEditedNote = (noteId: string) => {
    onUpdateNote(noteId, {
      title: editTitle.trim() || 'Untitled Note',
      body: editBody,
      tags: editTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setEditingNoteId(null);
  };

  const handleTakeoutImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const rawArr = Array.isArray(parsed) ? parsed : [parsed];
        const imported: KeepNote[] = rawArr.map((item, idx) => ({
          id: `imp-${Date.now()}-${idx}`,
          title: item.title || 'Imported Keep Note',
          body: item.textContent || item.body || '',
          checklist: Array.isArray(item.listContent)
            ? item.listContent.map((li: { text?: string; isChecked?: boolean }, i: number) => ({
                id: `cli-${Date.now()}-${i}`,
                text: li.text || '',
                done: Boolean(li.isChecked),
              }))
            : [],
          pinned: Boolean(item.isPinned),
          tint: 'default',
          tags: Array.isArray(item.labels)
            ? item.labels.map((l: { name?: string }) => l.name || '').filter(Boolean)
            : ['Keep Import'],
          updatedAt: new Date().toISOString(),
        }));
        onImportKeepNotes(imported);
      } catch {
        // Invalid JSON ignored
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreateDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    onCreateDriveDoc(newDocTitle.trim(), newDocContent.trim() || 'Created with Cadence Workspace');
    setNewDocTitle('');
    setNewDocContent('');
  };

  const sortedNotes = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const currentEditorText = docDraftContent ?? activeDriveDocContent;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Notes &amp; Google Drive Documents (Read / Write)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create, edit, and export Keep-style notes and read/write collaborative documents on Google Drive
          </p>
        </div>

        <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer">
          <Upload className="h-3.5 w-3.5" />
          Import Keep Takeout JSON
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleTakeoutImport}
            className="hidden"
          />
        </label>
      </div>

      {/* Note Composer + Editable Pinboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleCreateNote}
          className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-3"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <StickyNote className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              New Note
            </h3>
          </div>

          <input
            type="text"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Note title"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          />

          <textarea
            rows={3}
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Write a note..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          />

          <textarea
            rows={2}
            value={checklistDraft}
            onChange={(e) => setChecklistDraft(e.target.value)}
            placeholder="Optional checklist items (one per line)"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
          />

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={noteTags}
              onChange={(e) => setNoteTags(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
            />
            <select
              value={noteTint}
              onChange={(e) => setNoteTint(e.target.value as KeepNote['tint'])}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="default">Neutral</option>
              <option value="slate">Slate</option>
              <option value="blue">Cobalt</option>
              <option value="emerald">Sage</option>
              <option value="amber">Amber</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Save Note
          </button>
        </form>

        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedNotes.map((note) => {
            const isEditing = editingNoteId === note.id;
            return (
              <div
                key={note.id}
                className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${TINT_CLASSES[note.tint]}`}
              >
                {isEditing ? (
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] px-2.5 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-100"
                    />
                    <textarea
                      rows={4}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="Tags"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingNoteId(null)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEditedNote(note.id)}
                        className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {note.title}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditingNote(note)}
                            title="Edit note"
                            className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {isGoogleConnected && (
                            <button
                              type="button"
                              onClick={() => onExportNoteToDrive(note)}
                              title="Save note as Google Drive Doc"
                              className="rounded p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                            >
                              <FilePlus className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onTogglePinNote(note.id)}
                            title={note.pinned ? 'Unpin note' : 'Pin note'}
                            className={`rounded p-1 cursor-pointer ${
                              note.pinned
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                          >
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteNote(note.id)}
                            aria-label={`Delete note ${note.title}`}
                            className="rounded p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {note.body && (
                        <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {note.body}
                        </p>
                      )}

                      {note.checklist.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {note.checklist.map((line) => (
                            <label
                              key={line.id}
                              className="flex items-start gap-2 text-xs cursor-pointer"
                            >
                              <button
                                type="button"
                                onClick={() => onToggleNoteChecklist(note.id, line.id)}
                                className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border cursor-pointer ${
                                  line.done
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {line.done && <Check className="h-2.5 w-2.5" />}
                              </button>
                              <span
                                className={
                                  line.done
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-700 dark:text-slate-300'
                                }
                              >
                                {line.text}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800/70">
                      <span>{note.tags.length > 0 ? note.tags.join(' · ') : 'General'}</span>
                      <span>{note.pinned ? 'Pinned' : 'Note'}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Google Drive Document Reader & Writer */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Google Drive Document Reader &amp; Writer
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Browse Drive documents, read and edit their text directly, create new Docs, and attach files to project tasks
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={driveSearch}
                onChange={(e) => setDriveSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onRefreshDriveFiles(driveSearch);
                }}
                placeholder="Search Drive files..."
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="button"
              onClick={() => onRefreshDriveFiles(driveSearch)}
              disabled={!isGoogleConnected || loadingDrive}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingDrive ? 'animate-spin' : ''}`} />
              {isGoogleConnected ? 'Load Drive Files' : 'Connect Google for Drive'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create collaborative doc */}
          <form
            onSubmit={handleCreateDocSubmit}
            className="lg:col-span-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] p-4 space-y-3"
          >
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <FilePlus className="h-3.5 w-3.5 text-blue-500" />
              Create New Google Doc
            </h4>
            <input
              type="text"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              placeholder="Document title..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />
            <textarea
              rows={4}
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              placeholder="Initial document body..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={!isGoogleConnected}
              className="w-full rounded-lg bg-slate-900 dark:bg-slate-100 py-2 text-xs font-medium text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              Create in Google Drive
            </button>
          </form>

          {/* Drive file list + Inline Document Reader/Writer */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Target task for quick attachment:
              </span>
              <select
                value={attachTargetTaskId}
                onChange={(e) => setAttachTargetTaskId(e.target.value)}
                className="max-w-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.quadrant}] {t.title}
                  </option>
                ))}
              </select>
            </div>

            {driveFiles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                {isGoogleConnected
                  ? 'Click "Load Drive Files" to browse, read, and edit documents in Google Drive.'
                  : 'Connect Google to read, edit, and attach documents from Google Drive.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg px-3">
                {driveFiles.map((file) => (
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
                          {file.modifiedTime ? `Modified ${file.modifiedTime.slice(0, 10)}` : file.mimeType}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setDocDraftContent(null);
                          onReadDriveDoc(file);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <FileEdit className="h-3 w-3" /> Read / Edit
                      </button>
                      {attachTargetTaskId && (
                        <button
                          type="button"
                          onClick={() => onAttachDriveFileToTask(attachTargetTaskId, file)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Paperclip className="h-3 w-3" /> Attach
                        </button>
                      )}
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeDriveDoc && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Document Editor: {activeDriveDoc.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {loadingDocContent
                        ? 'Loading document text...'
                        : 'Edit text below and save changes back to Google Drive'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={loadingDocContent}
                    onClick={() =>
                      onSaveDriveDocContent(activeDriveDoc, currentEditorText)
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" /> Save to Drive
                  </button>
                </div>

                <textarea
                  rows={8}
                  value={currentEditorText}
                  onChange={(e) => setDocDraftContent(e.target.value)}
                  disabled={loadingDocContent}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-3 font-mono text-xs leading-relaxed text-slate-900 dark:text-slate-100"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
