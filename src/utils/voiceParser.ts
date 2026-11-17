import { getTodayISO } from './storage';
import type {
  CalendarEvent,
  EisenhowerQuadrant,
  ExpenseItem,
  TaskPriority,
} from '../types/workspace';

export type ParsedVoiceIntent =
  | {
      type: 'event';
      title: string;
      date: string;
      startTime: string;
      endTime: string;
      category: CalendarEvent['category'];
    }
  | {
      type: 'reminder';
      title: string;
      date: string;
      time: string;
    }
  | {
      type: 'task';
      title: string;
      quadrant: EisenhowerQuadrant;
      priority: TaskPriority;
      dueDate: string;
    }
  | {
      type: 'expense';
      description: string;
      amount: number;
      category: ExpenseItem['category'];
      date: string;
    }
  | {
      type: 'shopping';
      items: string[];
    }
  | {
      type: 'water';
      ml: number;
    }
  | {
      type: 'steps';
      steps: number;
    }
  | {
      type: 'pomodoro';
      mode: 'focus' | 'short_break' | 'long_break';
      minutes?: number;
    }
  | {
      type: 'note';
      title: string;
      body: string;
    }
  | {
      type: 'unknown';
      raw: string;
    };

function addDaysISO(baseISO: string, days: number): string {
  const [y, m, d] = baseISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`;
}

function parseDateFromText(text: string): { date: string; cleaned: string } {
  const today = getTodayISO();
  const lower = text.toLowerCase();

  if (/\btomorrow\b/.test(lower)) {
    return {
      date: addDaysISO(today, 1),
      cleaned: text.replace(/\btomorrow\b/i, '').trim(),
    };
  }
  if (/\btoday\b/.test(lower)) {
    return {
      date: today,
      cleaned: text.replace(/\btoday\b/i, '').trim(),
    };
  }

  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < weekdays.length; i++) {
    const regex = new RegExp(`\\b(?:next\\s+|on\\s+)?${weekdays[i]}\\b`, 'i');
    if (regex.test(text)) {
      const now = new Date();
      let diff = (i - now.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      return {
        date: addDaysISO(today, diff),
        cleaned: text.replace(regex, '').trim(),
      };
    }
  }

  return { date: today, cleaned: text };
}

function parseTimeFromText(text: string): { time: string | null; cleaned: string } {
  const match = text.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!match) return { time: null, cleaned: text };

  // Avoid matching plain dollar/step numbers unless "at" or am/pm or colon is present
  const hasExplicitIndicator = Boolean(match[2] || match[3] || /\bat\b/i.test(match[0]));
  if (!hasExplicitIndicator) return { time: null, cleaned: text };

  let hours = parseInt(match[1], 10);
  const mins = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3]?.toLowerCase();

  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  if (hours > 23 || mins > 59) return { time: null, cleaned: text };

  const formatted = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  const cleaned = text.replace(match[0], '').replace(/\s{2,}/g, ' ').trim();
  return { time: formatted, cleaned };
}

function addOneHour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const nextH = (h + 1) % 24;
  return `${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseVoiceCommand(rawInput: string): ParsedVoiceIntent {
  const raw = rawInput.trim();
  if (!raw) return { type: 'unknown', raw };
  const lower = raw.toLowerCase();

  // 1. Water intake
  const waterMatch = lower.match(/(\d+(?:\.\d+)?)\s*(ml|l|liter|liters|glass|glasses|cup|cups)\b.*water|water.*(\d+(?:\.\d+)?)\s*(ml|l|glass|glasses|cup|cups)/i);
  if (waterMatch || /\b(drink|drank|log|add)\s+water\b/i.test(lower)) {
    const numMatch = lower.match(/(\d+(?:\.\d+)?)\s*(ml|l|liter|liters|glass|glasses|cup|cups)?/i);
    let ml = 250;
    if (numMatch) {
      const val = parseFloat(numMatch[1]);
      const unit = (numMatch[2] || '').toLowerCase();
      if (unit.startsWith('l')) ml = Math.round(val * 1000);
      else if (unit.startsWith('glass') || unit.startsWith('cup')) ml = Math.round(val * 250);
      else if (val > 0 && val <= 10) ml = Math.round(val * 250);
      else if (val > 10) ml = Math.round(val);
    }
    return { type: 'water', ml };
  }

  // 2. Steps
  if (/\bsteps?\b/i.test(lower)) {
    const stepNum = lower.match(/(\d[\d,]*)/);
    const steps = stepNum ? parseInt(stepNum[1].replace(/,/g, ''), 10) : 1000;
    return { type: 'steps', steps: Number.isFinite(steps) && steps > 0 ? steps : 1000 };
  }

  // 3. Pomodoro
  if (/\b(pomodoro|focus session|deep work|timer|break)\b/i.test(lower)) {
    if (/\blong break\b/i.test(lower)) return { type: 'pomodoro', mode: 'long_break' };
    if (/\b(short break|take a break|break)\b/i.test(lower)) return { type: 'pomodoro', mode: 'short_break' };
    const minMatch = lower.match(/(\d+)\s*(?:min|minute|minutes)/);
    return {
      type: 'pomodoro',
      mode: 'focus',
      minutes: minMatch ? parseInt(minMatch[1], 10) : undefined,
    };
  }

  // 4. Shopping list
  if (/\b(shopping|grocery|groceries|buy)\b/i.test(lower) && !/\bspent\b|\bexpense\b|\$\d+/.test(lower)) {
    const stripped = raw
      .replace(/^(add|put|buy|need to buy)\s+/i, '')
      .replace(/\s+(to|on)\s+(my\s+)?(shopping|grocery)\s*(list)?$/i, '')
      .trim();
    const items = stripped
      .split(/,|\band\b/i)
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length > 0) {
      return { type: 'shopping', items };
    }
  }

  // 5. Expenses
  if (/\b(expense|spent|paid|cost|budget)\b|\$\d+/i.test(lower)) {
    const amtMatch = raw.match(/\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:dollars|usd|eur|€)?/i);
    if (amtMatch) {
      const amount = parseFloat(amtMatch[1]);
      let category: ExpenseItem['category'] = 'Workspace';
      if (/grocery|groceries|market|milk|bread|fruit/i.test(lower)) category = 'Groceries';
      else if (/coffee|lunch|dinner|breakfast|cafe|restaurant|food/i.test(lower)) category = 'Dining';
      else if (/uber|lyft|train|bus|metro|gas|fuel|parking|transit/i.test(lower)) category = 'Transit';
      else if (/electric|water bill|internet|fiber|utility|utilities|rent/i.test(lower)) category = 'Utilities';
      else if (/gym|yoga|pharmacy|health|supplement/i.test(lower)) category = 'Wellness';

      const desc = raw
        .replace(/^(log|add|record|i)?\s*(an?\s+)?(expense|spent|paid)\s*/i, '')
        .replace(amtMatch[0], '')
        .replace(/^\s*(for|on)\s+/i, '')
        .trim();

      return {
        type: 'expense',
        description: desc || `${category} Expense`,
        amount,
        category,
        date: getTodayISO(),
      };
    }
  }

  // 6. Reminders
  if (/^(remind me|set a? ?reminder|reminder)\b/i.test(lower)) {
    const withoutPrefix = raw
      .replace(/^(remind me to|remind me|set a? ?reminder to|set a? ?reminder|reminder:?)\s*/i, '')
      .trim();
    const { date, cleaned: afterDate } = parseDateFromText(withoutPrefix);
    const { time, cleaned: afterTime } = parseTimeFromText(afterDate);
    return {
      type: 'reminder',
      title: afterTime || withoutPrefix || 'Daily Reminder',
      date,
      time: time || '17:00',
    };
  }

  // 7. Calendar events
  if (/^(schedule|book|calendar|add meeting|add event|meeting|event)\b/i.test(lower)) {
    const withoutPrefix = raw
      .replace(/^(schedule|book|create|add)\s+(a\s+|an\s+)?(calendar\s+)?(event|meeting|appointment)?\s*(for|called|titled)?\s*/i, '')
      .trim();
    const { date, cleaned: afterDate } = parseDateFromText(withoutPrefix);
    const { time, cleaned: afterTime } = parseTimeFromText(afterDate);
    const startTime = time || '10:00';
    let category: CalendarEvent['category'] = 'work';
    if (/gym|run|workout|dentist|doctor|yoga|health/i.test(lower)) category = 'health';
    else if (/focus|deep work|study/i.test(lower)) category = 'focus';
    else if (/dinner|family|friend|personal|birthday/i.test(lower)) category = 'personal';

    return {
      type: 'event',
      title: afterTime.replace(/\b(for|to|with)\s*$/i, '').trim() || 'Scheduled Event',
      date,
      startTime,
      endTime: addOneHour(startTime),
      category,
    };
  }

  // 8. Notes
  if (/^(note|take a note|jot down|keep note)\b/i.test(lower)) {
    const body = raw.replace(/^(note|take a note|jot down|keep note):?\s*/i, '').trim();
    const words = body.split(/\s+/);
    const title = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
    return {
      type: 'note',
      title: title || 'Quick Voice Note',
      body: body || raw,
    };
  }

  // 9. Tasks (explicit or fallback if it contains task/urgent/priority/finish/complete)
  if (/^(add|create|new)?\s*(urgent|important|high priority|low priority)?\s*task\b/i.test(lower)) {
    const { date, cleaned: afterDate } = parseDateFromText(raw);
    const isUrgent = /\b(urgent|asap|critical|now|today)\b/i.test(lower);
    const isImportant = /\b(important|critical|high|key|budget|client|project)\b/i.test(lower);
    let quadrant: EisenhowerQuadrant = 'Q2';
    let priority: TaskPriority = 'medium';
    if (isUrgent && isImportant) {
      quadrant = 'Q1';
      priority = 'critical';
    } else if (!isUrgent && isImportant) {
      quadrant = 'Q2';
      priority = 'high';
    } else if (isUrgent && !isImportant) {
      quadrant = 'Q3';
      priority = 'medium';
    } else if (/\blow priority\b/i.test(lower)) {
      quadrant = 'Q4';
      priority = 'low';
    }

    const title = afterDate
      .replace(/^(add|create|new)?\s*(urgent|important|high priority|low priority)?\s*task:?\s*/i, '')
      .replace(/\bby\s*$/i, '')
      .trim();

    return {
      type: 'task',
      title: title || 'New Workspace Task',
      quadrant,
      priority,
      dueDate: date,
    };
  }

  // Smart fallback: if there's an explicit time, treat as reminder; otherwise as task if short actionable phrase
  const { date, cleaned: afterDate } = parseDateFromText(raw);
  const { time, cleaned: afterTime } = parseTimeFromText(afterDate);
  if (time) {
    return {
      type: 'reminder',
      title: afterTime || raw,
      date,
      time,
    };
  }

  return { type: 'unknown', raw };
}
