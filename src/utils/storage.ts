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
      name: 'Q4 Operations & Budget',
      description: 'Quarterly financial close, spreadsheets, and vendor audits.',
      color: 'blue',
      targetDate: formatDateOffset(14),
    },
    {
      id: 'prj-product',
      name: 'Workspace Sync & Docs',
      description: 'Offline workflow specs, Drive documentation, and sprint delivery.',
      color: 'emerald',
      targetDate: formatDateOffset(10),
    },
    {
      id: 'prj-personal',
      name: 'Personal & Health',
      description: 'Appointments, routines, and household organization.',
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
    version: 2,
    projects,
    events: [
      {
        id: 'ev-1',
        title: 'Product Roadmap & Sprint Alignment',
        date: today,
        startTime: '09:30',
        endTime: '10:30',
        location: 'Studio Room B',
        description: 'Finalize Q4 deliverables and timeline dependencies.',
        category: 'work',
        reminderMinutes: 15,
      },
      {
        id: 'ev-2',
        title: 'Deep Work: Architecture Spec',
        date: today,
        startTime: '11:00',
        endTime: '12:30',
        description: 'Uninterrupted focus block paired with Pomodoro.',
        category: 'focus',
        reminderMinutes: 10,
      },
      {
        id: 'ev-3',
        title: 'Strength & Mobility Session',
        date: today,
        startTime: '17:30',
        endTime: '18:15',
        location: 'Local Gym',
        category: 'health',
        reminderMinutes: 20,
      },
      {
        id: 'ev-4',
        title: 'Monthly Budget Reconciliation',
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
        title: 'Review Q4 budget variance before afternoon check-in',
        date: today,
        time: '13:15',
        completed: false,
        repeat: 'none',
      },
      {
        id: 'rem-2',
        title: 'Hydrate 500ml & stretch posture break',
        date: today,
        time: '15:00',
        completed: false,
        repeat: 'daily',
      },
      {
        id: 'rem-3',
        title: 'Pick up organic groceries & espresso beans',
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
        title: 'Finalize Q4 Budget & Expense Forecast',
        notes: 'Cross-check recurring subscriptions and utility projections in Sheets.',
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
        title: 'Ship Mobile Offline Sync Documentation',
        notes: 'Update architecture diagrams and encrypted payload schema.',
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
        title: 'Prepare Weekly Project Design Deck',
        notes: 'Include updated Gantt milestones and sprint velocity metrics.',
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
        title: 'Confirm Dentist Appointment Reschedule',
        notes: 'Call front desk for morning slot next Tuesday.',
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
        title: 'Archive Completed October Receipts',
        notes: 'Move scanned PDFs into Drive Archive folder.',
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
      { id: 'shp-1', name: 'Oat Milk (Barista Edition)', category: 'Produce', quantity: '2 cartons', estimatedPrice: 8.5, checked: false },
      { id: 'shp-2', name: 'Whole Bean Espresso Roast', category: 'Pantry', quantity: '1 bag', estimatedPrice: 16.0, checked: false },
      { id: 'shp-3', name: 'Baby Spinach & Avocados', category: 'Produce', quantity: '1 pack', estimatedPrice: 7.25, checked: true },
      { id: 'shp-4', name: 'USB-C Braided Sync Cable', category: 'Tech', quantity: '1 unit', estimatedPrice: 14.99, checked: false },
      { id: 'shp-5', name: 'Sparkling Mineral Water', category: 'Pantry', quantity: '12 cans', estimatedPrice: 9.4, checked: false },
    ],
    expenses: [
      { id: 'exp-1', description: 'Whole Foods Weekly Groceries', amount: 84.6, category: 'Groceries', date: formatDateOffset(-3) },
      { id: 'exp-2', description: 'Metro Transit Pass Reload', amount: 42.0, category: 'Transit', date: formatDateOffset(-2) },
      { id: 'exp-3', description: 'Cloud Backup & Domain Renewal', amount: 24.0, category: 'Workspace', date: formatDateOffset(-2) },
      { id: 'exp-4', description: 'Pour-Over Coffee & Lunch', amount: 18.5, category: 'Dining', date: formatDateOffset(-1) },
      { id: 'exp-5', description: 'Electric & Fiber Utility Bill', amount: 112.4, category: 'Utilities', date: formatDateOffset(-1) },
      { id: 'exp-6', description: 'Gym Recovery Electrolytes', amount: 19.75, category: 'Wellness', date: today },
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
        title: 'Weekly Deep Work Protocol',
        body: 'Batch meetings before noon. Protect 90-minute Pomodoro blocks for architecture & budget planning.',
        checklist: [
          { id: 'cl-1', text: 'Silence non-urgent notifications during Q1 focus', done: true },
          { id: 'cl-2', text: 'Attach Drive spec files before sprint handoff', done: false },
        ],
        pinned: true,
        tint: 'blue',
        tags: ['Focus', 'Workflow'],
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'nt-2',
        title: 'Weekend Farmers Market Ideas',
        body: 'Pick up seasonal squash, sourdough loaf, and fresh basil for Sunday meal prep.',
        checklist: [],
        pinned: false,
        tint: 'emerald',
        tags: ['Meal Prep', 'Shopping'],
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'nt-3',
        title: 'Encrypted Vault Recovery Checklist',
        body: 'Store AES-256 sync passphrase safely. Export periodic `.cadence` backup.',
        checklist: [],
        pinned: false,
        tint: 'slate',
        tags: ['Security', 'Drive'],
        updatedAt: new Date().toISOString(),
      },
    ],
    healthLogs,
    pomodoroLogs: [
      {
        id: 'pom-1',
        taskId: 'tsk-1',
        taskTitle: 'Finalize Q4 Budget & Expense Forecast',
        minutes: 25,
        completedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        mode: 'focus',
      },
    ],
    preferences: {
      theme: 'dark',
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
    version: 2,
    projects,
    healthLogs,
  };
}
