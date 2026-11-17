import React, { useMemo, useState } from 'react';
import {
  Bell,
  Calendar as CalendarIcon,
  Check,
  CloudUpload,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { CalendarEvent, ReminderItem } from '../types/workspace';
import { getTodayISO } from '../utils/storage';

interface ScheduleViewProps {
  events: CalendarEvent[];
  reminders: ReminderItem[];
  isGoogleConnected: boolean;
  syncingCalendar: boolean;
  onAddEvent: (ev: Omit<CalendarEvent, 'id'>) => void;
  onDeleteEvent: (ev: CalendarEvent) => void;
  onPushEventToGoogle: (ev: CalendarEvent) => void;
  onSyncFromGoogle: () => void;
  onAddReminder: (rem: Omit<ReminderItem, 'id'>) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  events,
  reminders,
  isGoogleConnected,
  syncingCalendar,
  onAddEvent,
  onDeleteEvent,
  onPushEventToGoogle,
  onSyncFromGoogle,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
}) => {
  const today = getTodayISO();
  const [selectedDate, setSelectedDate] = useState(today);

  // Add Event form
  const [evTitle, setEvTitle] = useState('');
  const [evStart, setEvStart] = useState('10:00');
  const [evEnd, setEvEnd] = useState('11:00');
  const [evCategory, setEvCategory] = useState<CalendarEvent['category']>('work');
  const [evLocation, setEvLocation] = useState('');

  // Add Reminder form
  const [remTitle, setRemTitle] = useState('');
  const [remTime, setRemTime] = useState('16:00');
  const [remRepeat, setRemRepeat] = useState<ReminderItem['repeat']>('none');

  // Generate 14-day calendar strip + month overview
  const calendarDays = useMemo(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const daysInMonth = new Date(y, m, 0).getDate();
    const startWeekday = firstDay.getDay();

    const cells: Array<{ date: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ date: null, dayNum: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ date: iso, dayNum: d });
    }
    return cells;
  }, [selectedDate]);

  const selectedDayEvents = useMemo(
    () =>
      events
        .filter((e) => e.date === selectedDate)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [events, selectedDate]
  );

  const monthLabel = useMemo(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDate]);

  const shiftMonth = (delta: number) => {
    const [y, m] = selectedDate.split('-').map(Number);
    const next = new Date(y, m - 1 + delta, 1);
    setSelectedDate(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`
    );
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) return;
    onAddEvent({
      title: evTitle.trim(),
      date: selectedDate,
      startTime: evStart,
      endTime: evEnd,
      location: evLocation.trim() || undefined,
      category: evCategory,
      reminderMinutes: 15,
    });
    setEvTitle('');
    setEvLocation('');
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTitle.trim()) return;
    onAddReminder({
      title: remTitle.trim(),
      date: selectedDate,
      time: remTime,
      completed: false,
      repeat: remRepeat,
    });
    setRemTitle('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Calendar &amp; Daily Reminders
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Works locally offline or syncs seamlessly with Google Calendar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedDate(today)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
          >
            Jump to Today
          </button>
          <button
            type="button"
            onClick={onSyncFromGoogle}
            disabled={!isGoogleConnected || syncingCalendar}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncingCalendar ? 'animate-spin' : ''}`} />
            {isGoogleConnected
              ? syncingCalendar
                ? 'Syncing Calendar...'
                : 'Pull Google Calendar'
              : 'Connect Google to Sync'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Month Grid + Add Event */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {monthLabel}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((cell, idx) => {
                if (!cell.date) return <div key={`empty-${idx}`} className="h-14" />;
                const count = events.filter((e) => e.date === cell.date).length;
                const isSelected = cell.date === selectedDate;
                const isToday = cell.date === today;

                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => setSelectedDate(cell.date!)}
                    className={`h-14 rounded-lg border p-1.5 flex flex-col items-start justify-between text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600/10 text-blue-700 dark:text-blue-300'
                        : isToday
                        ? 'border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-mono text-xs font-medium tabular-nums">
                      {cell.dayNum}
                    </span>
                    {count > 0 && (
                      <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 tabular-nums">
                        {count} evt
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule Event Form */}
          <form
            onSubmit={handleCreateEvent}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-3"
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Add Event on {selectedDate}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
                placeholder="Event title (or use Voice Command)"
                className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={evStart}
                  onChange={(e) => setEvStart(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="time"
                  value={evEnd}
                  onChange={(e) => setEvEnd(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={evCategory}
                  onChange={(e) =>
                    setEvCategory(e.target.value as CalendarEvent['category'])
                  }
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="work">Work</option>
                  <option value="focus">Deep Focus</option>
                  <option value="health">Health &amp; Fitness</option>
                  <option value="personal">Personal</option>
                </select>
                <input
                  type="text"
                  value={evLocation}
                  onChange={(e) => setEvLocation(e.target.value)}
                  placeholder="Location"
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add to Schedule
            </button>
          </form>
        </div>

        {/* Right 5 cols: Day Events + Reminders */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                  {selectedDate}
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {selectedDayEvents.length} events
              </span>
            </div>

            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {selectedDayEvents.length === 0 ? (
                <p className="py-6 text-xs text-slate-500 dark:text-slate-400">
                  No events on this date.
                </p>
              ) : (
                selectedDayEvents.map((ev) => (
                  <div key={ev.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {ev.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                        {ev.startTime} – {ev.endTime} · {ev.category}
                        {ev.googleEventId ? ' · Google Calendar' : ' · Local'}
                      </p>
                      {ev.location && (
                        <p className="text-xs text-slate-400 mt-0.5">{ev.location}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isGoogleConnected && !ev.googleEventId && (
                        <button
                          type="button"
                          onClick={() => onPushEventToGoogle(ev)}
                          title="Push event to Google Calendar"
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                        >
                          <CloudUpload className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteEvent(ev)}
                        aria-label={`Delete event ${ev.title}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Bell className="h-4 w-4 text-amber-500" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Daily Reminders
              </h3>
            </div>

            <form onSubmit={handleCreateReminder} className="mt-3 flex flex-col gap-2">
              <input
                type="text"
                value={remTitle}
                onChange={(e) => setRemTitle(e.target.value)}
                placeholder="Reminder note..."
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={remTime}
                  onChange={(e) => setRemTime(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100"
                />
                <select
                  value={remRepeat}
                  onChange={(e) =>
                    setRemRepeat(e.target.value as ReminderItem['repeat'])
                  }
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="none">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 dark:bg-slate-100 px-3 py-1.5 text-xs font-medium text-white dark:text-slate-900 hover:opacity-90 cursor-pointer"
                >
                  Add
                </button>
              </div>
            </form>

            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {reminders.map((rem) => (
                <div key={rem.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleReminder(rem.id)}
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border cursor-pointer ${
                        rem.completed
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {rem.completed && <Check className="h-3 w-3" />}
                    </button>
                    <div className="min-w-0">
                      <p
                        className={`text-sm ${
                          rem.completed
                            ? 'line-through text-slate-400'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {rem.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {rem.date} · {rem.time} · {rem.repeat}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteReminder(rem.id)}
                    aria-label={`Delete reminder ${rem.title}`}
                    className="rounded-md p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
