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

  if (/\b(dopodomani)\b/.test(lower)) {
    return {
      date: addDaysISO(today, 2),
      cleaned: text.replace(/\bdopodomani\b/i, '').trim(),
    };
  }
  if (/\b(tomorrow|domani)\b/.test(lower)) {
    return {
      date: addDaysISO(today, 1),
      cleaned: text.replace(/\b(tomorrow|domani)\b/i, '').trim(),
    };
  }
  if (/\b(today|oggi)\b/.test(lower)) {
    return {
      date: today,
      cleaned: text.replace(/\b(today|oggi)\b/i, '').trim(),
    };
  }

  const weekdayGroups: string[][] = [
    ['sunday', 'domenica'],
    ['monday', 'lunedì', 'lunedi'],
    ['tuesday', 'martedì', 'martedi'],
    ['wednesday', 'mercoledì', 'mercoledi'],
    ['thursday', 'giovedì', 'giovedi'],
    ['friday', 'venerdì', 'venerdi'],
    ['saturday', 'sabato'],
  ];

  for (let i = 0; i < weekdayGroups.length; i++) {
    const names = weekdayGroups[i].join('|');
    const regex = new RegExp(`(?:^|\\s)(?:next\\s+|on\\s+|il\\s+|di\\s+|prossimo\\s+)?(${names})(?:\\s|$)`, 'i');
    if (regex.test(text)) {
      const now = new Date();
      let diff = (i - now.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      return {
        date: addDaysISO(today, diff),
        cleaned: text.replace(regex, ' ').replace(/\s{2,}/g, ' ').trim(),
      };
    }
  }

  return { date: today, cleaned: text };
}

