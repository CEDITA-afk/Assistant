export type ThemeMode = 'dark' | 'light';

export type NavSection =
  | 'overview'
  | 'schedule'
  | 'projects'
  | 'finance'
  | 'notes'
  | 'fitness';

export type EisenhowerQuadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type KanbanColumn = 'backlog' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface DriveAttachment {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
  autoMatched?: boolean;
  source: 'drive' | 'local';
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: 'blue' | 'emerald' | 'amber' | 'slate';
  targetDate: string; // YYYY-MM-DD
}

export interface TaskItem {
  id: string;
  projectId?: string;
  title: string;
  notes?: string;
  quadrant: EisenhowerQuadrant;
  kanbanStatus: KanbanColumn;
  priority: TaskPriority;
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  progress: number; // 0 - 100
  pomodoroSessions: number;
  attachments: DriveAttachment[];
  googleTaskId?: string;
  googleTaskListId?: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location?: string;
  description?: string;
  category: 'work' | 'personal' | 'health' | 'focus';
  reminderMinutes: number;
  googleEventId?: string;
  pendingSync?: boolean;
}

export interface ReminderItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  completed: boolean;
  repeat: 'none' | 'daily' | 'weekly';
  calendarSynced?: boolean;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: 'Produce' | 'Pantry' | 'Household' | 'Tech' | 'Other';
  quantity: string;
  estimatedPrice: number;
  checked: boolean;
}

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  category: 'Groceries' | 'Dining' | 'Utilities' | 'Transit' | 'Wellness' | 'Workspace';
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface MonthlyBudget {
  month: string; // YYYY-MM
  totalLimit: number;
  categoryLimits: Record<ExpenseItem['category'], number>;
}

export interface ChecklistLine {
  id: string;
  text: string;
  done: boolean;
}

export interface KeepNote {
  id: string;
  title: string;
  body: string;
  checklist: ChecklistLine[];
  pinned: boolean;
  tint: 'default' | 'slate' | 'blue' | 'emerald' | 'amber';
  tags: string[];
  updatedAt: string;
}

export interface WorkoutEntry {
  id: string;
  type: 'Running' | 'Strength' | 'Cycling' | 'Walking' | 'Yoga';
  durationMin: number;
  kcal: number;
  time: string;
  syncedToCalendar?: boolean;
}

export interface HealthDayLog {
  date: string; // YYYY-MM-DD
  steps: number;
  stepGoal: number;
  kcalBurned: number;
  kcalGoal: number;
  waterMl: number;
  waterGoalMl: number;
  workouts: WorkoutEntry[];
}

export interface PomodoroSessionLog {
  id: string;
  taskId?: string;
  taskTitle?: string;
  minutes: number;
  completedAt: string;
  mode: 'focus' | 'short_break' | 'long_break';
}

export interface WorkspacePreferences {
  theme: ThemeMode;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  autoCalendarWorkoutSync: boolean;
  autoCalendarPomodoroSync: boolean;
  linkedSpreadsheetId?: string;
  linkedSpreadsheetName?: string;
  pomodoroFocusMin: number;
  pomodoroShortBreakMin: number;
  pomodoroLongBreakMin: number;
}

export interface WorkspaceData {
  version: number;
  projects: Project[];
  events: CalendarEvent[];
  reminders: ReminderItem[];
  tasks: TaskItem[];
  shoppingList: ShoppingItem[];
  expenses: ExpenseItem[];
  budget: MonthlyBudget;
  notes: KeepNote[];
  healthLogs: HealthDayLog[];
  pomodoroLogs: PomodoroSessionLog[];
  preferences: WorkspacePreferences;
  lastModified: string;
}

export interface PendingConfirmation {
  title: string;
  description: string;
  affectedItems?: string[];
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: () => Promise<void>;
}
