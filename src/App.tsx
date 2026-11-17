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
  ShieldCheck,
  StickyNote,
  Sun,
  Wallet,
  X,
} from 'lucide-react';
import { ConfirmationModal } from './components/ConfirmationModal';
import { FinanceShoppingView } from './components/FinanceShoppingView';
import { FitnessHealthView } from './components/FitnessHealthView';
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
  WorkoutEntry,
  WorkspaceData,
} from './types/workspace';
import { subscribeHapticPulse, triggerHaptic } from './utils/haptics';
import {
  createSeedWorkspaceData,
  getTodayISO,
  loadWorkspaceData,
  saveWorkspaceData,
} from './utils/storage';
import { parseVoiceCommand } from './utils/voiceParser';

const NAV_ITEMS: Array<{ id: NavSection; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'schedule', label: 'Calendar & Voice', icon: <Calendar className="h-4 w-4" /> },
  { id: 'projects', label: 'Tasks & Projects', icon: <CheckSquare className="h-4 w-4" /> },
  { id: 'finance', label: 'Budget & Shopping', icon: <Wallet className="h-4 w-4" /> },
  { id: 'notes', label: 'Notes & Drive', icon: <StickyNote className="h-4 w-4" /> },
  { id: 'fitness', label: 'Fitness & Health', icon: <Activity className="h-4 w-4" /> },
];

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [section, setSection] = useState<NavSection>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auth & Workspace API state
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
  const [pomodoroTrigger, setPomodoroTrigger] = useState<{
    mode: PomodoroMode;
    minutes?: number;
    nonce: number;
  } | null>(null);

  // Initial local-first load
  useEffect(() => {
    loadWorkspaceData().then((loaded) => {
      setWorkspace(loaded);
    });
  }, []);

  // Persist workspace locally whenever updated
  useEffect(() => {
    if (!workspace) return;
    saveWorkspaceData(workspace);
    document.documentElement.classList.toggle(
      'dark',
      workspace.preferences.theme === 'dark'
    );
  }, [workspace]);

  // Listen to Firebase Auth state (token remains in memory only)
  useEffect(() => {
    return initGoogleAuth((authUser, tokenReady) => {
      setUser(authUser);
      setHasGoogleToken(tokenReady);
    });
  }, []);

  // Visual haptic ripple indicator
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

  const showNotice = (kind: 'ok' | 'err', msg: string) => {
    setApiNotice({ kind, msg });
    window.setTimeout(() => setApiNotice(null), 4500);
  };

  // Auth handlers
  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      const result = await signInWithGoogleWorkspace();
      setUser(result.user);
      setHasGoogleToken(true);
      showNotice('ok', `Connected Google Workspace as ${result.user.email || result.user.displayName}`);
      // Auto-load Drive file index & Task lists (read-only operations)
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
        err instanceof Error ? err.message : 'Google Sign-In failed or was cancelled.'
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
    showNotice('ok', 'Disconnected Google account. Running in Local-Only mode.');
  };

  // Helpers to update health log for today
  const mutateTodayHealth = useCallback(
    (updater: (current: WorkspaceData['healthLogs'][number]) => WorkspaceData['healthLogs'][number]) => {
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

  // ---------------- VOICE COMMAND EXECUTION ----------------
  const handleVoiceCommand = useCallback(
    (transcript: string) => {
      if (!workspace) return;
      const intent = parseVoiceCommand(transcript);
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
          setVoiceFeedback(`Scheduled "${intent.title}" on ${intent.date} at ${intent.startTime}`);
          fireHaptic('taskComplete', `Scheduled: ${intent.title}`);
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
          setVoiceFeedback(`Reminder set: "${intent.title}" at ${intent.time}`);
          fireHaptic('taskComplete', `Reminder added`);
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
          setVoiceFeedback(`Task added to ${intent.quadrant}: "${intent.title}"`);
          fireHaptic('taskComplete', `Task added (${intent.quadrant})`);
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
          setVoiceFeedback(
            `Logged $${intent.amount.toFixed(2)} expense (${intent.category})`
          );
          fireHaptic('taskComplete', `Logged $${intent.amount.toFixed(2)}`);
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
          setVoiceFeedback(`Added ${intent.items.join(', ')} to shopping list`);
          fireHaptic('taskComplete', 'Added to shopping list');
          break;
        }
        case 'water': {
          mutateTodayHealth((h) => ({ ...h, waterMl: h.waterMl + intent.ml }));
          setVoiceFeedback(`Logged ${intent.ml}ml water intake`);
          fireHaptic('waterLog', `+${intent.ml}ml hydration`);
          break;
        }
        case 'steps': {
          mutateTodayHealth((h) => ({
            ...h,
            steps: h.steps + intent.steps,
            kcalBurned: h.kcalBurned + Math.round(intent.steps * 0.04),
          }));
          setVoiceFeedback(`Added ${intent.steps.toLocaleString()} steps`);
          fireHaptic('waterLog', `+${intent.steps.toLocaleString()} steps`);
          break;
        }
        case 'pomodoro': {
          setPomodoroTrigger({
            mode: intent.mode,
            minutes: intent.minutes,
            nonce: Date.now(),
          });
          setSection('overview');
          setVoiceFeedback(
            `Started ${intent.minutes ? `${intent.minutes}m ` : ''}${intent.mode.replace('_', ' ')} timer`
          );
          fireHaptic('pomodoroComplete', 'Focus timer started');
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
            tags: ['Voice'],
            updatedAt: new Date().toISOString(),
          };
          setWorkspace((prev) =>
            prev ? { ...prev, notes: [newNote, ...prev.notes] } : prev
          );
          setVoiceFeedback(`Saved note: "${intent.title}"`);
          fireHaptic('taskComplete', 'Note saved');
          break;
        }
        default: {
          setVoiceFeedback(
            `Try starting with "Schedule...", "Remind me...", "Add task...", "Log expense...", or "Log 500ml water".`
          );
        }
      }
    },
    [workspace, fireHaptic, mutateTodayHealth]
  );

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0F17] text-slate-600 dark:text-slate-300 text-sm">
        Loading Cadence Workspace...
      </div>
    );
  }

  // ---------------- WORKSPACE SYNC HANDLERS (WITH CONFIRMATION DIALOGS) ----------------

  const handlePullGoogleCalendar = async () => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Sign in with Google first to pull Google Calendar events.');
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
      showNotice('ok', `Synced ${gEvents.length} events from Google Calendar.`);
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Calendar sync failed.');
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handlePushEventToGoogle = (ev: CalendarEvent) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Sign in with Google to push events to Google Calendar.');
      return;
    }
    setPendingConfirmation({
      title: 'Add Event to Google Calendar?',
      description: `This will create "${ev.title}" on ${ev.date} (${ev.startTime}–${ev.endTime}) in your primary Google Calendar.`,
      affectedItems: [`${ev.title} (${ev.date} ${ev.startTime})`],
      confirmLabel: 'Create in Google Calendar',
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
        fireHaptic('taskComplete', 'Event pushed to Google Calendar');
        showNotice('ok', `Created "${ev.title}" in Google Calendar.`);
      },
    });
  };

  const handleDeleteEvent = (ev: CalendarEvent) => {
    if (ev.googleEventId) {
      const token = getWorkspaceAccessToken();
      if (!token) {
        showNotice('err', 'Reconnect Google to delete a synced Google Calendar event.');
        return;
      }
      setPendingConfirmation({
        title: 'Delete Event from Google Calendar?',
        description: `Are you sure you want to permanently delete "${ev.title}" from your Google Calendar and local schedule?`,
        affectedItems: [`${ev.title} · ${ev.date} ${ev.startTime}`],
        confirmLabel: 'Delete Event',
        isDestructive: true,
        onConfirm: async () => {
          await deleteGoogleCalendarEvent(token, ev.googleEventId!);
          setWorkspace((prev) =>
            prev ? { ...prev, events: prev.events.filter((e) => e.id !== ev.id) } : prev
          );
          showNotice('ok', `Deleted "${ev.title}" from Google Calendar.`);
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
      showNotice('err', 'Sign in with Google first to sync Google Tasks.');
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
      showNotice('ok', `Synced ${gTasks.length} tasks from Google Tasks.`);
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Google Tasks sync failed.');
    } finally {
      setSyncingTasks(false);
    }
  };

  const handlePushTaskToGoogle = (task: TaskItem) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Sign in with Google to push tasks to Google Tasks.');
      return;
    }
    setPendingConfirmation({
      title: 'Push Task to Google Tasks?',
      description: `Create "${task.title}" in your Google Tasks list (${selectedTaskListId})?`,
      affectedItems: [`${task.title} · Due ${task.dueDate}`],
      confirmLabel: 'Create Google Task',
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
        fireHaptic('taskComplete', 'Synced to Google Tasks');
        showNotice('ok', `Pushed "${task.title}" to Google Tasks.`);
      },
    });
  };

  const handleUpdateTask = (taskId: string, patch: Partial<TaskItem>) => {
    const target = workspace.tasks.find((t) => t.id === taskId);
    if (!target) return;

    // If marking a Google-linked task done/undone, ask confirmation before mutating Google Tasks
    if (
      target.googleTaskId &&
      patch.kanbanStatus &&
      (patch.kanbanStatus === 'done') !== (target.kanbanStatus === 'done')
    ) {
      const token = getWorkspaceAccessToken();
      if (token) {
        const nextDone = patch.kanbanStatus === 'done';
        setPendingConfirmation({
          title: nextDone ? 'Complete Task in Google Tasks?' : 'Reopen Google Task?',
          description: `Update completion status for "${target.title}" in Google Tasks as well?`,
          confirmLabel: nextDone ? 'Mark Complete' : 'Reopen Task',
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
            if (nextDone) fireHaptic('taskComplete', `Completed: ${target.title}`);
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
      fireHaptic('taskComplete', `Completed: ${target.title}`);
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
              name: 'Q4_Budget_Forecast_Draft.xlsx',
              mimeType: 'application/vnd.google-apps.spreadsheet',
            },
            {
              id: 'local-2',
              name: 'Offline_Sync_Architecture_Spec.gdoc',
              mimeType: 'application/vnd.google-apps.document',
            },
            {
              id: 'local-3',
              name: 'Weekly_Design_Deck_Gantt.gslides',
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
    fireHaptic('taskComplete', `Auto-linked ${attachedCount} Drive files`);
    showNotice(
      'ok',
      attachedCount > 0
        ? `Auto-attached ${attachedCount} relevant document(s) to matching tasks.`
        : 'All matching documents are already attached to your tasks.'
    );
  };

  const handleCreateSpreadsheet = () => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Sign in with Google first to create a Google Sheet.');
      return;
    }
    setPendingConfirmation({
      title: 'Create Google Sheet Ledger?',
      description:
        'This will create a new "Cadence Finance & Shopping Ledger" spreadsheet in your Google Drive with Expenses, Budget, and Shopping tabs.',
      confirmLabel: 'Create Spreadsheet',
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
          fireHaptic('taskComplete', 'Google Sheet created & synced');
          showNotice('ok', 'Created and populated "Cadence Finance & Shopping Ledger" in Google Sheets.');
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
      title: 'Update Google Sheets Ledger?',
      description: `Overwrite cells in "${workspace.preferences.linkedSpreadsheetName || 'Cadence Finance & Shopping Ledger'}" with your latest local expenses (${workspace.expenses.length} rows), monthly budget, and shopping list (${workspace.shoppingList.length} items)?`,
      affectedItems: [
        `${workspace.expenses.length} Expense rows`,
        `Monthly budget limits (${workspace.budget.month})`,
        `${workspace.shoppingList.length} Shopping list items`,
      ],
      confirmLabel: 'Sync to Google Sheets',
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
          fireHaptic('taskComplete', 'Synced to Google Sheets');
          showNotice('ok', 'Updated Google Sheets ledger successfully.');
        } finally {
          setSyncingSheets(false);
        }
      },
    });
  };

  const handleRefreshDriveFiles = async (query?: string) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Sign in with Google first to browse Google Drive files.');
      return;
    }
    setLoadingDrive(true);
    try {
      const files = await listDriveFiles(token, query);
      setDriveFiles(files);
      showNotice('ok', `Loaded ${files.length} files from Google Drive.`);
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Failed to list Drive files.');
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleCreateDriveDoc = (title: string, content: string) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Sign in with Google first to create Drive documents.');
      return;
    }
    setPendingConfirmation({
      title: 'Create Collaborative Document in Google Drive?',
      description: `This will create "${title}" as a Google Doc in your Google Drive.`,
      confirmLabel: 'Create Google Doc',
      onConfirm: async () => {
        const created = await createCollaborativeDriveDoc(token, title, content);
        setDriveFiles((prev) => [created, ...prev]);
        fireHaptic('taskComplete', 'Google Doc created');
        showNotice('ok', `Created "${created.name}" in Google Drive.`);
      },
    });
  };

  const handleReadDriveDoc = async (file: DriveFileRecord) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Sign in with Google first to read Drive documents.');
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
        err instanceof Error ? err.message : 'Unable to read this file as text.'
      );
      setActiveDriveDocContent('');
    } finally {
      setLoadingDocContent(false);
    }
  };

  const handleSaveDriveDocContent = (file: DriveFileRecord, content: string) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Sign in with Google first to save changes to Drive.');
      return;
    }
    setPendingConfirmation({
      title: 'Save Changes to Google Drive Document?',
      description: `Update the contents of "${file.name}" in Google Drive with your edited text?`,
      confirmLabel: 'Save Document',
      onConfirm: async () => {
        const updated = await updateDriveDocumentContent(token, file.id, content);
        setActiveDriveDoc(updated);
        setActiveDriveDocContent(content);
        setDriveFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        fireHaptic('taskComplete', `Saved ${file.name}`);
        showNotice('ok', `Updated "${file.name}" in Google Drive.`);
      },
    });
  };

  const handleRefreshSpreadsheets = async () => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Sign in with Google first to list your Google Sheets.');
      return;
    }
    setLoadingSheetGrid(true);
    try {
      const sheets = await listGoogleSpreadsheets(token);
      setSpreadsheets(sheets);
      showNotice('ok', `Found ${sheets.length} Google Spreadsheets.`);
    } catch (err) {
      showNotice('err', err instanceof Error ? err.message : 'Failed to list spreadsheets.');
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
      showNotice('err', err instanceof Error ? err.message : 'Failed to read sheet range.');
    } finally {
      setLoadingSheetGrid(false);
    }
  };

  const handleSelectSpreadsheet = async (spreadsheetId: string, title?: string) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      showNotice('err', 'Sign in with Google first to read spreadsheets.');
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
      showNotice('err', err instanceof Error ? err.message : 'Failed to open spreadsheet.');
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
      title: 'Write Changes to Google Sheet?',
      description: `Update ${values.length} row(s) in tab "${tabName}" of your Google Spreadsheet?`,
      affectedItems: [`Tab: ${tabName}`, `${values.length} rows`],
      confirmLabel: 'Write to Sheet',
      onConfirm: async () => {
        setSyncingSheets(true);
        try {
          await writeSheetRange(token, spreadsheetId, `${tabName}!A1`, values);
          setSheetGrid(values);
          fireHaptic('taskComplete', 'Google Sheet updated');
          showNotice('ok', `Updated "${tabName}" in Google Sheets.`);
        } finally {
          setSyncingSheets(false);
        }
      },
    });
  };

  const handleUploadEncryptedDrive = async (passphrase: string) => {
    const token = getWorkspaceAccessToken();
    if (!token) {
      throw new Error('Sign in with Google first to sync encrypted backups to Drive.');
    }
    return new Promise<void>((resolve, reject) => {
      setPendingConfirmation({
        title: 'Sync Encrypted Vault to Google Drive?',
        description:
          'This will encrypt your workspace with AES-256-GCM and update your private vault file in Google Drive AppData.',
        confirmLabel: 'Encrypt & Upload',
        onConfirm: async () => {
          try {
            await uploadEncryptedVaultToDrive(token, workspace, passphrase);
            fireHaptic('taskComplete', 'Encrypted Drive sync complete');
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
      throw new Error('Sign in with Google first to restore from Drive.');
    }
    const restored = await downloadEncryptedVaultFromDrive(token, passphrase);
    setWorkspace(restored);
    fireHaptic('taskComplete', 'Encrypted vault restored');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              Cadence
            </span>
          </div>

          <nav className="space-y-1" aria-label="Primary Workspace Navigation">
            {NAV_ITEMS.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
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
              {user && hasGoogleToken ? 'Drive Encrypted Sync' : 'Local-First Vault'}
            </span>
            <span className="text-[11px] text-slate-400">Settings</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
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
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
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
              Sync &amp; Encryption
            </button>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-sm px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
              {NAV_ITEMS.find((n) => n.id === section)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
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
              aria-label="Toggle dark mode"
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
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Encrypted Sync
            </button>

            {user && hasGoogleToken ? (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="rounded-lg bg-emerald-600/15 border border-emerald-600/30 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 whitespace-nowrap cursor-pointer"
              >
                {user.displayName?.split(' ')[0] || 'Google Connected'}
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

        {/* Main Workspace Container */}
        <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          <VoiceAssistantBar
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
              pomodoroTrigger={pomodoroTrigger}
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
                  fireHaptic('taskComplete', `Reminder completed: ${target.title}`);
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
                  fireHaptic('taskComplete', `Checked off ${target.name}`);
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
                fireHaptic('waterLog', `Logged +${ml}ml water`);
              }}
              onLogSteps={(steps) => {
                mutateTodayHealth((h) => ({
                  ...h,
                  steps: h.steps + steps,
                  kcalBurned: h.kcalBurned + Math.round(steps * 0.04),
                }));
                fireHaptic('waterLog', `Logged +${steps.toLocaleString()} steps`);
              }}
              onPomodoroComplete={(mode, minutes, taskId) => {
                const linkedTask = workspace.tasks.find((t) => t.id === taskId);
                setWorkspace((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    pomodoroLogs: [
                      {
                        id: `pom-${Date.now()}`,
                        taskId,
                        taskTitle: linkedTask?.title,
                        minutes,
                        mode,
                        completedAt: new Date().toISOString(),
                      },
                      ...prev.pomodoroLogs,
                    ],
                    tasks:
                      mode === 'focus' && taskId
                        ? prev.tasks.map((t) =>
                            t.id === taskId
                              ? { ...t, pomodoroSessions: t.pomodoroSessions + 1 }
                              : t
                          )
                        : prev.tasks,
                  };
                });
                fireHaptic(
                  'pomodoroComplete',
                  mode === 'focus'
                    ? `Deep work complete (${minutes}m)`
                    : 'Break complete — ready for focus'
                );
              }}
              onUpdatePomodoroDurations={(focusMin, shortMin, longMin) => {
                setWorkspace((prev) =>
                  prev
                    ? {
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          pomodoroFocusMin: focusMin,
                          pomodoroShortBreakMin: shortMin,
                          pomodoroLongBreakMin: longMin,
                        },
                      }
                    : prev
                );
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
                fireHaptic('taskComplete', `Event scheduled: ${ev.title}`);
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
                fireHaptic('tap', 'Reminder saved');
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
                  fireHaptic('taskComplete', `Reminder done: ${target.title}`);
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
                fireHaptic('taskComplete', `Created project: ${proj.name}`);
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
                fireHaptic('taskComplete', `Created task: ${t.title}`);
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
                fireHaptic('taskComplete', `Expense logged: $${exp.amount.toFixed(2)}`);
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
                  fireHaptic('taskComplete', `Checked ${target.name}`);
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
                            description: `Shopping Run (${checked.length} items)`,
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
                fireHaptic('taskComplete', `Logged $${total.toFixed(2)} shopping run`);
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
                fireHaptic('taskComplete', 'Note saved');
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
                fireHaptic('tap', 'Note updated');
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
                fireHaptic('taskComplete', `Imported ${imported.length} Keep notes`);
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
                fireHaptic('taskComplete', `Attached ${file.name}`);
                showNotice('ok', `Attached "${file.name}" to "${task.title}".`);
              }}
            />
          )}

          {section === 'fitness' && (
            <FitnessHealthView
              healthLogs={workspace.healthLogs}
              autoCalendarWorkoutSync={workspace.preferences.autoCalendarWorkoutSync}
              onLogWater={(ml) => {
                mutateTodayHealth((h) => ({ ...h, waterMl: h.waterMl + ml }));
                fireHaptic('waterLog', `Hydrated +${ml}ml`);
              }}
              onLogSteps={(steps) => {
                mutateTodayHealth((h) => ({
                  ...h,
                  steps: h.steps + steps,
                  kcalBurned: h.kcalBurned + Math.round(steps * 0.04),
                }));
                fireHaptic('waterLog', `+${steps.toLocaleString()} steps`);
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
                              title: `Workout: ${w.type} (${w.kcal} kcal)`,
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
                fireHaptic('taskComplete', `Logged ${w.type} workout`);
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
                fireHaptic('taskComplete', 'Imported Health metrics');
              }}
            />
          )}
        </main>
      </div>

      {/* Tactile Haptic Visual Feedback Toast */}
      {hapticBanner && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-slate-900 dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-white shadow-xl"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-haptic-ripple" />
          <span>{hapticBanner}</span>
        </div>
      )}

      <OfflineIndicator />

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
          fireHaptic('taskComplete', 'Restored encrypted workspace');
        }}
        onUpdatePreferences={(patch) =>
          setWorkspace((prev) =>
            prev
              ? { ...prev, preferences: { ...prev.preferences, ...patch } }
              : prev
          )
        }
        onTestHaptic={() => fireHaptic('taskComplete', 'Tactile haptic pulse triggered')}
        onResetWorkspace={() => {
          setPendingConfirmation({
            title: 'Reset Local Workspace?',
            description:
              'This will restore all local tasks, events, notes, finances, and health logs back to initial defaults. Export a .cadence backup first if you want to keep your changes.',
            confirmLabel: 'Reset Local Data',
            isDestructive: true,
            onConfirm: async () => {
              const fresh = createSeedWorkspaceData();
              setWorkspace(fresh);
              setSettingsOpen(false);
              showNotice('ok', 'Local workspace reset to clean defaults.');
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
