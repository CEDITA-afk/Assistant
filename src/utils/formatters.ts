import type {
  CalendarEvent,
  CurrencyCode,
  ExpenseItem,
  KanbanColumn,
  ReminderItem,
  ShoppingItem,
  TaskPriority,
  WorkoutEntry,
} from '../types/workspace';

export function getCurrencySymbol(currency: CurrencyCode = 'EUR'): string {
  return currency === 'USD' ? '$' : '€';
}

export function formatMoney(
  amount: number,
  currency: CurrencyCode = 'EUR',
  decimals = 2
): string {
  const sym = getCurrencySymbol(currency);
  const val = Number.isFinite(amount) ? amount : 0;
  return `${sym}${val.toFixed(decimals)}`;
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseItem['category'], string> = {
  Groceries: 'Alimentari',
  Dining: 'Ristoranti & Bar',
  Utilities: 'Utenze & Casa',
  Transit: 'Trasporti',
  Wellness: 'Salute & Sport',
  Workspace: 'Lavoro & Tech',
};

export const SHOP_CATEGORY_LABELS: Record<ShoppingItem['category'], string> = {
  Produce: 'Freschi',
  Pantry: 'Dispensa',
  Household: 'Casa',
  Tech: 'Tecnologia',
  Other: 'Altro',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  critical: 'Critica',
  high: 'Alta',
  medium: 'Media',
  low: 'Bassa',
};

export const KANBAN_LABELS: Record<KanbanColumn, string> = {
  backlog: 'Da Fare',
  in_progress: 'In Corso',
  review: 'Revisione',
  done: 'Completato',
};

export const EVENT_CATEGORY_LABELS: Record<CalendarEvent['category'], string> = {
  work: 'Lavoro',
  focus: 'Focus Profondo',
  health: 'Salute & Sport',
  personal: 'Personale',
};

export const REPEAT_LABELS: Record<ReminderItem['repeat'], string> = {
  none: 'Una volta',
  daily: 'Ogni giorno',
  weekly: 'Ogni settimana',
};

export const WORKOUT_LABELS: Record<WorkoutEntry['type'], string> = {
  Running: 'Corsa',
  Strength: 'Allenamento Forza',
  Cycling: 'Ciclismo',
  Walking: 'Camminata',
  Yoga: 'Yoga & Mobilità',
};

export function formatShortDateIT(isoDate: string): string {
  if (!isoDate || !isoDate.includes('-')) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}
