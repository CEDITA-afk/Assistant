import type { HealthDayLog, Project, WorkspaceData } from '../types/workspace';

const STORAGE_KEY = 'cadence_workspace_v1';

function formatDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayISO(): string {
  return formatDateOffset(0);
}

export function getCurrentMonthISO(): string {
  return getTodayISO().slice(0, 7);
}

export function createSeedWorkspaceData(): WorkspaceData {
  const today = getTodayISO();
  const currentMonth = getCurrentMonthISO();

  const projects: Project[] = [
    {
      id: 'prj-q4',
      name: 'Operazioni & Budget Q4',
      description: 'Chiusura trimestrale, fogli di calcolo e controllo fornitori.',
      color: 'blue',
      targetDate: formatDateOffset(14),
    },
    {
      id: 'prj-product',
      name: 'Sync Workspace & Documenti',
      description: 'Specifiche workflow offline, documentazione Drive e sprint.',
      color: 'emerald',
      targetDate: formatDateOffset(10),
    },
    {
      id: 'prj-personal',
      name: 'Personale & Salute',
      description: 'Appuntamenti, routine quotidiane e organizzazione casa.',
      color: 'amber',
      targetDate: formatDateOffset(7),
    },
  ];

  const healthLogs: HealthDayLog[] = [
    { date: formatDateOffset(-6), steps: 8420, stepGoal: 10000, kcalBurned: 490, kcalGoal: 600, waterMl: 2100, waterGoalMl: 2500, workouts: [] },
    { date: formatDateOffset(-5), steps: 10640, stepGoal: 10000, kcalBurned: 640, kcalGoal: 600, waterMl: 2600, waterGoalMl: 2500, workouts: [] },
    { date: formatDateOffset(-4), steps: 7190, stepGoal: 10000, kcalBurned: 410, kcalGoal: 600, waterMl: 1850, waterGoalMl: 2500, workouts: [] },
    { date: formatDateOffset(-3), steps: 11280, stepGoal: 10000, kcalBurned: 695, kcalGoal: 600, waterMl: 2500, waterGoalMl: 2500, workouts: [] },
    { date: formatDateOffset(-2), steps: 9350, stepGoal: 10000, kcalBurned: 540, kcalGoal: 600, waterMl: 2250, waterGoalMl: 2500, workouts: [] },
    { date: formatDateOffset(-1), steps: 10120, stepGoal: 10000, kcalBurned: 615, kcalGoal: 600, waterMl: 2400, waterGoalMl: 2500, workouts: [] },
    {
      date: today,
      steps: 6840,
      stepGoal: 10000,
      kcalBurned: 425,
      kcalGoal: 600,
      waterMl: 1500,
      waterGoalMl: 2500,
      workouts: [
        {
          id: 'wk-1',
          type: 'Running',
          durationMin: 32,
          kcal: 315,
          time: '07:15',
          syncedToCalendar: false,
        },
      ],
    },
  ];

  return {
    version: 3,
    projects,
    events: [
      {
        id: 'ev-1',
        title: 'Allineamento Roadmap & Sprint',
        date: today,
        startTime: '09:30',
        endTime: '10:30',
        location: 'Sala Studio B',
        description: 'Definire deliverable Q4 e dipendenze della timeline.',
        category: 'work',
        reminderMinutes: 15,
      },
      {
        id: 'ev-2',
        title: 'Deep Work: Specifica Architettura',
        date: today,
        startTime: '11:00',
        endTime: '12:30',
        description: 'Blocco di lavoro profondo abbinato al timer Pomodoro.',
        category: 'focus',
        reminderMinutes: 10,
      },
      {
        id: 'ev-3',
        title: 'Sessione Forza & Mobilità',
        date: today,
        startTime: '17:30',
        endTime: '18:15',
        location: 'Palestra',
        category: 'health',
        reminderMinutes: 20,
      },
      {
        id: 'ev-4',
        title: 'Verifica Budget Mensile',
        date: formatDateOffset(1),
        startTime: '14:00',
        endTime: '14:45',
        category: 'personal',
        reminderMinutes: 15,
      },
    ],
    reminders: [
      {
        id: 'rem-1',
        title: 'Controllare scostamenti budget Q4 prima della call pomeridiana',
        date: today,
        time: '13:15',
        completed: false,
        repeat: 'none',
      },
      {
        id: 'rem-2',
        title: 'Bere 500ml d’acqua e fare pausa stretching',
        date: today,
        time: '15:00',
        completed: false,
        repeat: 'daily',
      },
      {
        id: 'rem-3',
        title: 'Passare a prendere spesa fresca e caffè in grani',
        date: today,
        time: '18:30',
        completed: false,
        repeat: 'none',
      },
    ],
    tasks: [
      {
        id: 'tsk-1',
        projectId: 'prj-q4',
        title: 'Finalizzare Budget & Previsione Spese Q4',
        notes: 'Verificare abbonamenti ricorrenti e stime utenze su Google Fogli.',
        quadrant: 'Q1',
        kanbanStatus: 'in_progress',
        priority: 'critical',
        startDate: formatDateOffset(-1),
        dueDate: today,
        progress: 65,
        pomodoroSessions: 3,
        attachments: [
          {
            id: 'loc-doc-1',
            name: 'Q4_Budget_Forecast_Draft.xlsx',
            mimeType: 'application/vnd.google-apps.spreadsheet',
            autoMatched: true,
            source: 'local',
          },
        ],
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tsk-2',
        projectId: 'prj-product',
        title: 'Pubblicare Documentazione Sync Mobile Offline',
        notes: 'Aggiornare diagrammi e schema payload cifrato.',
        quadrant: 'Q2',
        kanbanStatus: 'review',
        priority: 'high',
        startDate: formatDateOffset(-2),
        dueDate: formatDateOffset(2),
        progress: 85,
        pomodoroSessions: 4,
        attachments: [],
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tsk-3',
        projectId: 'prj-product',
        title: 'Preparare Presentazione Avanzamento Settimanale',
        notes: 'Includere milestone Gantt aggiornate e metriche di sprint.',
        quadrant: 'Q2',
        kanbanStatus: 'backlog',
        priority: 'medium',
        startDate: today,
        dueDate: formatDateOffset(4),
        progress: 20,
        pomodoroSessions: 1,
        attachments: [],
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tsk-4',
        projectId: 'prj-personal',
        title: 'Confermare Appuntamento Dentista',
        notes: 'Chiamare lo studio per fascia mattutina martedì prossimo.',
        quadrant: 'Q3',
        kanbanStatus: 'backlog',
        priority: 'medium',
        startDate: today,
        dueDate: formatDateOffset(1),
        progress: 0,
        pomodoroSessions: 0,
        attachments: [],
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tsk-5',
        projectId: 'prj-q4',
        title: 'Archiviare Ricevute Completate Mese Scorso',
        notes: 'Spostare i PDF scansionati nella cartella Archivio Drive.',
        quadrant: 'Q4',
        kanbanStatus: 'done',
        priority: 'low',
        startDate: formatDateOffset(-4),
        dueDate: formatDateOffset(-1),
        progress: 100,
        pomodoroSessions: 1,
        attachments: [],
        updatedAt: new Date().toISOString(),
      },
    ],
    shoppingList: [
      { id: 'shp-1', name: 'Bevanda d’Avena Barista', category: 'Produce', quantity: '2 cartoni', estimatedPrice: 6.5, checked: false },
      { id: 'shp-2', name: 'Caffè Espresso in Grani', category: 'Pantry', quantity: '1 pacco', estimatedPrice: 14.0, checked: false },
      { id: 'shp-3', name: 'Spinacini & Avocado', category: 'Produce', quantity: '1 conf.', estimatedPrice: 6.8, checked: true },
      { id: 'shp-4', name: 'Cavo USB-C Intrecciato', category: 'Tech', quantity: '1 pz', estimatedPrice: 12.99, checked: false },
      { id: 'shp-5', name: 'Acqua Minerale Frizzante', category: 'Pantry', quantity: '6 bott.', estimatedPrice: 4.5, checked: false },
    ],
    expenses: [
      { id: 'exp-1', description: 'Spesa Settimanale Supermercato', amount: 84.6, category: 'Groceries', date: formatDateOffset(-3) },
      { id: 'exp-2', description: 'Ricarica Abbonamento Metro', amount: 39.0, category: 'Transit', date: formatDateOffset(-2) },
      { id: 'exp-3', description: 'Backup Cloud & Rinnovo Dominio', amount: 22.0, category: 'Workspace', date: formatDateOffset(-2) },
      { id: 'exp-4', description: 'Caffè Specialty & Pranzo', amount: 16.5, category: 'Dining', date: formatDateOffset(-1) },
      { id: 'exp-5', description: 'Bolletta Luce & Fibra', amount: 108.4, category: 'Utilities', date: formatDateOffset(-1) },
      { id: 'exp-6', description: 'Integratori & Elettroliti Palestra', amount: 19.75, category: 'Wellness', date: today },
    ],
    budget: {
      month: currentMonth,
      totalLimit: 1850,
      categoryLimits: {
        Groceries: 450,
        Dining: 250,
        Utilities: 320,
        Transit: 180,
        Wellness: 250,
        Workspace: 400,
      },
    },
    notes: [
      {
        id: 'nt-1',
        title: 'Protocollo Settimanale Deep Work',
        body: 'Raggruppare le riunioni prima di mezzogiorno. Proteggere blocchi Pomodoro da 90 minuti per pianificazione e budget.',
        checklist: [
          { id: 'cl-1', text: 'Silenziare notifiche non urgenti durante il focus Q1', done: true },
          { id: 'cl-2', text: 'Allegare documenti Drive prima del passaggio sprint', done: false },
        ],
        pinned: true,
        tint: 'blue',
        tags: ['Focus', 'Workflow'],
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'nt-2',
        title: 'Idee Mercato Contadino Weekend',
        body: 'Prendere zucchine di stagione, pane a lievitazione naturale e basilico fresco per il meal prep della domenica.',
        checklist: [],
        pinned: false,
        tint: 'emerald',
        tags: ['Cucina', 'Spesa'],
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'nt-3',
        title: 'Checklist Recupero Vault Cifrato',
        body: 'Conservare al sicuro la passphrase AES-256. Esportare periodicamente un backup .cadence.',
        checklist: [],
        pinned: false,
        tint: 'slate',
        tags: ['Sicurezza', 'Drive'],
        updatedAt: new Date().toISOString(),
      },
    ],
    healthLogs,
    pomodoroLogs: [
      {
        id: 'pom-1',
        taskId: 'tsk-1',
        taskTitle: 'Finalizzare Budget & Previsione Spese Q4',
        minutes: 25,
        completedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        mode: 'focus',
      },
    ],
    preferences: {
      theme: 'dark',
      currency: 'EUR',
      voiceLang: 'it-IT',
      hapticsEnabled: true,
      soundEnabled: true,
      autoCalendarWorkoutSync: true,
      autoCalendarPomodoroSync: false,
      pomodoroFocusMin: 25,
      pomodoroShortBreakMin: 5,
      pomodoroLongBreakMin: 15,
    },
    lastModified: new Date().toISOString(),
  };
}