function parseTimeFromText(text: string): { time: string | null; cleaned: string } {
  const match = text.match(
    /\b(?:(?:at|alle|ore)\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\b/i
  );
  if (!match) return { time: null, cleaned: text };

  const hasExplicitIndicator = Boolean(
    match[2] || match[3] || /\b(?:at|alle|ore)\b/i.test(match[0])
  );
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

  // 1. Acqua / Water intake
  const waterMatch = lower.match(
    /(\d+(?:[.,]\d+)?)\s*(ml|l|litro|litri|liter|liters|bicchiere|bicchieri|glass|glasses|cup|cups)\b.*(?:acqua|water)|(?:acqua|water).*(\d+(?:[.,]\d+)?)\s*(ml|l|litro|litri|bicchiere|bicchieri|glass|glasses|cup|cups)/i
  );
  if (
    waterMatch ||
    /\b(bevi|bevuto|registra|aggiungi|drink|drank|log|add)\b.*\b(acqua|d'acqua|water)\b/i.test(
      lower
    )
  ) {
    const numMatch = lower.match(
      /(\d+(?:[.,]\d+)?)\s*(ml|l|litro|litri|liter|liters|bicchiere|bicchieri|glass|glasses|cup|cups)?/i
    );
    let ml = 250;
    if (numMatch) {
      const val = parseFloat(numMatch[1].replace(',', '.'));
      const unit = (numMatch[2] || '').toLowerCase();
      if (unit === 'l' || unit.startsWith('lit')) ml = Math.round(val * 1000);
      else if (unit.startsWith('bicchier') || unit.startsWith('glass') || unit.startsWith('cup'))
        ml = Math.round(val * 250);
      else if (val > 0 && val <= 10) ml = Math.round(val * 250);
      else if (val > 10) ml = Math.round(val);
    }
    return { type: 'water', ml };
  }

  // 2. Passi / Steps
  if (/\b(passi|passo|steps?)\b/i.test(lower)) {
    const stepNum = lower.match(/(\d[\d.,]*)/);
    const cleanedNum = stepNum ? stepNum[1].replace(/[.,](?=\d{3}\b)/g, '') : '1000';
    const steps = parseInt(cleanedNum, 10);
    return { type: 'steps', steps: Number.isFinite(steps) && steps > 0 ? steps : 1000 };
  }

  // 3. Pomodoro / Focus Timer
  if (/\b(pomodoro|focus|deep work|timer|pausa|break)\b/i.test(lower)) {
    if (/\b(long break|pausa lunga)\b/i.test(lower))
      return { type: 'pomodoro', mode: 'long_break' };
    if (/\b(short break|take a break|pausa breve|fai una pausa|pausa)\b/i.test(lower))
      return { type: 'pomodoro', mode: 'short_break' };
    const minMatch = lower.match(/(\d+)\s*(?:min|minuti|minuto|minute|minutes)/);
    return {
      type: 'pomodoro',
      mode: 'focus',
      minutes: minMatch ? parseInt(minMatch[1], 10) : undefined,
    };
  }

  // 4. Lista della Spesa / Shopping list
  if (
    /\b(spesa|lista della spesa|shopping|grocery|groceries|compra|comprare|buy)\b/i.test(
      lower
    ) &&
    !/\bspeso\b|\bspesa di\b|\bspent\b|\bexpense\b|[€$]\s*\d|\d+\s*(?:euro|€|\$)/i.test(
      lower
    )
  ) {
    const stripped = raw
      .replace(
        /^(aggiungi|metti|inserisci|compra|comprare|devo comprare|add|put|buy|need to buy)\s+/i,
        ''
      )
      .replace(
        /\s+(?:alla|nella|in|to|on)\s+(?:mia\s+|my\s+)?(?:lista\s+(?:della\s+)?)?(?:spesa|shopping|grocery)\s*(?:list)?$/i,
        ''
      )
      .trim();
    const items = stripped
      .split(/,|\be\b|\band\b/i)
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length > 0) {
      return { type: 'shopping', items };
    }
  }

  // 5. Spese / Expenses
  if (
    /\b(spesa|speso|pagato|costo|expense|spent|paid|cost|budget)\b|[€$]\s*\d|\d+(?:[.,]\d{1,2})?\s*(?:euro|€|\$|usd)/i.test(
      lower
    )
  ) {
    const amtMatch = raw.match(
      /[€$]?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:euro|eur|€|dollars|usd|\$)?/i
    );
    if (amtMatch) {
      const amount = parseFloat(amtMatch[1].replace(',', '.'));
      let category: ExpenseItem['category'] = 'Workspace';
      if (
        /supermercato|alimentari|spesa|latte|pane|frutta|grocery|groceries|market|milk|bread/i.test(
          lower
        )
      )
        category = 'Groceries';
      else if (
        /caffè|caffe|pranzo|cena|colazione|bar|ristorante|pizza|coffee|lunch|dinner|breakfast|cafe|restaurant|food/i.test(
          lower
        )
      )
        category = 'Dining';
      else if (
        /uber|treno|bus|metro|benzina|gasolio|parcheggio|pedaggio|train|gas|fuel|parking|transit/i.test(
          lower
        )
      )
        category = 'Transit';
      else if (
        /luce|acqua|bolletta|internet|fibra|affitto|condominio|electric|water bill|fiber|utility|utilities|rent/i.test(
          lower
        )
      )
        category = 'Utilities';
      else if (
        /palestra|farmacia|medico|salute|integratori|yoga|gym|pharmacy|health|supplement/i.test(
          lower
        )
      )
        category = 'Wellness';

      const desc = raw
        .replace(
          /^(registra|aggiungi|segna|ho|log|add|record|i)?\s*(?:una?\s+)?(?:spesa|speso|pagato|expense|spent|paid)\s*(?:di\s+)?/i,
          ''
        )
        .replace(amtMatch[0], '')
        .replace(/^\s*(?:per|di|for|on)\s+/i, '')
        .replace(/\s+(?:per|for)\s*$/i, '')
        .trim();

      return {
        type: 'expense',
        description: desc || 'Spesa Rapida',
        amount,
        category,
        date: getTodayISO(),
      };
    }
  }

  // 6. Promemoria / Reminders
  if (
    /^(ricordami|promemoria|imposta promemoria|remind me|set a? ?reminder|reminder)\b/i.test(
      lower
    )
  ) {
    const withoutPrefix = raw
      .replace(
        /^(ricordami\s+(?:di\s+)?|imposta\s+(?:un\s+)?promemoria\s*(?:per\s+|di\s+)?|promemoria:?\s*|remind me to\s+|remind me\s+|set a? ?reminder to\s+|set a? ?reminder\s+|reminder:?\s*)/i,
        ''
      )
      .trim();
    const { date, cleaned: afterDate } = parseDateFromText(withoutPrefix);
    const { time, cleaned: afterTime } = parseTimeFromText(afterDate);
    return {
      type: 'reminder',
      title: afterTime || withoutPrefix || 'Promemoria',
      date,
      time: time || '17:00',
    };
  }

  // 7. Eventi Calendario / Calendar events
  if (
    /^(segna|pianifica|programma|fissa|prenota|calendario|aggiungi evento|evento|riunione|appuntamento|schedule|book|calendar|add meeting|add event|meeting|event)\b/i.test(
      lower
    )
  ) {
    const withoutPrefix = raw
      .replace(
        /^(segna|pianifica|programma|fissa|prenota|crea|aggiungi|schedule|book|create|add)\s+(?:un\s+|una\s+|a\s+|an\s+)?(?:evento|appuntamento|riunione|calendar\s+)?(?:in\s+calendario\s+)?(?:event|meeting|appointment)?\s*(?:per|con|di|for|called|titled)?\s*/i,
        ''
      )
      .trim();
    const { date, cleaned: afterDate } = parseDateFromText(withoutPrefix);
    const { time, cleaned: afterTime } = parseTimeFromText(afterDate);
    const startTime = time || '10:00';
    let category: CalendarEvent['category'] = 'work';
    if (
      /palestra|corsa|allenamento|dentista|medico|dottore|yoga|salute|gym|run|workout|dentist|doctor|health/i.test(
        lower
      )
    )
      category = 'health';
    else if (/focus|deep work|studio|study/i.test(lower)) category = 'focus';
    else if (
      /cena|pranzo|famiglia|amici|personale|compleanno|dinner|family|friend|personal|birthday/i.test(
        lower
      )
    )
      category = 'personal';

    return {
      type: 'event',
      title:
        afterTime.replace(/\b(per|con|a|for|to|with)\s*$/i, '').trim() ||
        'Evento in Agenda',
      date,
      startTime,
      endTime: addOneHour(startTime),
      category,
    };
  }

  // 8. Note / Keep notes
  if (
    /^(nota|prendi nota|appunto|scrivi nota|note|take a note|jot down|keep note)\b/i.test(
      lower
    )
  ) {
    const body = raw
      .replace(
        /^(prendi nota|scrivi una? nota|nota|appunto|take a note|jot down|keep note|note):?\s*(?:di\s+)?/i,
        ''
      )
      .trim();
    const words = body.split(/\s+/);
    const title = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
    return {
      type: 'note',
      title: title || 'Nota Vocale',
      body: body || raw,
    };
  }

  // 9. Task / Attività
  if (
    /^(?:aggiungi|crea|nuovo|nuova|add|create|new)?\s*(?:un\s+|una\s+)?(?:urgente|importante|priorità alta|alta priorità|bassa priorità|urgent|important|high priority|low priority)?\s*(?:task|attività|attivita)\b/i.test(
      lower
    )
  ) {
    const { date, cleaned: afterDate } = parseDateFromText(raw);
    const isUrgent = /\b(urgente|urgent|subito|asap|critico|critica|critical|adesso|now|oggi|today)\b/i.test(
      lower
    );
    const isImportant = /\b(importante|important|critico|critica|critical|alta|high|chiave|budget|cliente|client|progetto|project)\b/i.test(
      lower
    );
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
    } else if (/\b(bassa priorità|low priority|poco importante)\b/i.test(lower)) {
      quadrant = 'Q4';
      priority = 'low';
    }

    const title = afterDate
      .replace(
        /^(?:aggiungi|crea|nuovo|nuova|add|create|new)?\s*(?:un\s+|una\s+)?(?:task|attività|attivita)\s*(?:urgente|importante|critico|critica|a\s+priorità\s+alta|a\s+bassa\s+priorità|urgent|important)?\s*:?\s*/i,
        ''
      )
      .replace(/^(?:urgente|importante|high priority|low priority)\s+/i, '')
      .replace(/\b(?:entro|by)\s*$/i, '')
      .trim();

    return {
      type: 'task',
      title: title || 'Nuovo Task',
      quadrant,
      priority,
      dueDate: date,
    };
  }

  // Fallback intelligente: se c'è un orario esplicito, crea un promemoria
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
