import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Calendar,
  CheckSquare,
  FileText,
  FolderKanban,
  Receipt,
  Search,
  ShoppingBag,
  StickyNote,
  X,
} from 'lucide-react';
import type { DriveFileRecord } from '../services/googleWorkspace';
import type { CurrencyCode, NavSection, WorkspaceData } from '../types/workspace';
import {
  EXPENSE_CATEGORY_LABELS,
  formatMoney,
  formatShortDateIT,
  KANBAN_LABELS,
} from '../utils/formatters';

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
  workspace: WorkspaceData;
  driveFiles: DriveFileRecord[];
  onNavigate: (section: NavSection) => void;
}

interface SearchHit {
  id: string;
  section: NavSection;
  kindLabel: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  open,
  onClose,
  workspace,
  driveFiles,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [activeKind, setActiveKind] = useState<'all' | NavSection>('all');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const currency: CurrencyCode = workspace.preferences.currency || 'EUR';

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveKind('all');
      const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  const results = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    const hits: SearchHit[] = [];

    workspace.tasks.forEach((t) => {
      const proj = workspace.projects.find((p) => p.id === t.projectId);
      const hay = `${t.title} ${t.notes || ''} ${proj?.name || ''} ${t.quadrant}`.toLowerCase();
      if (!q || hay.includes(q)) {
        hits.push({
          id: `t-${t.id}`,
          section: 'projects',
          kindLabel: 'Task',
          title: t.title,
          subtitle: `${proj ? `${proj.name} · ` : ''}${t.quadrant} · ${KANBAN_LABELS[t.kanbanStatus]} · Scad. ${formatShortDateIT(t.dueDate)}`,
          icon: <CheckSquare className="h-4 w-4 text-blue-500" />,
        });
      }
    });

    workspace.projects.forEach((p) => {
      const hay = `${p.name} ${p.description || ''}`.toLowerCase();
      if (!q || hay.includes(q)) {
        hits.push({
          id: `p-${p.id}`,
          section: 'projects',
          kindLabel: 'Progetto',
          title: p.name,
          subtitle: p.description || `Target ${formatShortDateIT(p.targetDate)}`,
          icon: <FolderKanban className="h-4 w-4 text-emerald-500" />,
        });
      }
    });

    workspace.events.forEach((ev) => {
      const hay = `${ev.title} ${ev.location || ''} ${ev.description || ''}`.toLowerCase();
      if (!q || hay.includes(q)) {
        hits.push({
          id: `ev-${ev.id}`,
          section: 'schedule',
          kindLabel: 'Evento',
          title: ev.title,
          subtitle: `${formatShortDateIT(ev.date)} · ${ev.startTime}–${ev.endTime}${ev.location ? ` · ${ev.location}` : ''}`,
          icon: <Calendar className="h-4 w-4 text-blue-500" />,
        });
      }
    });

    workspace.reminders.forEach((rem) => {
      if (!q || rem.title.toLowerCase().includes(q)) {
        hits.push({
          id: `rem-${rem.id}`,
          section: 'schedule',
          kindLabel: 'Promemoria',
          title: rem.title,
          subtitle: `${formatShortDateIT(rem.date)} · ${rem.time}${rem.completed ? ' · Completato' : ''}`,
          icon: <Bell className="h-4 w-4 text-amber-500" />,
        });
      }
    });

    workspace.notes.forEach((n) => {
      const checklistText = n.checklist.map((c) => c.text).join(' ');
      const hay = `${n.title} ${n.body} ${n.tags.join(' ')} ${checklistText}`.toLowerCase();
      if (!q || hay.includes(q)) {
        hits.push({
          id: `nt-${n.id}`,
          section: 'notes',
          kindLabel: 'Nota',
          title: n.title,
          subtitle: n.tags.length > 0 ? `${n.tags.join(', ')} · ${n.body.slice(0, 60)}` : n.body.slice(0, 80),
          icon: <StickyNote className="h-4 w-4 text-amber-500" />,
        });
      }
    });

    workspace.expenses.forEach((exp) => {
      const catLabel = EXPENSE_CATEGORY_LABELS[exp.category] || exp.category;
      const hay = `${exp.description} ${catLabel} ${exp.date}`.toLowerCase();
      if (!q || hay.includes(q)) {
        hits.push({
          id: `exp-${exp.id}`,
          section: 'finance',
          kindLabel: 'Spesa',
          title: `${exp.description} (${formatMoney(exp.amount, currency)})`,
          subtitle: `${catLabel} · ${formatShortDateIT(exp.date)}`,
          icon: <Receipt className="h-4 w-4 text-emerald-500" />,
        });
      }
    });

    workspace.shoppingList.forEach((item) => {
      if (!q || item.name.toLowerCase().includes(q)) {
        hits.push({
          id: `shp-${item.id}`,
          section: 'finance',
          kindLabel: 'Lista Spesa',
          title: item.name,
          subtitle: `${item.quantity} · Stima ${formatMoney(item.estimatedPrice, currency)}${item.checked ? ' · Nel carrello' : ''}`,
          icon: <ShoppingBag className="h-4 w-4 text-slate-500" />,
        });
      }
    });

    driveFiles.forEach((f) => {
      if (!q || f.name.toLowerCase().includes(q)) {
        hits.push({
          id: `drv-${f.id}`,
          section: 'notes',
          kindLabel: 'Google Drive',
          title: f.name,
          subtitle: f.modifiedTime ? `Modificato ${f.modifiedTime.slice(0, 10)}` : f.mimeType,
          icon: <FileText className="h-4 w-4 text-blue-500" />,
        });
      }
    });

    const filtered = activeKind === 'all' ? hits : hits.filter((h) => h.section === activeKind);
    return filtered.slice(0, 30);
  }, [query, activeKind, workspace, driveFiles, currency]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-3 sm:p-6 pt-12 sm:pt-20 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Ricerca globale"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3">
          <Search className="h-4 w-4 text-blue-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && results[0]) {
                onNavigate(results[0].section);
                onClose();
              }
            }}
            placeholder="Cerca task, eventi, spese, note, articoli o file Drive..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi ricerca"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 dark:border-slate-800 px-4 py-2 text-xs">
          {([
            ['all', 'Tutti'],
            ['projects', 'Progetti & Task'],
            ['schedule', 'Agenda'],
            ['notes', 'Note & Drive'],
            ['finance', 'Budget & Spesa'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveKind(id)}
              className={`rounded-md px-2.5 py-1 font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeKind === id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {results.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              Nessun risultato trovato per &ldquo;{query}&rdquo;.
            </p>
          ) : (
            results.map((hit) => (
              <button
                key={hit.id}
                type="button"
                onClick={() => {
                  onNavigate(hit.section);
                  onClose();
                }}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">{hit.icon}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {hit.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {hit.subtitle}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-slate-400 shrink-0">
                  {hit.kindLabel}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
