import React, { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Activity,
  Calendar,
  CheckSquare,
  LayoutDashboard,
  Lock,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  StickyNote,
  Sun,
  Timer,
  Wallet,
  X,
} from 'lucide-react';
import { ConfirmationModal } from './components/ConfirmationModal';
import { FinanceShoppingView } from './components/FinanceShoppingView';
import { FitnessHealthView } from './components/FitnessHealthView';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { NotesDriveView } from './components/NotesDriveView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OverviewDashboard } from './components/OverviewDashboard';
import type { PomodoroMode } from './components/PomodoroTimer';
import { ProjectsView } from './components/ProjectsView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ScheduleView } from './components/ScheduleView';
import { SyncSettingsModal } from './components/SyncSettingsModal';
import { VoiceAssistantBar } from './components/VoiceAssistantBar';
import {
  getWorkspaceAccessToken,
  initGoogleAuth,
  signInWithGoogleWorkspace,
  signOutGoogleWorkspace,
} from './services/googleAuth';
import {
  createCollaborativeDriveDoc,
  createFinanceSpreadsheet,
  createGoogleCalendarEvent,
  createGoogleTask,
  deleteGoogleCalendarEvent,
  downloadEncryptedVaultFromDrive,
  fetchGoogleCalendarEvents,
  fetchGoogleTaskLists,
  fetchGoogleTasks,
  getSpreadsheetMetadata,
  listDriveFiles,
  listGoogleSpreadsheets,
  matchDriveFilesToTask,
  readDriveDocumentContent,
  readSheetRange,
  syncFinanceDataToGoogleSheet,
  updateDriveDocumentContent,
  updateGoogleTaskStatus,
  uploadEncryptedVaultToDrive,
  writeSheetRange,
  type DriveFileRecord,
  type GoogleTaskList,
} from './services/googleWorkspace';
import type {
  CalendarEvent,
  ExpenseItem,
  KeepNote,
  MonthlyBudget,
  NavSection,
  PendingConfirmation,
  Project,
  ReminderItem,
  ShoppingItem,
  TaskItem,
  VoiceLanguage,
  WorkoutEntry,
  WorkspaceData,
} from './types/workspace';
import {
  formatMoney,
  formatShortDateIT,
  WORKOUT_LABELS,
} from './utils/formatters';
import { subscribeHapticPulse, triggerHaptic } from './utils/haptics';
import {
  createSeedWorkspaceData,
  getTodayISO,
  loadWorkspaceData,
  saveWorkspaceData,
} from './utils/storage';
import { parseVoiceCommand } from './utils/voiceParser';

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}> = [
  { id: 'overview', label: 'Panoramica', shortLabel: 'Oggi', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'schedule', label: 'Agenda & Voce', shortLabel: 'Agenda', icon: <Calendar className="h-4 w-4" /> },
  { id: 'projects', label: 'Progetti & Task', shortLabel: 'Progetti', icon: <CheckSquare className="h-4 w-4" /> },
  { id: 'finance', label: 'Budget & Spesa', shortLabel: 'Budget', icon: <Wallet className="h-4 w-4" /> },
  { id: 'notes', label: 'Note & Drive', shortLabel: 'Note', icon: <StickyNote className="h-4 w-4" /> },
  { id: 'fitness', label: 'Salute & Fitness', shortLabel: 'Salute', icon: <Activity className="h-4 w-4" /> },
];

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [section, setSection] = useState<NavSection>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Stato Auth & Google Workspace API
  const [user, setUser] = useState<User | null>(null);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const [driveFiles, setDriveFiles] = useState<DriveFileRecord[]>([]);
  const [spreadsheets, setSpreadsheets] = useState<DriveFileRecord[]>([]);
  const [sheetTabs, setSheetTabs] = useState<string[]>([]);
  const [activeSheetTab, setActiveSheetTab] = useState('');
  const [sheetGrid, setSheetGrid] = useState<string[][]>([]);
  const [loadingSheetGrid, setLoadingSheetGrid] = useState(false);

  const [activeDriveDoc, setActiveDriveDoc] = useState<DriveFileRecord | null>(null);
  const [activeDriveDocContent, setActiveDriveDocContent] = useState('');
  const [loadingDocContent, setLoadingDocContent] = useState(false);

  const [googleTaskLists, setGoogleTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState('@default');

  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [syncingTasks, setSyncingTasks] = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [loadingDrive, setLoadingDrive] = useState(false);

  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);

  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [hapticBanner, setHapticBanner] = useState<string | null>(null);
  const [apiNotice, setApiNotice] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  // Stato Pomodoro persistente tra le schede
  const [pomMode, setPomMode] = useState<PomodoroMode>('focus');
  const [pomSecondsLeft, setPomSecondsLeft] = useState(25 * 60);
  const [pomRunning, setPomRunning] = useState(false);
  const [pomTaskId, setPomTaskId] = useState('');
  const [pomCompletedCount, setPomCompletedCount] = useState(0);

  // Caricamento iniziale local-first
  useEffect(() => {
    loadWorkspaceData().then((loaded) => {
      setWorkspace(loaded);
      setPomSecondsLeft((loaded.preferences.pomodoroFocusMin || 25) * 60);
    });
  }, []);

  // Salvataggio automatico su localStorage + sincronizzazione tema dark/light
  useEffect(() => {
    if (!workspace) return;
    saveWorkspaceData(workspace);
    document.documentElement.classList.toggle(
      'dark',
      workspace.preferences.theme === 'dark'
    );
  }, [workspace]);

  // Scorciatoia Ctrl+K / Cmd+K per Ricerca Globale
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Listener Firebase Auth (token mantenuto solo in memoria)
  useEffect(() => {
    return initGoogleAuth((authUser, tokenReady) => {
      setUser(authUser);
      setHasGoogleToken(tokenReady);
    });
  }, []);

  // Indicatore visivo aptico
  useEffect(() => {
    let timeout: number | undefined;
    const unsub = subscribeHapticPulse((label) => {
      setHapticBanner(label);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setHapticBanner(null), 2200);
    });
    return () => {
      unsub();
      window.clearTimeout(timeout);
    };
  }, []);

  const fireHaptic = useCallback(
    (
      pattern: Parameters<typeof triggerHaptic>[0],
      label?: string
    ) => {
      triggerHaptic(pattern, {
        hapticsEnabled: workspace?.preferences.hapticsEnabled ?? true,
        soundEnabled: workspace?.preferences.soundEnabled ?? true,
        label,
      });
    },
    [workspace?.preferences.hapticsEnabled, workspace?.preferences.soundEnabled]
  );

  const showNotice = useCallback((kind: 'ok' | 'err', msg: string) => {
    setApiNotice({ kind, msg });
    window.setTimeout(() => setApiNotice(null), 4500);
  }, []);

  const getModeDurationSeconds = useCallback(
    (targetMode: PomodoroMode, prefs?: WorkspaceData['preferences']) => {
      const p = prefs || workspace?.preferences;
      if (targetMode === 'focus') return (p?.pomodoroFocusMin ?? 25) * 60;
      if (targetMode === 'short_break') return (p?.pomodoroShortBreakMin ?? 5) * 60;
      return (p?.pomodoroLongBreakMin ?? 15) * 60;
    },
    [workspace?.preferences]
  );

  const completePomodoroPhase = useCallback(() => {
    if (!workspace) return;
    const mins =
      pomMode === 'focus'
        ? workspace.preferences.pomodoroFocusMin
        : pomMode === 'short_break'
        ? workspace.preferences.pomodoroShortBreakMin
        : workspace.preferences.pomodoroLongBreakMin;

    const linkedTask = workspace.tasks.find((t) => t.id === pomTaskId);
    setWorkspace((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pomodoroLogs: [
          {
            id: `pom-${Date.now()}`,
            taskId: pomTaskId || undefined,
            taskTitle: linkedTask?.title,
            minutes: mins,
            mode: pomMode,
            completedAt: new Date().toISOString(),
          },
          ...prev.pomodoroLogs,
        ],
        tasks:
          pomMode === 'focus' && pomTaskId
            ? prev.tasks.map((t) =>
                t.id === pomTaskId
                  ? { ...t, pomodoroSessions: t.pomodoroSessions + 1 }
                  : t
              )
            : prev.tasks,
      };
    });

    fireHaptic(
      'pomodoroComplete',
      pomMode === 'focus'
        ? `Sessione focus completata (${mins} min)`
        : 'Pausa terminata — pronto per il focus'
    );

    setPomRunning(false);
    if (pomMode === 'focus') {
      const nextCount = pomCompletedCount + 1;
      setPomCompletedCount(nextCount);
      const nextMode: PomodoroMode =
        nextCount % 4 === 0 ? 'long_break' : 'short_break';
      setPomMode(nextMode);
      setPomSecondsLeft(getModeDurationSeconds(nextMode));
    } else {
      setPomMode('focus');
      setPomSecondsLeft(getModeDurationSeconds('focus'));
    }
  }, [
    workspace,
    pomMode,
    pomTaskId,
    pomCompletedCount,
    fireHaptic,
    getModeDurationSeconds,
  ]);

  // Tick timer Pomodoro persistente in background tra tutte le viste
  useEffect(() => {
    if (!pomRunning) return;
    const timer = window.setInterval(() => {
      setPomSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pomRunning]);

  useEffect(() => {
    if (pomRunning && pomSecondsLeft === 0) {
      completePomodoroPhase();
    }
  }, [pomRunning, pomSecondsLeft, completePomodoroPhase]);

  // Auth handlers
  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      const result = await signInWithGoogleWorkspace();
      setUser(result.user);
      setHasGoogleToken(true);
      showNotice(
        'ok',
        `Google Workspace connesso come ${result.user.email || result.user.displayName}`
      );
      listDriveFiles(result.accessToken)
        .then(setDriveFiles)
        .catch(() => {});
      fetchGoogleTaskLists(result.accessToken)
        .then((lists) => {
          setGoogleTaskLists(lists);
          if (lists[0]?.id) setSelectedTaskListId(lists[0].id);
        })
        .catch(() => {});
    } catch (err) {
      showNotice(
        'err',
        err instanceof Error
          ? err.message
          : 'Accesso Google non riuscito o annullato.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogleWorkspace();
    setUser(null);
    setHasGoogleToken(false);
    setDriveFiles([]);
    showNotice('ok', 'Account Google disconnesso. Modalità Solo Locale attiva.');
  };

  // Helper per aggiornare il log salute di oggi
  const mutateTodayHealth = useCallback(
    (
      updater: (
        current: WorkspaceData['healthLogs'][number]
      ) => WorkspaceData['healthLogs'][number]
    ) => {
      const today = getTodayISO();
      setWorkspace((prev) => {
        if (!prev) return prev;
        const exists = prev.healthLogs.some((h) => h.date === today);
        const nextLogs = exists
          ? prev.healthLogs.map((h) => (h.date === today ? updater(h) : h))
          : [
              ...prev.healthLogs,
              updater({
                date: today,
                steps: 0,
                stepGoal: 10000,
                kcalBurned: 0,
                kcalGoal: 600,
                waterMl: 0,
                waterGoalMl: 2500,
                workouts: [],
              }),
            ];
        return { ...prev, healthLogs: nextLogs };
      });
    },
    []
  );

  // ---------------- ESECUZIONE COMANDI VOCALI ----------------
  const handleVoiceCommand = useCallback(
    (transcript: string) => {
      if (!workspace) return;
      const intent = parseVoiceCommand(transcript);
      const currency = workspace.preferences.currency || 'EUR';
      fireHaptic('voiceCapture');

      switch (intent.type) {
        case 'event': {
          const newEv: CalendarEvent = {
            id: `ev-${Date.now()}`,
            title: intent.title,
            date: intent.date,
            startTime: intent.startTime,
            endTime: intent.endTime,
            category: intent.category,
            reminderMinutes: 15,
          };
          setWorkspace((prev) =>
            prev ? { ...prev, events: [...prev.events, newEv] } : prev
          );
          setVoiceFeedback(
            `Evento segnato: "${intent.title}" il ${formatShortDateIT(intent.date)} alle ${intent.startTime}`
          );
          fireHaptic('taskComplete', `Evento: ${intent.title}`);
          break;
        }
        case 'reminder': {
          const newRem: ReminderItem = {
            id: `rem-${Date.now()}`,
            title: intent.title,
            date: intent.date,
            time: intent.time,
            completed: false,
            repeat: 'none',
          };
          setWorkspace((prev) =>
            prev ? { ...prev, reminders: [newRem, ...prev.reminders] } : prev
          );
          setVoiceFeedback(
            `Promemoria impostato: "${intent.title}" alle ${intent.time}`
          );
          fireHaptic('taskComplete', 'Promemoria aggiunto');
          break;
        }
        case 'task': {
          const newTask: TaskItem = {
            id: `tsk-${Date.now()}`,
            title: intent.title,
            quadrant: intent.quadrant,
            kanbanStatus: 'backlog',
            priority: intent.priority,
            startDate: getTodayISO(),
            dueDate: intent.dueDate,
            progress: 0,
            pomodoroSessions: 0,
            attachments: [],
            updatedAt: new Date().toISOString(),
          };
          setWorkspace((prev) =>
            prev ? { ...prev, tasks: [newTask, ...prev.tasks] } : prev
          );
          setVoiceFeedback(
            `Task aggiunto in ${intent.quadrant}: "${intent.title}"`
          );
          fireHaptic('taskComplete', `Task aggiunto (${intent.quadrant})`);
          break;
        }
        case 'expense': {
          const newExp: ExpenseItem = {
            id: `exp-${Date.now()}`,
            description: intent.description,
            amount: intent.amount,
            category: intent.category,
            date: intent.date,
          };
          setWorkspace((prev) =>
            prev ? { ...prev, expenses: [newExp, ...prev.expenses] } : prev
          );
          const amtText = formatMoney(intent.amount, currency);
          setVoiceFeedback(`Spesa registrata: ${amtText} (${intent.description})`);
          fireHaptic('taskComplete', `Spesa ${amtText}`);
          break;
        }
        case 'shopping': {
          const newItems: ShoppingItem[] = intent.items.map((name, i) => ({
            id: `shp-${Date.now()}-${i}`,
            name,
            category: 'Other',
            quantity: '1',
            estimatedPrice: 0,
            checked: false,
          }));
          setWorkspace((prev) =>
            prev
              ? { ...prev, shoppingList: [...newItems, ...prev.shoppingList] }
              : prev
          );
          setVoiceFeedback(
            `Aggiunto alla spesa: ${intent.items.join(', ')}`
          );
          fireHaptic('taskComplete', 'Aggiunto alla lista spesa');
          break;
        }
        case 'water': {
          mutateTodayHealth((h) => ({ ...h, waterMl: h.waterMl + intent.ml }));
          setVoiceFeedback(`Idratazione registrata: +${intent.ml} ml acqua`);
          fireHaptic('waterLog', `+${intent.ml}ml acqua`);
          break;
        }
        case 'steps': {
          mutateTodayHealth((h) => ({
            ...h,
            steps: h.steps + intent.steps,
            kcalBurned: h.kcalBurned + Math.round(intent.steps * 0.04),
          }));
          setVoiceFeedback(`Aggiunti ${intent.steps.toLocaleString('it-IT')} passi`);
          fireHaptic('waterLog', `+${intent.steps.toLocaleString('it-IT')} passi`);
          break;
        }
        case 'pomodoro': {
          const fallbackMin =
            intent.mode === 'focus'
              ? workspace.preferences.pomodoroFocusMin
              : intent.mode === 'short_break'
              ? workspace.preferences.pomodoroShortBreakMin
              : workspace.preferences.pomodoroLongBreakMin;
          const mins = intent.minutes ?? fallbackMin;
          setPomMode(intent.mode);
          setPomSecondsLeft(mins * 60);
          setPomRunning(true);
          setSection('overview');
          const modeLabel =
            intent.mode === 'focus'
              ? 'Focus'
              : intent.mode === 'short_break'
              ? 'Pausa breve'
              : 'Pausa lunga';
          setVoiceFeedback(`Avviato timer ${modeLabel} (${mins} min)`);
          fireHaptic('pomodoroComplete', 'Timer Focus avviato');
          break;
        }
        case 'note': {
          const newNote: KeepNote = {
            id: `nt-${Date.now()}`,
            title: intent.title,
            body: intent.body,
            checklist: [],
            pinned: false,
            tint: 'default',
            tags: ['Voce'],
            updatedAt: new Date().toISOString(),
          };
          setWorkspace((prev) =>
            prev ? { ...prev, notes: [newNote, ...prev.notes] } : prev
          );
          setVoiceFeedback(`Nota salvata: "${intent.title}"`);
          fireHaptic('taskComplete', 'Nota salvata');
          break;
        }
        default: {
          setVoiceFeedback(
            'Prova con "Segna dentista domani alle 15", "Ricordami...", "Aggiungi task...", "Spesa 18 euro..." o "Bevi 500ml acqua".'
          );
        }
      }
    },
    [workspace, fireHaptic, mutateTodayHealth]
  );

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0F17] text-slate-600 dark:text-slate-300 text-sm">
        Caricamento workspace Cadence...
      </div>
    );
  }

  const currency = workspace.preferences.currency || 'EUR';
  const voiceLang: VoiceLanguage = workspace.preferences.voiceLang || 'it-IT';

  const pomDefaultSec = getModeDurationSeconds(pomMode);
  const showHeaderPomPill = pomRunning || pomSecondsLeft !== pomDefaultSec;
  const headerPomMins = String(Math.floor(pomSecondsLeft / 60)).padStart(2, '0');
  const headerPomSecs = String(pomSecondsLeft % 60).padStart(2, '0');

  const openTasksCount = workspace.tasks.filter((t) => t.kanbanStatus !== 'done').length;
  const pendingShopCount = workspace.shoppingList.filter((s) => !s.checked).length;

  // ---------------- SYNC HANDLER GOOGLE WORKSPACE (CON CONFERMA) ----------------

  const handlePullGoogleCalendar = async () => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Accedi con Google per importare gli eventi di Google Calendar.');
      return;
    }
    setSyncingCalendar(true);
    try {
      const gEvents = await fetchGoogleCalendarEvents(token);
      setWorkspace((prev) => {
        if (!prev) return prev;
        const localOnly = prev.events.filter((e) => !e.googleEventId);
        return { ...prev, events: [...localOnly, ...gEvents] };
      });
      showNotice('ok', `Sincronizzati ${gEvents.length} eventi da Google Calendar.`);
    } catch (err) {
      showNotice(
        'err',
        err instanceof Error ? err.message : 'Sincronizzazione Calendar non riuscita.'
      );
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handlePushEventToGoogle = (ev: CalendarEvent) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Accedi con Google per inviare eventi su Google Calendar.');
      return;
    }
    setPendingConfirmation({
      title: 'Aggiungere evento su Google Calendar?',
      description: `Verrà creato "${ev.title}" il ${formatShortDateIT(ev.date)} (${ev.startTime}–${ev.endTime}) sul tuo Google Calendar principale.`,
      affectedItems: [`${ev.title} (${formatShortDateIT(ev.date)} ${ev.startTime})`],
      confirmLabel: 'Crea su Google Calendar',
      onConfirm: async () => {
        const googleEventId = await createGoogleCalendarEvent(token, ev);
        setWorkspace((prev) =>
          prev
            ? {
                ...prev,
                events: prev.events.map((e) =>
                  e.id === ev.id ? { ...e, googleEventId } : e
                ),
              }
            : prev
        );
        fireHaptic('taskComplete', 'Evento inviato su Google Calendar');
        showNotice('ok', `"${ev.title}" creato su Google Calendar.`);
      },
    });
  };

  const handleDeleteEvent = (ev: CalendarEvent) => {
    if (ev.googleEventId) {
      const token = getWorkspaceAccessToken();
      if (!token) {
        showNotice('err', 'Riconnetti Google per eliminare un evento sincronizzato.');
        return;
      }
      setPendingConfirmation({
        title: 'Eliminare evento da Google Calendar?',
        description: `Vuoi eliminare definitivamente "${ev.title}" da Google Calendar e dalla tua agenda locale?`,
        affectedItems: [`${ev.title} · ${formatShortDateIT(ev.date)} ${ev.startTime}`],
        confirmLabel: 'Elimina Evento',
        isDestructive: true,
        onConfirm: async () => {
          await deleteGoogleCalendarEvent(token, ev.googleEventId!);
          setWorkspace((prev) =>
            prev ? { ...prev, events: prev.events.filter((e) => e.id !== ev.id) } : prev
          );
          showNotice('ok', `"${ev.title}" eliminato da Google Calendar.`);
        },
      });
      return;
    }

    setWorkspace((prev) =>
      prev ? { ...prev, events: prev.events.filter((e) => e.id !== ev.id) } : prev
    );
  };

  const handleSyncGoogleTasks = async (overrideListId?: string) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Accedi con Google per sincronizzare Google Tasks.');
      return;
    }
    const listId = overrideListId || selectedTaskListId || '@default';
    setSyncingTasks(true);
    try {
      const lists = await fetchGoogleTaskLists(token);
      if (lists.length > 0) setGoogleTaskLists(lists);
      const gTasks = await fetchGoogleTasks(token, listId);
      setWorkspace((prev) => {
        if (!prev) return prev;
        const existingGIds = new Set(
          prev.tasks.map((t) => t.googleTaskId).filter(Boolean)
        );
        const imported: TaskItem[] = gTasks
          .filter((gt) => !existingGIds.has(gt.id) && gt.title.trim())
          .map((gt) => ({
            id: `gt-${gt.id}`,
            googleTaskId: gt.id,
            googleTaskListId: listId,
            title: gt.title,
            notes: gt.notes,
            quadrant: 'Q2',
            kanbanStatus: gt.status === 'completed' ? 'done' : 'backlog',
            priority: 'medium',
            startDate: getTodayISO(),
            dueDate: gt.due ? gt.due.slice(0, 10) : getTodayISO(),
            progress: gt.status === 'completed' ? 100 : 0,
            pomodoroSessions: 0,
            attachments: [],
            updatedAt: gt.updated || new Date().toISOString(),
          }));
        return { ...prev, tasks: [...imported, ...prev.tasks] };
      });
      showNotice('ok', `Sincronizzati ${gTasks.length} task da Google Tasks.`);
    } catch (err) {
      showNotice(
        'err',
        err instanceof Error ? err.message : 'Sincronizzazione Google Tasks fallita.'
      );
    } finally {
      setSyncingTasks(false);
    }
  };

  const handlePushTaskToGoogle = (task: TaskItem) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Accedi con Google per inviare task su Google Tasks.');
      return;
    }
    setPendingConfirmation({
      title: 'Inviare task su Google Tasks?',
      description: `Creare "${task.title}" nella lista Google Tasks (${selectedTaskListId})?`,
      affectedItems: [`${task.title} · Scad. ${formatShortDateIT(task.dueDate)}`],
      confirmLabel: 'Crea su Google Tasks',
      onConfirm: async () => {
        const gId = await createGoogleTask(token, task, selectedTaskListId);
        setWorkspace((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((t) =>
                  t.id === task.id
                    ? { ...t, googleTaskId: gId, googleTaskListId: selectedTaskListId }
                    : t
                ),
              }
            : prev
        );
        fireHaptic('taskComplete', 'Sincronizzato con Google Tasks');
        showNotice('ok', `"${task.title}" inviato su Google Tasks.`);
      },
    });
  };

  const handleUpdateTask = (taskId: string, patch: Partial<TaskItem>) => {
    const target = workspace.tasks.find((t) => t.id === taskId);
    if (!target) return;

    if (
      target.googleTaskId &&
      patch.kanbanStatus &&
      (patch.kanbanStatus === 'done') !== (target.kanbanStatus === 'done')
    ) {
      const token = getWorkspaceAccessToken();
      if (token) {
        const nextDone = patch.kanbanStatus === 'done';
        setPendingConfirmation({
          title: nextDone ? 'Completare task su Google Tasks?' : 'Riaprire Google Task?',
          description: `Aggiornare lo stato di completamento per "${target.title}" anche su Google Tasks?`,
          confirmLabel: nextDone ? 'Segna Completato' : 'Riapri Task',
          onConfirm: async () => {
            await updateGoogleTaskStatus(
              token,
              target.googleTaskId!,
              nextDone,
              target.googleTaskListId || '@default'
            );
            setWorkspace((prev) =>
              prev
                ? {
                    ...prev,
                    tasks: prev.tasks.map((t) =>
                      t.id === taskId
                        ? { ...t, ...patch, updatedAt: new Date().toISOString() }
                        : t
                    ),
                  }
                : prev
            );
            if (nextDone) fireHaptic('taskComplete', `Completato: ${target.title}`);
          },
        });
        return;
      }
    }

    const becameDone =
      patch.kanbanStatus === 'done' && target.kanbanStatus !== 'done';
    const movedDrag =
      (patch.quadrant && patch.quadrant !== target.quadrant) ||
      (patch.kanbanStatus && patch.kanbanStatus !== target.kanbanStatus);

    setWorkspace((prev) =>
      prev
        ? {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === taskId
                ? { ...t, ...patch, updatedAt: new Date().toISOString() }
                : t
            ),
          }
        : prev
    );

    if (becameDone) {
      fireHaptic('taskComplete', `Completato: ${target.title}`);
    } else if (movedDrag) {
      fireHaptic('dragDrop');
    }
  };

  const handleDeleteTask = (task: TaskItem) => {
    setWorkspace((prev) =>
      prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== task.id) } : prev
    );
  };

  const handleAutoMatchDriveFiles = () => {
    const candidateFiles: DriveFileRecord[] =
      driveFiles.length > 0
        ? driveFiles
        : [
            {
              id: 'local-1',
              name: 'Previsione_Budget_Trimestrale.xlsx',
              mimeType: 'application/vnd.google-apps.spreadsheet',
            },
            {
              id: 'local-2',
              name: 'Specifiche_Sync_Offline_Drive.gdoc',
              mimeType: 'application/vnd.google-apps.document',
            },
            {
              id: 'local-3',
              name: 'Roadmap_Presentazione_Settimanale.gslides',
              mimeType: 'application/vnd.google-apps.presentation',
            },
          ];

    let attachedCount = 0;
    setWorkspace((prev) => {
      if (!prev) return prev;
      const nextTasks = prev.tasks.map((t) => {
        const matches = matchDriveFilesToTask(t.title, t.notes, candidateFiles);
        const existingIds = new Set(t.attachments.map((a) => a.id));
        const fresh = matches.filter((m) => !existingIds.has(m.id));
        attachedCount += fresh.length;
        return fresh.length > 0
          ? { ...t, attachments: [...t.attachments, ...fresh] }
          : t;
      });
      return { ...prev, tasks: nextTasks };
    });
    fireHaptic('taskComplete', `Collegati ${attachedCount} file Drive`);
    showNotice(
      'ok',
      attachedCount > 0
        ? `Collegati automaticamente ${attachedCount} file ai task corrispondenti.`
        : 'Tutti i file pertinenti risultano già collegati ai rispettivi task.'
    );
  };

  const handleCreateSpreadsheet = () => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Accedi con Google per creare un foglio Google Sheets.');
      return;
    }
    setPendingConfirmation({
      title: 'Creare Registro Google Sheets?',
      description:
        'Verrà creato un nuovo foglio "Cadence Finance & Shopping Ledger" sul tuo Google Drive con le schede Spese, Budget e Lista Spesa.',
      confirmLabel: 'Crea Foglio Google',
      onConfirm: async () => {
        setSyncingSheets(true);
        try {
          const created = await createFinanceSpreadsheet(token);
          await syncFinanceDataToGoogleSheet(
            token,
            created.spreadsheetId,
            workspace.expenses,
            workspace.budget,
            workspace.shoppingList
          );
          setWorkspace((prev) =>
            prev
              ? {
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    linkedSpreadsheetId: created.spreadsheetId,
                    linkedSpreadsheetName: created.title,
                  },
                }
              : prev
          );
          fireHaptic('taskComplete', 'Google Sheet creato e sincronizzato');
          showNotice('ok', 'Creato e popolato il registro finanziario su Google Sheets.');
        } finally {
          setSyncingSheets(false);
        }
      },
    });
  };

  const handleSyncToGoogleSheets = () => {
    const token = getWorkspaceAccessToken();
    const sheetId = workspace.preferences.linkedSpreadsheetId;
    if (!token || !sheetId) return;

    setPendingConfirmation({
      title: 'Aggiornare il registro su Google Sheets?',
      description: `Sovrascrivere le celle in "${workspace.preferences.linkedSpreadsheetName || 'Cadence Ledger'}" con le tue spese (${workspace.expenses.length} righe), limiti budget e lista spesa (${workspace.shoppingList.length} articoli)?`,
      affectedItems: [
        `${workspace.expenses.length} righe spese`,
        `Limiti budget mensile (${workspace.budget.month})`,
        `${workspace.shoppingList.length} articoli lista spesa`,
      ],
      confirmLabel: 'Sincronizza su Google Sheets',
      onConfirm: async () => {
        setSyncingSheets(true);
        try {
          await syncFinanceDataToGoogleSheet(
            token,
            sheetId,
            workspace.expenses,
            workspace.budget,
            workspace.shoppingList
          );
          fireHaptic('taskComplete', 'Sincronizzato con Google Sheets');
          showNotice('ok', 'Foglio Google Sheets aggiornato correttamente.');
        } finally {
          setSyncingSheets(false);
        }
      },
    });
  };

  const handleRefreshDriveFiles = async (query?: string) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Accedi con Google per sfogliare i file di Google Drive.');
      return;
    }
    setLoadingDrive(true);
    try {
      const files = await listDriveFiles(token, query);
      setDriveFiles(files);
      showNotice('ok', `Caricati ${files.length} file da Google Drive.`);
    } catch (err) {
      showNotice(
        'err',
        err instanceof Error ? err.message : 'Errore nel caricamento dei file Drive.'
      );
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleCreateDriveDoc = (title: string, content: string) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Accedi con Google per creare documenti su Google Drive.');
      return;
    }
    setPendingConfirmation({
      title: 'Creare documento collaborativo su Google Drive?',
      description: `Verrà creato "${title}" come Google Doc nel tuo Google Drive.`,
      confirmLabel: 'Crea Google Doc',
      onConfirm: async () => {
        const created = await createCollaborativeDriveDoc(token, title, content);
        setDriveFiles((prev) => [created, ...prev]);
        fireHaptic('taskComplete', 'Google Doc creato');
        showNotice('ok', `"${created.name}" creato su Google Drive.`);
      },
    });
  };

  const handleReadDriveDoc = async (file: DriveFileRecord) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Accedi con Google per leggere i documenti Drive.');
      return;
    }
    setActiveDriveDoc(file);
    setLoadingDocContent(true);
    try {
      const text = await readDriveDocumentContent(token, file);
      setActiveDriveDocContent(text);
    } catch (err) {
      showNotice(
        'err',
        err instanceof Error ? err.message : 'Impossibile leggere questo file come testo.'
      );
      setActiveDriveDocContent('');
    } finally {
      setLoadingDocContent(false);
    }
  };

  const handleSaveDriveDocContent = (file: DriveFileRecord, content: string) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Accedi con Google per salvare le modifiche su Drive.');
      return;
    }
    setPendingConfirmation({
      title: 'Salvare le modifiche su Google Drive?',
      description: `Aggiornare il contenuto di "${file.name}" su Google Drive con il testo modificato?`,
      confirmLabel: 'Salva Documento',
      onConfirm: async () => {
        const updated = await updateDriveDocumentContent(token, file.id, content);
        setActiveDriveDoc(updated);
        setActiveDriveDocContent(content);
        setDriveFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        fireHaptic('taskComplete', `Salvato ${file.name}`);
        showNotice('ok', `"${file.name}" aggiornato su Google Drive.`);
      },
    });
  };

  const handleRefreshSpreadsheets = async () => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Accedi con Google per elencare i tuoi Google Sheets.');
      return;
    }
    setLoadingSheetGrid(true);
    try {
      const sheets = await listGoogleSpreadsheets(token);
      setSpreadsheets(sheets);
      showNotice('ok', `Trovati ${sheets.length} fogli Google Sheets.`);
    } catch (err) {
      showNotice(
        'err',
        err instanceof Error ? err.message : 'Impossibile elencare i fogli Google.'
      );
    } finally {
      setLoadingSheetGrid(false);
    }
  };

  const handleReadSheetTab = async (spreadsheetId: string, tabName: string) => {
    const token = getWorkspaceAccessToken();
    if (!token) return;
    setLoadingSheetGrid(true);
    setActiveSheetTab(tabName);
    try {
      const rows = await readSheetRange(token, spreadsheetId, `${tabName}!A1:H40`);
      setSheetGrid(rows);
    } catch (err) {
      showNotice(
        'err',
        err instanceof Error ? err.message : 'Errore durante la lettura della scheda.'
      );
    } finally {
      setLoadingSheetGrid(false);
    }
  };

  const handleSelectSpreadsheet = async (spreadsheetId: string, title?: string) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Accedi con Google per leggere i fogli di calcolo.');
      return;
    }
    setLoadingSheetGrid(true);
    try {
      const meta = await getSpreadsheetMetadata(token, spreadsheetId);
      setSheetTabs(meta.sheets);
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              preferences: {
                ...prev.preferences,
                linkedSpreadsheetId: meta.spreadsheetId,
                linkedSpreadsheetName: title || meta.title,
              },
            }
          : prev
      );
      if (meta.sheets[0]) {
        await handleReadSheetTab(meta.spreadsheetId, meta.sheets[0]);
      }
    } catch (err) {
      showNotice(
        'err',
        err instanceof Error ? err.message : 'Impossibile aprire il foglio selezionato.'
      );
      setLoadingSheetGrid(false);
    }
  };

  const handleWriteSheetGrid = (
    spreadsheetId: string,
    tabName: string,
    values: string[][]
  ) => {
    const token = getWorkspaceAccessToken();
    if (!token) return;
    setPendingConfirmation({
      title: 'Scrivere le modifiche su Google Sheets?',
      description: `Aggiornare ${values.length} righe nella scheda "${tabName}" del foglio Google collegato?`,
      affectedItems: [`Scheda: ${tabName}`, `${values.length} righe`],
      confirmLabel: 'Scrivi su Foglio',
      onConfirm: async () => {
        setSyncingSheets(true);
        try {
          await writeSheetRange(token, spreadsheetId, `${tabName}!A1`, values);
          setSheetGrid(values);
          fireHaptic('taskComplete', 'Foglio Google aggiornato');
          showNotice('ok', `Scheda "${tabName}" aggiornata su Google Sheets.`);
        } finally {
          setSyncingSheets(false);
        }
      },
    });
  };

  const handleUploadEncryptedDrive = async (passphrase: string) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      throw new Error('Accedi prima con Google per sincronizzare i backup cifrati su Drive.');
    }
    return new Promise<void>((resolve, reject) => {
      setPendingConfirmation({
        title: 'Sincronizzare Archivio Cifrato su Drive?',
        description:
          'Tutti i dati verranno cifrati con AES-256-GCM nel tuo browser e caricati nella cartella privata AppData di Google Drive.',
        confirmLabel: 'Cifra & Carica',
        onConfirm: async () => {
          try {
            await uploadEncryptedVaultToDrive(token, workspace, passphrase);
            fireHaptic('taskComplete', 'Sync cifrato su Drive completato');
            resolve();
          } catch (err) {
            reject(err);
          }
        },
      });
    });
  };

  const handleRestoreEncryptedDrive = async (passphrase: string) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      throw new Error('Accedi con Google per ripristinare il backup da Drive.');
    }
    const restored = await downloadEncryptedVaultFromDrive(token, passphrase);
    setWorkspace(restored);
    fireHaptic('taskComplete', 'Archivio cifrato ripristinato');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              Cadence
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {currency === 'USD' ? '$ USD' : '€ EUR'}
            </span>
          </div>

          <nav className="space-y-1" aria-label="Navigazione Workspace">
            {NAV_ITEMS.map((item) => {
              const active = section === item.id;
              const badgeCount =
                item.id === 'projects'
                  ? openTasksCount
                  : item.id === 'finance'
                  ? pendingShopCount
                  : 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="inline-flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {badgeCount > 0 && (
                    <span
                      className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500/50 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              {user && hasGoogleToken ? 'Sync Cifrato Drive' : 'Archivio Locale'}
            </span>
            <span className="text-[11px] text-slate-400">Opzioni</span>
          </button>
        </div>
      </aside>

      {/* Drawer Menu Mobile (Opzioni Secondarie su Pixel Pro) */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-10 w-64 bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Cadence
                </span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Chiudi menu"
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSection(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      section === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                setSettingsOpen(true);
              }}
              className="w-full flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs font-medium"
            >
              <Lock className="h-3.5 w-3.5 text-blue-500" />
              Sync, Valuta &amp; Cifratura
            </button>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar compatta per Mobile & Desktop */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-sm px-3.5 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Apri menu navigazione"
              className="lg:hidden rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
              {NAV_ITEMS.find((n) => n.id === section)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Pill Pomodoro persistente quando attivo o in pausa */}
            {showHeaderPomPill && (
              <button
                type="button"
                onClick={() => setSection('overview')}
                title="Vai al Timer Pomodoro"
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1.5 text-xs font-semibold tabular-nums cursor-pointer ${
                  pomRunning
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                }`}
              >
                <Timer className={`h-3.5 w-3.5 ${pomRunning ? 'animate-pulse' : ''}`} />
                <span>
                  {headerPomMins}:{headerPomSecs}
                </span>
              </button>
            )}

            {/* Ricerca Globale */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Ricerca globale"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 sm:py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Search className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Cerca</span>
              <kbd className="hidden md:inline rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 text-[10px] text-slate-400">
                ⌘K
              </kbd>
            </button>

            <PWAInstallButton />

            <button
              type="button"
              onClick={() =>
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          theme: prev.preferences.theme === 'dark' ? 'light' : 'dark',
                        },
                      }
                    : prev
                )
              }
              aria-label="Cambia tema chiaro/scuro"
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {workspace.preferences.theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Impostazioni e Sync Cifrato"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Vault &amp; Opzioni
            </button>

            {user && hasGoogleToken ? (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="rounded-lg bg-emerald-600/15 border border-emerald-600/30 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 whitespace-nowrap cursor-pointer"
              >
                {user.displayName?.split(' ')[0] || 'Google OK'}
              </button>
            ) : (
              <GoogleSignInButton
                onClick={handleGoogleSignIn}
                loading={signingIn}
                label="Google Sync"
              />
            )}
          </div>
        </header>

        {/* Contenitore Principale con padding inferiore extra per Bottom Nav su Pixel Pro */}
        <main className="flex-1 max-w-[1280px] w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 pb-24 lg:pb-8 space-y-5 sm:space-y-6">
          <VoiceAssistantBar
            voiceLang={voiceLang}
            onChangeVoiceLang={(lang) =>
              setWorkspace((prev) =>
                prev
                  ? { ...prev, preferences: { ...prev.preferences, voiceLang: lang } }
                  : prev
              )
            }
            onCommand={handleVoiceCommand}
            lastFeedback={voiceFeedback}
          />

          {apiNotice && (
            <div
              className={`rounded-lg border px-4 py-2.5 text-xs font-medium ${
                apiNotice.kind === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
              }`}
            >
              {apiNotice.msg}
            </div>
          )}

          {section === 'overview' && (
            <OverviewDashboard
              data={workspace}
              pomodoroState={{
                mode: pomMode,
                secondsLeft: pomSecondsLeft,
                running: pomRunning,
                selectedTaskId: pomTaskId,
                completedCount: pomCompletedCount,
              }}
              onNavigate={setSection}
              onToggleReminder={(id) => {
                const target = workspace.reminders.find((r) => r.id === id);
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        reminders: prev.reminders.map((r) =>
                          r.id === id ? { ...r, completed: !r.completed } : r
                        ),
                      }
                    : prev
                );
                if (target && !target.completed) {
                  fireHaptic('taskComplete', `Completato: ${target.title}`);
                }
              }}
              onToggleTaskDone={(id) => {
                const target = workspace.tasks.find((t) => t.id === id);
                if (!target) return;
                handleUpdateTask(id, {
                  kanbanStatus: target.kanbanStatus === 'done' ? 'backlog' : 'done',
                  progress: target.kanbanStatus === 'done' ? 50 : 100,
                });
              }}
              onToggleShoppingItem={(id) => {
                const target = workspace.shoppingList.find((s) => s.id === id);
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        shoppingList: prev.shoppingList.map((s) =>
                          s.id === id ? { ...s, checked: !s.checked } : s
                        ),
                      }
                    : prev
                );
                if (target && !target.checked) {
                  fireHaptic('taskComplete', `Preso: ${target.name}`);
                }
              }}
              onAddShoppingItem={(name) => {
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        shoppingList: [
                          {
                            id: `shp-${Date.now()}`,
                            name,
                            category: 'Other',
                            quantity: '1',
                            estimatedPrice: 0,
                            checked: false,
                          },
                          ...prev.shoppingList,
                        ],
                      }
                    : prev
                );
                fireHaptic('tap');
              }}
              onLogWater={(ml) => {
                mutateTodayHealth((h) => ({ ...h, waterMl: h.waterMl + ml }));
                fireHaptic('waterLog', `Idratazione +${ml}ml`);
              }}
              onLogSteps={(steps) => {
                mutateTodayHealth((h) => ({
                  ...h,
                  steps: h.steps + steps,
                  kcalBurned: h.kcalBurned + Math.round(steps * 0.04),
                }));
                fireHaptic('waterLog', `+${steps.toLocaleString('it-IT')} passi`);
              }}
              onTogglePomodoroRun={() => setPomRunning((prev) => !prev)}
              onResetPomodoro={() => {
                setPomRunning(false);
                setPomSecondsLeft(getModeDurationSeconds(pomMode));
              }}
              onSwitchPomodoroMode={(nextMode) => {
                setPomRunning(false);
                setPomMode(nextMode);
                setPomSecondsLeft(getModeDurationSeconds(nextMode));
              }}
              onSkipPomodoroPhase={completePomodoroPhase}
              onSelectPomodoroTask={setPomTaskId}
              onUpdatePomodoroDurations={(focusMin, shortMin, longMin) => {
                const nextPrefs = {
                  ...workspace.preferences,
                  pomodoroFocusMin: focusMin,
                  pomodoroShortBreakMin: shortMin,
                  pomodoroLongBreakMin: longMin,
                };
                setWorkspace((prev) =>
                  prev ? { ...prev, preferences: nextPrefs } : prev
                );
                if (!pomRunning) {
                  setPomSecondsLeft(getModeDurationSeconds(pomMode, nextPrefs));
                }
              }}
            />
          )}

          {section === 'schedule' && (
            <ScheduleView
              events={workspace.events}
              reminders={workspace.reminders}
              isGoogleConnected={Boolean(user && hasGoogleToken)}
              syncingCalendar={syncingCalendar}
              onAddEvent={(ev) => {
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        events: [...prev.events, { ...ev, id: `ev-${Date.now()}` }],
                      }
                    : prev
                );
                fireHaptic('taskComplete', `Evento segnato: ${ev.title}`);
              }}
              onDeleteEvent={handleDeleteEvent}
              onPushEventToGoogle={handlePushEventToGoogle}
              onSyncFromGoogle={handlePullGoogleCalendar}
              onAddReminder={(rem) => {
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        reminders: [
                          { ...rem, id: `rem-${Date.now()}` },
                          ...prev.reminders,
                        ],
                      }
                    : prev
                );
                fireHaptic('tap', 'Promemoria salvato');
              }}
              onToggleReminder={(id) => {
                const target = workspace.reminders.find((r) => r.id === id);
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        reminders: prev.reminders.map((r) =>
                          r.id === id ? { ...r, completed: !r.completed } : r
                        ),
                      }
                    : prev
                );
                if (target && !target.completed) {
                  fireHaptic('taskComplete', `Promemoria completato: ${target.title}`);
                }
              }}
              onDeleteReminder={(id) =>
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        reminders: prev.reminders.filter((r) => r.id !== id),
                      }
                    : prev
                )
              }
            />
          )}

          {section === 'projects' && (
            <ProjectsView
              projects={workspace.projects}
              tasks={workspace.tasks}
              driveFiles={driveFiles}
              googleTaskLists={googleTaskLists}
              selectedTaskListId={selectedTaskListId}
              isGoogleConnected={Boolean(user && hasGoogleToken)}
              syncingTasks={syncingTasks}
              onAddProject={(proj: Omit<Project, 'id'>) => {
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        projects: [
                          ...prev.projects,
                          { ...proj, id: `prj-${Date.now()}` },
                        ],
                      }
                    : prev
                );
                fireHaptic('taskComplete', `Progetto creato: ${proj.name}`);
              }}
              onDeleteProject={(projectId) => {
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        projects: prev.projects.filter((p) => p.id !== projectId),
                        tasks: prev.tasks.map((t) =>
                          t.projectId === projectId ? { ...t, projectId: undefined } : t
                        ),
                      }
                    : prev
                );
              }}
              onAddTask={(t) => {
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        tasks: [
                          {
                            ...t,
                            id: `tsk-${Date.now()}`,
                            updatedAt: new Date().toISOString(),
                          },
                          ...prev.tasks,
                        ],
                      }
                    : prev
                );
                fireHaptic('taskComplete', `Task creato: ${t.title}`);
              }}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onAutoMatchDriveFiles={handleAutoMatchDriveFiles}
              onSyncGoogleTasks={handleSyncGoogleTasks}
              onPushTaskToGoogle={handlePushTaskToGoogle}
              onSelectTaskListId={setSelectedTaskListId}
            />
          )}

          {section === 'finance' && (
            <FinanceShoppingView
              expenses={workspace.expenses}
              budget={workspace.budget}
              shoppingList={workspace.shoppingList}
              currency={currency}
              isGoogleConnected={Boolean(user && hasGoogleToken)}
              linkedSpreadsheetId={workspace.preferences.linkedSpreadsheetId}
              linkedSpreadsheetName={workspace.preferences.linkedSpreadsheetName}
              spreadsheets={spreadsheets}
              sheetTabs={sheetTabs}
              activeSheetTab={activeSheetTab}
              sheetGrid={sheetGrid}
              loadingSheetGrid={loadingSheetGrid}
              syncingSheets={syncingSheets}
              onAddExpense={(exp) => {
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        expenses: [
                          { ...exp, id: `exp-${Date.now()}` },
                          ...prev.expenses,
                        ],
                      }
                    : prev
                );
                fireHaptic('taskComplete', `Spesa registrata: ${formatMoney(exp.amount, currency)}`);
              }}
              onDeleteExpense={(id) =>
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        expenses: prev.expenses.filter((e) => e.id !== id),
                      }
                    : prev
                )
              }
              onUpdateBudget={(budget: MonthlyBudget) =>
                setWorkspace((prev) => (prev ? { ...prev, budget } : prev))
              }
              onAddShoppingItem={(item) => {
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        shoppingList: [
                          { ...item, id: `shp-${Date.now()}` },
                          ...prev.shoppingList,
                        ],
                      }
                    : prev
                );
                fireHaptic('tap');
              }}
              onToggleShoppingItem={(id) => {
                const target = workspace.shoppingList.find((s) => s.id === id);
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        shoppingList: prev.shoppingList.map((s) =>
                          s.id === id ? { ...s, checked: !s.checked } : s
                        ),
                      }
                    : prev
                );
                if (target && !target.checked) {
                  fireHaptic('taskComplete', `Preso: ${target.name}`);
                }
              }}
              onDeleteShoppingItem={(id) =>
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        shoppingList: prev.shoppingList.filter((s) => s.id !== id),
                      }
                    : prev
                )
              }
              onConvertCheckedShoppingToExpense={() => {
                const checked = workspace.shoppingList.filter((s) => s.checked);
                if (checked.length === 0) return;
                const total = checked.reduce((acc, s) => acc + s.estimatedPrice, 0);
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        expenses: [
                          {
                            id: `exp-${Date.now()}`,
                            description: `Spesa Supermercato (${checked.length} articoli)`,
                            amount: Math.max(0.01, Number(total.toFixed(2))),
                            category: 'Groceries',
                            date: getTodayISO(),
                          },
                          ...prev.expenses,
                        ],
                        shoppingList: prev.shoppingList.filter((s) => !s.checked),
                      }
                    : prev
                );
                fireHaptic('taskComplete', `Registrata spesa ${formatMoney(total, currency)}`);
              }}
              onCreateSpreadsheet={handleCreateSpreadsheet}
              onSyncToGoogleSheets={handleSyncToGoogleSheets}
              onRefreshSpreadsheets={handleRefreshSpreadsheets}
              onSelectSpreadsheet={handleSelectSpreadsheet}
              onReadSheetTab={handleReadSheetTab}
              onWriteSheetGrid={handleWriteSheetGrid}
            />
          )}

          {section === 'notes' && (
            <NotesDriveView
              notes={workspace.notes}
              tasks={workspace.tasks}
              driveFiles={driveFiles}
              activeDriveDoc={activeDriveDoc}
              activeDriveDocContent={activeDriveDocContent}
              loadingDocContent={loadingDocContent}
              isGoogleConnected={Boolean(user && hasGoogleToken)}
              loadingDrive={loadingDrive}
              onAddNote={(n) => {
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        notes: [
                          {
                            ...n,
                            id: `nt-${Date.now()}`,
                            updatedAt: new Date().toISOString(),
                          },
                          ...prev.notes,
                        ],
                      }
                    : prev
                );
                fireHaptic('taskComplete', 'Nota salvata');
              }}
              onUpdateNote={(id, patch) => {
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        notes: prev.notes.map((n) =>
                          n.id === id
                            ? { ...n, ...patch, updatedAt: new Date().toISOString() }
                            : n
                        ),
                      }
                    : prev
                );
                fireHaptic('tap', 'Nota aggiornata');
              }}
              onTogglePinNote={(id) =>
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        notes: prev.notes.map((n) =>
                          n.id === id ? { ...n, pinned: !n.pinned } : n
                        ),
                      }
                    : prev
                )
              }
              onToggleNoteChecklist={(noteId, lineId) => {
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        notes: prev.notes.map((n) =>
                          n.id === noteId
                            ? {
                                ...n,
                                checklist: n.checklist.map((cl) =>
                                  cl.id === lineId ? { ...cl, done: !cl.done } : cl
                                ),
                              }
                            : n
                        ),
                      }
                    : prev
                );
                fireHaptic('taskComplete');
              }}
              onDeleteNote={(id) =>
                setWorkspace((prev) =>
                  prev
                    ? { ...prev, notes: prev.notes.filter((n) => n.id !== id) }
                    : prev
                )
              }
              onImportKeepNotes={(imported) => {
                setWorkspace((prev) =>
                  prev ? { ...prev, notes: [...imported, ...prev.notes] } : prev
                );
                fireHaptic('taskComplete', `Importate ${imported.length} note Keep`);
              }}
              onExportNoteToDrive={(note) => {
                const body = [
                  note.title,
                  '',
                  note.body,
                  ...note.checklist.map((c) => `- [${c.done ? 'x' : ' '}] ${c.text}`),
                ].join('\n');
                handleCreateDriveDoc(note.title, body);
              }}
              onRefreshDriveFiles={handleRefreshDriveFiles}
              onCreateDriveDoc={handleCreateDriveDoc}
              onReadDriveDoc={handleReadDriveDoc}
              onSaveDriveDocContent={handleSaveDriveDocContent}
              onCloseDriveDoc={() => {
                setActiveDriveDoc(null);
                setActiveDriveDocContent('');
              }}
              onAttachDriveFileToTask={(taskId, file) => {
                const task = workspace.tasks.find((t) => t.id === taskId);
                if (!task) return;
                if (task.attachments.some((a) => a.id === file.id)) return;
                handleUpdateTask(taskId, {
                  attachments: [
                    ...task.attachments,
                    {
                      id: file.id,
                      name: file.name,
                      mimeType: file.mimeType,
                      webViewLink: file.webViewLink,
                      modifiedTime: file.modifiedTime,
                      source: 'drive',
                    },
                  ],
                });
                fireHaptic('taskComplete', `Allegato ${file.name}`);
                showNotice('ok', `"${file.name}" allegato a "${task.title}".`);
              }}
            />
          )}

          {section === 'fitness' && (
            <FitnessHealthView
              healthLogs={workspace.healthLogs}
              autoCalendarWorkoutSync={workspace.preferences.autoCalendarWorkoutSync}
              onLogWater={(ml) => {
                mutateTodayHealth((h) => ({ ...h, waterMl: h.waterMl + ml }));
                fireHaptic('waterLog', `Idratazione +${ml}ml`);
              }}
              onLogSteps={(steps) => {
                mutateTodayHealth((h) => ({
                  ...h,
                  steps: h.steps + steps,
                  kcalBurned: h.kcalBurned + Math.round(steps * 0.04),
                }));
                fireHaptic('waterLog', `+${steps.toLocaleString('it-IT')} passi`);
              }}
              onUpdateGoals={(stepGoal, kcalGoal, waterGoalMl) => {
                mutateTodayHealth((h) => ({ ...h, stepGoal, kcalGoal, waterGoalMl }));
              }}
              onAddWorkout={(w: Omit<WorkoutEntry, 'id'>) => {
                const newWk: WorkoutEntry = { ...w, id: `wk-${Date.now()}` };
                mutateTodayHealth((h) => ({
                  ...h,
                  kcalBurned: h.kcalBurned + w.kcal,
                  workouts: [newWk, ...h.workouts],
                }));
                const workoutIt = WORKOUT_LABELS[w.type] || w.type;
                if (workspace.preferences.autoCalendarWorkoutSync) {
                  const [hh, mm] = w.time.split(':').map(Number);
                  const totalMins = hh * 60 + mm + w.durationMin;
                  const endH = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
                  const endM = String(totalMins % 60).padStart(2, '0');
                  setWorkspace((prev) =>
                    prev
                      ? {
                          ...prev,
                          events: [
                            ...prev.events,
                            {
                              id: `ev-wk-${Date.now()}`,
                              title: `Allenamento: ${workoutIt} (${w.kcal} kcal)`,
                              date: getTodayISO(),
                              startTime: w.time,
                              endTime: `${endH}:${endM}`,
                              category: 'health',
                              reminderMinutes: 15,
                            },
                          ],
                        }
                      : prev
                  );
                }
                fireHaptic('taskComplete', `Allenamento ${workoutIt} salvato`);
              }}
              onToggleCalendarWorkoutSync={(enabled) =>
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          autoCalendarWorkoutSync: enabled,
                        },
                      }
                    : prev
                )
              }
              onImportHealthData={(steps, kcal) => {
                mutateTodayHealth((h) => ({
                  ...h,
                  steps: h.steps + steps,
                  kcalBurned: h.kcalBurned + kcal,
                }));
                fireHaptic('taskComplete', 'Metriche salute importate');
              }}
            />
          )}
        </main>
      </div>

      {/* Bottom Navigation Bar fissa su Pixel Pro / Mobile */}
      <nav
        aria-label="Navigazione rapida mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-6 max-w-md mx-auto">
          {NAV_ITEMS.map((item) => {
            const active = section === item.id;
            const dotCount =
              item.id === 'projects'
                ? openTasksCount
                : item.id === 'finance'
                ? pendingShopCount
                : 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSection(item.id);
                  fireHaptic('tap');
                }}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-2 px-1 text-[10px] font-medium transition-colors cursor-pointer ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <span className="relative">
                  {item.icon}
                  {dotCount > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                      {dotCount > 9 ? '9+' : dotCount}
                    </span>
                  )}
                </span>
                <span className="truncate max-w-full">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toast Feedback Aptico (sopra la Bottom Nav su mobile) */}
      {hapticBanner && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-4 right-4 z-40 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-slate-900 dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-white shadow-xl"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-haptic-ripple" />
          <span>{hapticBanner}</span>
        </div>
      )}

      <OfflineIndicator />

      <GlobalSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        workspace={workspace}
        driveFiles={driveFiles}
        onNavigate={setSection}
      />

      <SyncSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        workspace={workspace}
        user={user}
        hasGoogleToken={hasGoogleToken}
        signingIn={signingIn}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        onUploadEncryptedDrive={handleUploadEncryptedDrive}
        onRestoreEncryptedDrive={handleRestoreEncryptedDrive}
        onImportDecryptedWorkspace={(restored) => {
          setWorkspace(restored);
          fireHaptic('taskComplete', 'Workspace cifrato ripristinato');
        }}
        onUpdatePreferences={(patch) =>
          setWorkspace((prev) =>
            prev
              ? { ...prev, preferences: { ...prev.preferences, ...patch } }
              : prev
          )
        }
        onTestHaptic={() => fireHaptic('taskComplete', 'Impulso aptico di test attivato')}
        onResetWorkspace={() => {
          setPendingConfirmation({
            title: 'Ripristinare il Workspace Locale?',
            description:
              'Questa operazione riporterà tutti i task, eventi, note, finanze e dati salute ai valori iniziali. Esporta prima un backup .cadence se vuoi conservare le modifiche.',
            confirmLabel: 'Ripristina Dati Locali',
            isDestructive: true,
            onConfirm: async () => {
              const fresh = createSeedWorkspaceData();
              setWorkspace(fresh);
              setSettingsOpen(false);
              showNotice('ok', 'Workspace locale ripristinato ai valori iniziali.');
            },
          });
        }}
      />

      <ConfirmationModal
        confirmation={pendingConfirmation}
        onClose={() => setPendingConfirmation(null)}
      />
    </div>
  );
}