export async function loadWorkspaceData(): Promise<WorkspaceData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WorkspaceData;
      if (parsed && parsed.version) {
        return migrateAndEnsureWorkspace(parsed);
      }
    }
  } catch {
    // Fallback to seed data
  }

  const seed = createSeedWorkspaceData();
  await saveWorkspaceData(seed);
  return seed;
}

export async function saveWorkspaceData(data: WorkspaceData): Promise<void> {
  const stamped: WorkspaceData = {
    ...data,
    lastModified: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
  } catch {
    // Ignore storage quota errors
  }
}

function migrateAndEnsureWorkspace(data: WorkspaceData): WorkspaceData {
  const seed = createSeedWorkspaceData();
  const projects =
    Array.isArray(data.projects) && data.projects.length > 0
      ? data.projects
      : seed.projects;

  const today = getTodayISO();
  const hasToday = data.healthLogs.some((l) => l.date === today);
  const lastLog = data.healthLogs[data.healthLogs.length - 1];
  const healthLogs = hasToday
    ? data.healthLogs
    : [
        ...data.healthLogs.slice(-6),
        {
          date: today,
          steps: 0,
          stepGoal: lastLog?.stepGoal || 10000,
          kcalBurned: 0,
          kcalGoal: lastLog?.kcalGoal || 600,
          waterMl: 0,
          waterGoalMl: lastLog?.waterGoalMl || 2500,
          workouts: [],
        },
      ];

  return {
    ...data,
    version: 3,
    projects,
    healthLogs,
    preferences: {
      ...seed.preferences,
      ...data.preferences,
      currency: data.preferences?.currency || 'EUR',
      voiceLang: data.preferences?.voiceLang || 'it-IT',
    },
  };
}
