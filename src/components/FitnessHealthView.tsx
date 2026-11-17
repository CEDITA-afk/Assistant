import React, { useState } from 'react';
import {
  Activity,
  CalendarPlus,
  Droplets,
  Flame,
  Footprints,
  Plus,
  Upload,
} from 'lucide-react';
import type { HealthDayLog, WorkoutEntry } from '../types/workspace';
import { WORKOUT_LABELS } from '../utils/formatters';
import { getTodayISO } from '../utils/storage';

interface FitnessHealthViewProps {
  healthLogs: HealthDayLog[];
  autoCalendarWorkoutSync: boolean;
  onLogWater: (ml: number) => void;
  onLogSteps: (steps: number) => void;
  onUpdateGoals: (stepGoal: number, kcalGoal: number, waterGoalMl: number) => void;
  onAddWorkout: (workout: Omit<WorkoutEntry, 'id'>) => void;
  onToggleCalendarWorkoutSync: (enabled: boolean) => void;
  onImportHealthData: (steps: number, kcal: number) => void;
}

export const FitnessHealthView: React.FC<FitnessHealthViewProps> = ({
  healthLogs,
  autoCalendarWorkoutSync,
  onLogWater,
  onLogSteps,
  onUpdateGoals,
  onAddWorkout,
  onToggleCalendarWorkoutSync,
  onImportHealthData,
}) => {
  const today = getTodayISO();
  const todayLog = healthLogs.find((h) => h.date === today) || {
    date: today,
    steps: 0,
    stepGoal: 10000,
    kcalBurned: 0,
    kcalGoal: 600,
    waterMl: 0,
    waterGoalMl: 2500,
    workouts: [],
  };

  const [customSteps, setCustomSteps] = useState('1000');
  const [wkType, setWkType] = useState<WorkoutEntry['type']>('Running');
  const [wkDuration, setWkDuration] = useState('30');
  const [wkKcal, setWkKcal] = useState('280');
  const [wkTime, setWkTime] = useState('18:00');
  const [healthImportMsg, setHealthImportMsg] = useState<string | null>(null);

  const [chartMetric, setChartMetric] = useState<'steps' | 'kcal' | 'water'>('steps');

  const handleStepsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customSteps, 10);
    if (Number.isFinite(val) && val > 0) {
      onLogSteps(val);
    }
  };

  const handleWorkoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const durationMin = Math.max(5, parseInt(wkDuration, 10) || 30);
    const kcal = Math.max(10, parseInt(wkKcal, 10) || 200);
    onAddWorkout({
      type: wkType,
      durationMin,
      kcal,
      time: wkTime,
      syncedToCalendar: autoCalendarWorkoutSync,
    });
  };

  const handleHealthFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result);
      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          const steps = Number(parsed.steps || parsed.stepCount || 2500);
          const kcal = Number(parsed.calories || parsed.kcal || 180);
          onImportHealthData(steps, kcal);
          setHealthImportMsg(`Importati ${steps} passi e ${kcal} kcal dal file JSON Salute.`);
        } else {
          const lines = content.trim().split(/\r?\n/);
          let steps = 0;
          let kcal = 0;
          lines.slice(1).forEach((line) => {
            const cols = line.split(',');
            const maybeNum1 = parseFloat(cols[1] || '0');
            const maybeNum2 = parseFloat(cols[2] || '0');
            if (Number.isFinite(maybeNum1)) steps += Math.round(maybeNum1);
            if (Number.isFinite(maybeNum2)) kcal += Math.round(maybeNum2);
          });
          onImportHealthData(steps || 1500, kcal || 120);
          setHealthImportMsg(`Importate metriche CSV Salute (${steps || 1500} passi).`);
        }
      } catch {
        setHealthImportMsg('Impossibile leggere il file esportato da Salute.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const recent7 = healthLogs.slice(-7);
  const maxChartVal = Math.max(
    1,
    ...recent7.map((d) =>
      chartMetric === 'steps'
        ? Math.max(d.steps, d.stepGoal)
        : chartMetric === 'kcal'
        ? Math.max(d.kcalBurned, d.kcalGoal)
        : Math.max(d.waterMl, d.waterGoalMl)
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Fitness, Calorie &amp; Idratazione
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Obiettivi giornalieri con grafici a 7 giorni, sync allenamenti in agenda e importazione Health Connect / Fit
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoCalendarWorkoutSync}
              onChange={(e) => onToggleCalendarWorkoutSync(e.target.checked)}
              className="rounded border-slate-300 text-blue-600"
            />
            <CalendarPlus className="h-3.5 w-3.5 text-blue-500" />
            Sincronizza allenamenti in Agenda
          </label>

          <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer">
            <Upload className="h-3.5 w-3.5" />
            Importa Health Connect / Fit (JSON/CSV)
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleHealthFileImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {healthImportMsg && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          {healthImportMsg}
        </div>
      )}

      {/* 3 Anelli Progresso */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GoalRingCard
          title="Passi Giornalieri"
          icon={<Footprints className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
          value={todayLog.steps}
          goal={todayLog.stepGoal}
          unit="passi"
          colorClass="text-blue-600 dark:text-blue-500"
          onGoalChange={(next) =>
            onUpdateGoals(next, todayLog.kcalGoal, todayLog.waterGoalMl)
          }
          actions={
            <form onSubmit={handleStepsSubmit} className="flex items-center gap-2 mt-3">
              <input
                type="number"
                min={100}
                step={100}
                value={customSteps}
                onChange={(e) => setCustomSteps(e.target.value)}
                className="w-24 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer"
              >
                + Aggiungi Passi
              </button>
            </form>
          }
        />

        <GoalRingCard
          title="Calorie Attive Bruciate"
          icon={<Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
          value={todayLog.kcalBurned}
          goal={todayLog.kcalGoal}
          unit="kcal"
          colorClass="text-amber-500"
          onGoalChange={(next) =>
            onUpdateGoals(todayLog.stepGoal, next, todayLog.waterGoalMl)
          }
          actions={
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {todayLog.workouts.length} allenament{todayLog.workouts.length === 1 ? 'o' : 'i'} registrat{todayLog.workouts.length === 1 ? 'o' : 'i'} oggi
            </p>
          }
        />

        <GoalRingCard
          title="Idratazione Acqua"
          icon={<Droplets className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
          value={todayLog.waterMl}
          goal={todayLog.waterGoalMl}
          unit="ml"
          colorClass="text-cyan-500"
          onGoalChange={(next) =>
            onUpdateGoals(todayLog.stepGoal, todayLog.kcalGoal, next)
          }
          actions={
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onLogWater(250)}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                +250 ml
              </button>
              <button
                type="button"
                onClick={() => onLogWater(500)}
                className="flex-1 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-cyan-700 cursor-pointer"
              >
                +500 ml
              </button>
            </div>
          }
        />
      </div>

      {/* Grafico 7 giorni + Registro Allenamenti */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Andamento Ultimi 7 Giorni
            </h3>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-[#0B0F17] p-1">
              {([
                ['steps', 'Passi'],
                ['kcal', 'Kcal'],
                ['water', 'Acqua'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setChartMetric(key)}
                  className={`rounded-md px-3 py-1 text-xs font-medium cursor-pointer ${
                    chartMetric === key
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <svg viewBox="0 0 560 210" className="w-full h-52 overflow-visible">
              {(() => {
                const goalVal =
                  chartMetric === 'steps'
                    ? todayLog.stepGoal
                    : chartMetric === 'kcal'
                    ? todayLog.kcalGoal
                    : todayLog.waterGoalMl;
                const yGoal = 170 - (goalVal / maxChartVal) * 140;
                return (
                  <g>
                    <line
                      x1="20"
                      x2="540"
                      y1={yGoal}
                      y2={yGoal}
                      stroke="currentColor"
                      strokeDasharray="4 4"
                      className="text-slate-300 dark:text-slate-700"
                    />
                    <text
                      x="540"
                      y={yGoal - 5}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px] font-mono"
                    >
                      Obiettivo: {goalVal.toLocaleString('it-IT')}
                    </text>
                  </g>
                );
              })()}

              {recent7.map((day, idx) => {
                const val =
                  chartMetric === 'steps'
                    ? day.steps
                    : chartMetric === 'kcal'
                    ? day.kcalBurned
                    : day.waterMl;
                const goal =
                  chartMetric === 'steps'
                    ? day.stepGoal
                    : chartMetric === 'kcal'
                    ? day.kcalGoal
                    : day.waterGoalMl;
                const barH = Math.max(4, (val / maxChartVal) * 140);
                const x = 35 + idx * 72;
                const y = 170 - barH;
                const metGoal = val >= goal;
                const [, mm, dd] = day.date.split('-');

                return (
                  <g key={day.date}>
                    <rect
                      x={x}
                      y={y}
                      width="40"
                      height={barH}
                      rx="6"
                      className={
                        metGoal
                          ? 'fill-emerald-500'
                          : chartMetric === 'steps'
                          ? 'fill-blue-600'
                          : chartMetric === 'kcal'
                          ? 'fill-amber-500'
                          : 'fill-cyan-500'
                      }
                    />
                    <text
                      x={x + 20}
                      y={y - 6}
                      textAnchor="middle"
                      className="fill-slate-600 dark:fill-slate-300 text-[10px] font-mono tabular-nums"
                    >
                      {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                    </text>
                    <text
                      x={x + 20}
                      y="192"
                      textAnchor="middle"
                      className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
                    >
                      {dd}/{mm}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Workout Logger */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Activity className="h-4 w-4 text-emerald-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Registra Allenamento
            </h3>
          </div>

          <form onSubmit={handleWorkoutSubmit} className="grid grid-cols-2 gap-2.5">
            <select
              value={wkType}
              onChange={(e) => setWkType(e.target.value as WorkoutEntry['type'])}
              className="col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              {(Object.keys(WORKOUT_LABELS) as WorkoutEntry['type'][]).map((k) => (
                <option key={k} value={k}>
                  {WORKOUT_LABELS[k]}
                </option>
              ))}
            </select>
            <label className="text-[11px] text-slate-500 dark:text-slate-400">
              Durata (min)
              <input
                type="number"
                min={5}
                value={wkDuration}
                onChange={(e) => setWkDuration(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="text-[11px] text-slate-500 dark:text-slate-400">
              Calorie (kcal)
              <input
                type="number"
                min={10}
                value={wkKcal}
                onChange={(e) => setWkKcal(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="col-span-2 text-[11px] text-slate-500 dark:text-slate-400">
              Orario
              <input
                type="time"
                value={wkTime}
                onChange={(e) => setWkTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100"
              />
            </label>
            <button
              type="submit"
              className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Salva Allenamento
            </button>
          </form>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {todayLog.workouts.map((w) => (
              <div key={w.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {WORKOUT_LABELS[w.type] || w.type} · {w.durationMin} min
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 tabular-nums">
                    {w.time} {w.syncedToCalendar ? '· In Agenda' : ''}
                  </p>
                </div>
                <span className="font-mono tabular-nums font-medium text-amber-600 dark:text-amber-400">
                  {w.kcal} kcal
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface GoalRingCardProps {
  title: string;
  icon: React.ReactNode;
  value: number;
  goal: number;
  unit: string;
  colorClass: string;
  onGoalChange: (nextGoal: number) => void;
  actions?: React.ReactNode;
}

const GoalRingCard: React.FC<GoalRingCardProps> = ({
  title,
  icon,
  value,
  goal,
  unit,
  colorClass,
  onGoalChange,
  actions,
}) => {
  const pct = Math.min(100, Math.round((value / Math.max(1, goal)) * 100));
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
          {icon}
          {title}
        </span>
        <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {pct}%
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <svg className="h-20 w-20 -rotate-90 shrink-0" viewBox="0 0 84 84">
          <circle
            cx="42"
            cy="42"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            className="text-slate-100 dark:text-slate-800"
          />
          <circle
            cx="42"
            cy="42"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className={colorClass}
          />
        </svg>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {value.toLocaleString('it-IT')}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Obiettivo:</span>
            <input
              type="number"
              min={1}
              value={goal}
              onChange={(e) => onGoalChange(Math.max(1, Number(e.target.value) || goal))}
              aria-label={`Obiettivo giornaliero ${title}`}
              className="w-20 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0F17] px-1.5 py-0.5 font-mono text-xs tabular-nums text-slate-900 dark:text-slate-100"
            />
            <span>{unit}</span>
          </div>
        </div>
      </div>

      {actions}
    </div>
  );
};
