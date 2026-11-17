import React, { useMemo, useState } from 'react';
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
  X,
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
  onCloseDriveDoc: () => void;
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
  onCloseDriveDoc,
  onAttachDriveFileToTask,
}) => {
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteTags, setNoteTags] = useState('');
  const [noteTint, setNoteTint] = useState<KeepNote['tint']>('default');
  const [checklistDraft, setChecklistDraft] = useState('');

  // Filtri di consultazione note
  const [noteSearch, setNoteSearch] = useState('');
  const [onlyPinned, setOnlyPinned] = useState(false);

  // Modifica inline nota
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editTags, setEditTags] = useState('');

  // Lettore/editor Drive Docs
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
      title: noteTitle.trim() || 'Nota senza titolo',
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
      title: editTitle.trim() || 'Nota senza titolo',
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
          title: item.title || 'Nota Keep Importata',
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
            : ['Keep'],
          updatedAt: new Date().toISOString(),
        }));
        onImportKeepNotes(imported);
      } catch {
        // Ignora JSON non validi
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreateDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    onCreateDriveDoc(newDocTitle.trim(), newDocContent.trim() || 'Creato con Cadence Workspace');
    setNewDocTitle('');
    setNewDocContent('');
  };

  const filteredNotes = useMemo(() => {
    const q = noteSearch.trim().toLowerCase();
    return [...notes]
      .filter((n) => {
        if (onlyPinned && !n.pinned) return false;
        if (!q) return true;
        const hay = `${n.title} ${n.body} ${n.tags.join(' ')} ${n.checklist
          .map((c) => c.text)
          .join(' ')}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [notes, noteSearch, onlyPinned]);

  const currentEditorText = docDraftContent ?? activeDriveDocContent;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Note &amp; Documenti Google Drive (Lettura / Scrittura)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Crea, filtra ed esporta note in stile Keep e leggi o modifica documenti su Google Drive
          </p>
        </div>

        <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer">
          <Upload className="h-3.5 w-3.5" />
          Importa JSON Keep Takeout
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleTakeoutImport}
            className="hidden"
          />
        </label>
      </div>

      {/* Compositore Note + Bacheca filtrabile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleCreateNote}
          className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <StickyNote className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Nuova Nota
            </h3>
          </div>

          <input
            type="text"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Titolo nota"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          />

          <textarea
            rows={3}
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Scrivi un appunto..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          />

          <textarea
            rows={2}
            value={checklistDraft}
            onChange={(e) => setChecklistDraft(e.target.value)}
            placeholder="Voci checklist opzionali (una per riga)"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
          />

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={noteTags}
              onChange={(e) => setNoteTags(e.target.value)}
              placeholder="Tag (separati da virgola)"
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
            />
            <select
              value={noteTint}
              onChange={(e) => setNoteTint(e.target.value as KeepNote['tint'])}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="default">Neutro</option>
              <option value="slate">Ardesia</option>
              <option value="blue">Blu</option>
              <option value="emerald">Salvia</option>
              <option value="amber">Ambra</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Salva Nota
          </button>
        </form>

        <div className="lg:col-span-8 space-y-4">
          {/* Barra filtro note */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-3.5 py-2.5">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                placeholder="Cerca tra titoli, testo, tag o checklist..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setOnlyPinned((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                onlyPinned
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Pin className="h-3.5 w-3.5" /> Solo Fissate
            </button>
            <span className="text-xs text-slate-400 tabular-nums ml-auto">
              {filteredNotes.length} note
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotes.map((note) => {
              const isEditing = editingNoteId === note.id;
              const doneChecklist = note.checklist.filter((c) => c.done).length;
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
                        placeholder="Tag"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs cursor-pointer"
                        >
                          Annulla
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEditedNote(note.id)}
                          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer"
                        >
                          Salva
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                            {note.title}
                          </h4>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditingNote(note)}
                              title="Modifica nota"
                              className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {isGoogleConnected && (
                              <button
                                type="button"
                                onClick={() => onExportNoteToDrive(note)}
                                title="Salva come Google Doc su Drive"
                                className="rounded p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                              >
                                <FilePlus className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onTogglePinNote(note.id)}
                              title={note.pinned ? 'Rimuovi fissaggio' : 'Fissa in alto'}
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
                              aria-label={`Elimina nota ${note.title}`}
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
                            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                              Checklist: {doneChecklist}/{note.checklist.length}
                            </div>
                            {note.checklist.map((line) => (
                              <div
                                key={line.id}
                                className="flex items-start gap-2 text-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => onToggleNoteChecklist(note.id, line.id)}
                                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border cursor-pointer ${
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
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800/70">
                        <span>{note.tags.length > 0 ? note.tags.join(' · ') : 'Generale'}</span>
                        <span>{note.pinned ? 'Fissata' : 'Nota'}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {filteredNotes.length === 0 && (
              <div className="md:col-span-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-10 text-center text-xs text-slate-400">
                Nessuna nota corrisponde ai filtri attuali.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lettore & Editor Documenti Google Drive */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Lettore &amp; Editor Documenti Google Drive
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sfoglia i file Drive, leggi e modifica testi, crea nuovi Google Docs e collegali ai task
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
                placeholder="Cerca file Drive..."
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
              {isGoogleConnected ? 'Carica File Drive' : 'Connetti Google per Drive'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateDocSubmit}
            className="lg:col-span-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] p-4 space-y-3"
          >
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <FilePlus className="h-3.5 w-3.5 text-blue-500" />
              Crea Nuovo Google Doc
            </h4>
            <input
              type="text"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              placeholder="Titolo documento..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />
            <textarea
              rows={4}
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              placeholder="Testo iniziale del documento..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={!isGoogleConnected}
              className="w-full rounded-lg bg-slate-900 dark:bg-slate-100 py-2 text-xs font-medium text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              Crea su Google Drive
            </button>
          </form>

          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Task destinazione per allegato rapido:
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
                  ? 'Clicca "Carica File Drive" per sfogliare, leggere e modificare documenti Google Drive.'
                  : 'Connetti Google per leggere, modificare e allegare documenti da Google Drive.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg px-3">
                {driveFiles.map((file) => (
                  <div
                    key={file.id}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {file.modifiedTime ? `Modificato ${file.modifiedTime.slice(0, 10)}` : file.mimeType}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setDocDraftContent(null);
                          onReadDriveDoc(file);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <FileEdit className="h-3 w-3" /> Leggi / Modifica
                      </button>
                      {attachTargetTaskId && (
                        <button
                          type="button"
                          onClick={() => onAttachDriveFileToTask(attachTargetTaskId, file)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Paperclip className="h-3 w-3" /> Allega
                        </button>
                      )}
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          Apri <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeDriveDoc && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Editor Documento: {activeDriveDoc.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {loadingDocContent
                        ? 'Caricamento testo in corso...'
                        : `${currentEditorText.length} caratteri · Modifica e salva su Drive`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={loadingDocContent}
                      onClick={() =>
                        onSaveDriveDocContent(activeDriveDoc, currentEditorText)
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" /> Salva su Drive
                    </button>
                    <button
                      type="button"
                      onClick={onCloseDriveDoc}
                      aria-label="Chiudi editor documento"
                      className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
