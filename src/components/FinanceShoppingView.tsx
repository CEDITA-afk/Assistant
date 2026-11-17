import React, { useMemo, useState } from 'react';
import {
  Check,
  Download,
  ExternalLink,
  FileSpreadsheet,
  LayoutGrid,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  Search,
  ShoppingCart,
  Table as TableIcon,
  Trash2,
} from 'lucide-react';
import type { DriveFileRecord } from '../services/googleWorkspace';
import type {
  CurrencyCode,
  ExpenseItem,
  MonthlyBudget,
  ShoppingItem,
} from '../types/workspace';
import {
  EXPENSE_CATEGORY_LABELS,
  formatMoney,
  formatShortDateIT,
  getCurrencySymbol,
  SHOP_CATEGORY_LABELS,
} from '../utils/formatters';
import { getTodayISO } from '../utils/storage';

interface FinanceShoppingViewProps {
  expenses: ExpenseItem[];
  budget: MonthlyBudget;
  shoppingList: ShoppingItem[];
  currency: CurrencyCode;
  isGoogleConnected: boolean;
  linkedSpreadsheetId?: string;
  linkedSpreadsheetName?: string;
  spreadsheets: DriveFileRecord[];
  sheetTabs: string[];
  activeSheetTab: string;
  sheetGrid: string[][];
  loadingSheetGrid: boolean;
  syncingSheets: boolean;
  onAddExpense: (exp: Omit<ExpenseItem, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateBudget: (budget: MonthlyBudget) => void;
  onAddShoppingItem: (item: Omit<ShoppingItem, 'id'>) => void;
  onToggleShoppingItem: (id: string) => void;
  onDeleteShoppingItem: (id: string) => void;
  onConvertCheckedShoppingToExpense: () => void;
  onCreateSpreadsheet: () => void;
  onSyncToGoogleSheets: () => void;
  onRefreshSpreadsheets: () => void;
  onSelectSpreadsheet: (spreadsheetId: string, title?: string) => void;
  onReadSheetTab: (spreadsheetId: string, tabName: string) => void;
  onWriteSheetGrid: (spreadsheetId: string, tabName: string, values: string[][]) => void;
}

const EXPENSE_CATEGORIES: ExpenseItem['category'][] = [
  'Groceries',
  'Dining',
  'Utilities',
  'Transit',
  'Wellness',
  'Workspace',
];

const SHOP_CATEGORIES: ShoppingItem['category'][] = [
  'Produce',
  'Pantry',
  'Household',
  'Tech',
  'Other',
];

export const FinanceShoppingView: React.FC<FinanceShoppingViewProps> = ({
  expenses,
  budget,
  shoppingList,
  currency,
  isGoogleConnected,
  linkedSpreadsheetId,
  linkedSpreadsheetName,
  spreadsheets,
  sheetTabs,
  activeSheetTab,
  sheetGrid,
  loadingSheetGrid,
  syncingSheets,
  onAddExpense,
  onDeleteExpense,
  onUpdateBudget,
  onAddShoppingItem,
  onToggleShoppingItem,
  onDeleteShoppingItem,
  onConvertCheckedShoppingToExpense,
  onCreateSpreadsheet,
  onSyncToGoogleSheets,
  onRefreshSpreadsheets,
  onSelectSpreadsheet,
  onReadSheetTab,
  onWriteSheetGrid,
}) => {
  const today = getTodayISO();
  const currentMonth = today.slice(0, 7);
  const sym = getCurrencySymbol(currency);

  const [expDesc, setExpDesc] = useState('');
  const [expAmt, setExpAmt] = useState('');
  const [expCat, setExpCat] = useState<ExpenseItem['category']>('Groceries');
  const [expDate, setExpDate] = useState(today);
  const [filterCat, setFilterCat] = useState<string>('ALL');

  const [shopName, setShopName] = useState('');
  const [shopQty, setShopQty] = useState('1');
  const [shopPrice, setShopPrice] = useState('');
  const [shopCat, setShopCat] = useState<ShoppingItem['category']>('Produce');

  const [manualSheetId, setManualSheetId] = useState(linkedSpreadsheetId || '');
  const [editableRows, setEditableRows] = useState<string[][] | null>(null);
  const [sheetFilter, setSheetFilter] = useState('');
  const [sheetViewMode, setSheetViewMode] = useState<'table' | 'cards'>('table');

  const displayedGrid = editableRows ?? sheetGrid;

  const monthlyExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(currentMonth)),
    [expenses, currentMonth]
  );

  const totalMonthSpent = useMemo(
    () => monthlyExpenses.reduce((sum, e) => sum + e.amount, 0),
    [monthlyExpenses]
  );

  const categoryTotals = useMemo(() => {
    const map: Record<ExpenseItem['category'], number> = {
      Groceries: 0,
      Dining: 0,
      Utilities: 0,
      Transit: 0,
      Wellness: 0,
      Workspace: 0,
    };
    monthlyExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [monthlyExpenses]);

  const filteredExpenses = useMemo(() => {
    const list =
      filterCat === 'ALL'
        ? expenses
        : expenses.filter((e) => e.category === filterCat);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, filterCat]);

  const shoppingTotalEst = useMemo(
    () => shoppingList.reduce((acc, s) => acc + s.estimatedPrice, 0),
    [shoppingList]
  );
  const checkedCount = shoppingList.filter((s) => s.checked).length;

  const filteredSheetIndices = useMemo(() => {
    const q = sheetFilter.trim().toLowerCase();
    return displayedGrid
      .map((row, idx) => ({ row, idx }))
      .filter(({ row, idx }) => {
        if (idx === 0 || !q) return true;
        return row.some((cell) => (cell || '').toLowerCase().includes(q));
      })
      .slice(0, 35);
  }, [displayedGrid, sheetFilter]);

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expAmt.replace(',', '.'));
    if (!expDesc.trim() || !Number.isFinite(amount) || amount <= 0) return;
    onAddExpense({
      description: expDesc.trim(),
      amount,
      category: expCat,
      date: expDate,
    });
    setExpDesc('');
    setExpAmt('');
  };

  const handleShopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) return;
    const price = parseFloat(shopPrice.replace(',', '.')) || 0;
    onAddShoppingItem({
      name: shopName.trim(),
      category: shopCat,
      quantity: shopQty.trim() || '1',
      estimatedPrice: price,
      checked: false,
    });
    setShopName('');
    setShopPrice('');
    setShopQty('1');
  };

  const exportExpensesCsv = () => {
    const rows = [
      ['Data', 'Descrizione', 'Categoria', `Importo (${currency})`],
      ...expenses.map((e) => [
        e.date,
        `"${e.description.replace(/"/g, '""')}"`,
        EXPENSE_CATEGORY_LABELS[e.category] || e.category,
        e.amount.toFixed(2),
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadence-spese-${currentMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalBudgetPct = Math.min(
    100,
    Math.round((totalMonthSpent / Math.max(1, budget.totalLimit)) * 100)
  );
  const totalRemaining = budget.totalLimit - totalMonthSpent;

  const handleCellChange = (rIdx: number, cIdx: number, val: string) => {
    const base = (editableRows ?? sheetGrid).map((row) => [...row]);
    while (base.length <= rIdx) base.push([]);
    while (base[rIdx].length <= cIdx) base[rIdx].push('');
    base[rIdx][cIdx] = val;
    setEditableRows(base);
  };

  const handleAddGridRow = () => {
    const base = (editableRows ?? sheetGrid).map((row) => [...row]);
    const cols = Math.max(4, base[0]?.length || 4);
    base.push(Array(cols).fill(''));
    setEditableRows(base);
  };

  const colCount = Math.max(4, ...displayedGrid.map((r) => r.length));
  const sheetHeaders = displayedGrid[0] || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Budget Mensile, Spese &amp; Google Fogli
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Leggi e modifica fogli Google dal vivo, monitora le soglie di spesa e gestisci la lista della spesa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportExpensesCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Esporta CSV
          </button>

          {!linkedSpreadsheetId ? (
            <button
              type="button"
              onClick={onCreateSpreadsheet}
              disabled={!isGoogleConnected || syncingSheets}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {isGoogleConnected ? 'Crea Foglio Spese Google' : 'Connetti Google per Fogli'}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`https://docs.google.com/spreadsheets/d/${linkedSpreadsheetId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                {linkedSpreadsheetName || 'Apri Foglio'}
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                type="button"
                onClick={onSyncToGoogleSheets}
                disabled={!isGoogleConnected || syncingSheets}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {syncingSheets ? 'Sincronizzazione...' : 'Sincronizza su Fogli'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lettore & Editor Google Fogli */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Lettore &amp; Editor Google Fogli
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Seleziona un foglio, filtra le righe, modifica celle o schede e salva direttamente su Google Fogli
            </p>
          </div>
          <div className="flex items-center gap-2">
            {displayedGrid.length > 0 && (
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-[#0B0F17] p-1">
                <button
                  type="button"
                  onClick={() => setSheetViewMode('table')}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${
                    sheetViewMode === 'table'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <TableIcon className="h-3 w-3" /> Tabella
                </button>
                <button
                  type="button"
                  onClick={() => setSheetViewMode('cards')}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${
                    sheetViewMode === 'cards'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <LayoutGrid className="h-3 w-3" /> Schede
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onRefreshSpreadsheets}
              disabled={!isGoogleConnected || loadingSheetGrid}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingSheetGrid ? 'animate-spin' : ''}`} />
              Elenca i Miei Fogli
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {spreadsheets.length > 0 && (
            <select
              value={linkedSpreadsheetId || ''}
              onChange={(e) => {
                const chosen = spreadsheets.find((s) => s.id === e.target.value);
                if (chosen) {
                  setEditableRows(null);
                  setManualSheetId(chosen.id);
                  onSelectSpreadsheet(chosen.id, chosen.name);
                }
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="">Scegli un Google Foglio...</option>
              {spreadsheets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <input
            type="text"
            value={manualSheetId}
            onChange={(e) => setManualSheetId(e.target.value)}
            placeholder="Oppure incolla ID Foglio..."
            className="flex-1 min-w-[180px] sm:max-w-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            disabled={!isGoogleConnected || !manualSheetId.trim() || loadingSheetGrid}
            onClick={() => {
              setEditableRows(null);
              onSelectSpreadsheet(manualSheetId.trim());
            }}
            className="rounded-lg bg-slate-900 dark:bg-slate-100 px-3 py-1.5 text-xs font-medium text-white dark:text-slate-900 disabled:opacity-50 cursor-pointer"
          >
            Leggi Foglio
          </button>

          {displayedGrid.length > 0 && (
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={sheetFilter}
                onChange={(e) => setSheetFilter(e.target.value)}
                placeholder="Filtra righe..."
                className="w-40 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          {sheetTabs.length > 0 && linkedSpreadsheetId && (
            <div className="flex flex-wrap items-center gap-1 ml-auto">
              {sheetTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setEditableRows(null);
                    onReadSheetTab(linkedSpreadsheetId, tab);
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${
                    activeSheetTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>

        {displayedGrid.length > 0 ? (
          <div className="space-y-3">
            {sheetViewMode === 'table' ? (
              <div className="overflow-x-auto max-h-96 border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-xs text-left">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSheetIndices.map(({ row, idx: rIdx }) => (
                      <tr
                        key={rIdx}
                        className={
                          rIdx === 0
                            ? 'sticky top-0 z-10 bg-slate-100 dark:bg-[#0B0F17] font-semibold'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                        }
                      >
                        {Array.from({ length: colCount }, (_, cIdx) => (
                          <td
                            key={cIdx}
                            className="border-r border-slate-100 dark:border-slate-800 last:border-r-0 p-1"
                          >
                            <input
                              type="text"
                              value={row[cIdx] || ''}
                              onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                              className="w-full min-w-[96px] bg-transparent px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:bg-blue-500/10 focus:outline-none rounded"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {filteredSheetIndices
                  .filter(({ idx }) => idx > 0)
                  .map(({ row, idx: rIdx }) => (
                    <div
                      key={rIdx}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] p-3 space-y-2"
                    >
                      <div className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                        Riga {rIdx + 1}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: colCount }, (_, cIdx) => (
                          <label key={cIdx} className="block text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="truncate block">
                              {sheetHeaders[cIdx] || `Colonna ${cIdx + 1}`}
                            </span>
                            <input
                              type="text"
                              value={row[cIdx] || ''}
                              onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                              className="mt-0.5 w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-2 py-1 text-xs text-slate-900 dark:text-slate-100"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleAddGridRow}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Aggiungi Riga
              </button>

              {linkedSpreadsheetId && activeSheetTab && (
                <button
                  type="button"
                  onClick={() => {
                    onWriteSheetGrid(linkedSpreadsheetId, activeSheetTab, displayedGrid);
                    setEditableRows(null);
                  }}
                  disabled={!isGoogleConnected || syncingSheets}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" /> Salva Modifiche sul Foglio
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isGoogleConnected
              ? 'Clicca "Elenca i Miei Fogli" o "Crea Foglio Spese Google" per leggere e modificare le celle in tempo reale.'
              : 'Connetti Google per leggere e scrivere Google Fogli qui dentro, oppure usa il registro locale qui sotto.'}
          </p>
        )}
      </div>

      {/* Panoramica Budget & Soglie Categoria */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Budget Mensile ({currentMonth})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Speso {formatMoney(totalMonthSpent, currency)} su {formatMoney(budget.totalLimit, currency)} ({totalBudgetPct}%) ·{' '}
              <span
                className={
                  totalRemaining < 0
                    ? 'text-red-600 dark:text-red-400 font-semibold'
                    : 'text-emerald-600 dark:text-emerald-400 font-semibold'
                }
              >
                {totalRemaining >= 0
                  ? `Residui ${formatMoney(totalRemaining, currency)}`
                  : `Sforato di ${formatMoney(Math.abs(totalRemaining), currency)}`}
              </span>
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span>Limite Mensile ({sym})</span>
            <input
              type="number"
              min={100}
              step={50}
              value={budget.totalLimit}
              onChange={(e) =>
                onUpdateBudget({
                  ...budget,
                  totalLimit: Math.max(100, Number(e.target.value) || 1000),
                })
              }
              className="w-28 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-1.5 font-mono text-xs tabular-nums text-slate-900 dark:text-slate-100"
            />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPENSE_CATEGORIES.map((cat) => {
            const spent = categoryTotals[cat] || 0;
            const limit = budget.categoryLimits[cat] || 200;
            const rawPct = Math.round((spent / Math.max(1, limit)) * 100);
            const pct = Math.min(100, rawPct);
            const catLeft = limit - spent;
            const statusText =
              rawPct >= 100
                ? 'Sforato'
                : rawPct >= 80
                ? 'Vicino al Limite'
                : 'Regolare';
            const barClass =
              rawPct >= 100
                ? 'bg-red-600'
                : rawPct >= 80
                ? 'bg-amber-500'
                : 'bg-emerald-600';

            return (
              <div
                key={cat}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {EXPENSE_CATEGORY_LABELS[cat]}
                  </span>
                  <span
                    className={`font-medium ${
                      rawPct >= 100
                        ? 'text-red-600 dark:text-red-400'
                        : rawPct >= 80
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {statusText} ({rawPct}%)
                  </span>
                </div>

                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${barClass}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono tabular-nums">
                    {formatMoney(spent, currency)} ·{' '}
                    {catLeft >= 0
                      ? `-${formatMoney(catLeft, currency)} disp.`
                      : `+${formatMoney(Math.abs(catLeft), currency)} extra`}
                  </span>
                  <label className="inline-flex items-center gap-1">
                    <span>Soglia {sym}</span>
                    <input
                      type="number"
                      min={20}
                      step={10}
                      value={limit}
                      onChange={(e) =>
                        onUpdateBudget({
                          ...budget,
                          categoryLimits: {
                            ...budget.categoryLimits,
                            [cat]: Math.max(20, Number(e.target.value) || 100),
                          },
                        })
                      }
                      aria-label={`Soglia mensile ${EXPENSE_CATEGORY_LABELS[cat]}`}
                      className="w-16 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-slate-900 dark:text-slate-100"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Registro Spese & Lista Spesa */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Registro Spese
              </h3>
            </div>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">Tutte le Categorie</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleExpenseSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              type="text"
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              placeholder="Descrizione spesa..."
              className="sm:col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={expAmt}
              onChange={(e) => setExpAmt(e.target.value)}
              placeholder={`${sym} Importo`}
              className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100"
            />
            <select
              value={expCat}
              onChange={(e) => setExpCat(e.target.value as ExpenseItem['category'])}
              className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
              className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2 py-2 font-mono text-xs text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              aria-label="Aggiungi spesa"
              className="sm:col-span-1 inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 font-medium">Data</th>
                  <th className="py-2 font-medium">Descrizione</th>
                  <th className="py-2 font-medium">Categoria</th>
                  <th className="py-2 font-medium text-right">Importo</th>
                  <th className="py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap pr-3">
                      {formatShortDateIT(exp.date)}
                    </td>
                    <td className="py-2.5 text-slate-900 dark:text-slate-100 pr-3">
                      {exp.description}
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400 pr-3">
                      {EXPENSE_CATEGORY_LABELS[exp.category]}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                      {formatMoney(exp.amount, currency)}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteExpense(exp.id)}
                        aria-label={`Elimina spesa ${exp.description}`}
                        className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Lista della Spesa
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {shoppingList.length - checkedCount} da prendere · Stima {formatMoney(shoppingTotalEst, currency)}
                </p>
              </div>
            </div>
            {checkedCount > 0 && (
              <button
                type="button"
                onClick={onConvertCheckedShoppingToExpense}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 whitespace-nowrap cursor-pointer"
              >
                Registra {checkedCount} come Spesa
              </button>
            )}
          </div>

          <form onSubmit={handleShopSubmit} className="grid grid-cols-12 gap-2">
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Articolo..."
              className="col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />
            <input
              type="text"
              value={shopQty}
              onChange={(e) => setShopQty(e.target.value)}
              placeholder="Qtà"
              className="col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2 py-2 text-xs text-slate-900 dark:text-slate-100"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              value={shopPrice}
              onChange={(e) => setShopPrice(e.target.value)}
              placeholder={sym}
              className="col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2 py-2 font-mono text-xs text-slate-900 dark:text-slate-100"
            />
            <select
              value={shopCat}
              onChange={(e) => setShopCat(e.target.value as ShoppingItem['category'])}
              className="col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-1.5 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              {SHOP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {SHOP_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              aria-label="Aggiungi articolo"
              className="col-span-1 inline-flex items-center justify-center rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {shoppingList.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => onToggleShoppingItem(item.id)}
                    className={`mt-0.5 flex h-5 w-5 sm:h-4 sm:w-4 shrink-0 items-center justify-center rounded border cursor-pointer ${
                      item.checked
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {item.checked && <Check className="h-3 w-3" />}
                  </button>
                  <div className="min-w-0">
                    <p
                      className={`text-sm ${
                        item.checked
                          ? 'line-through text-slate-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {SHOP_CATEGORY_LABELS[item.category]} · {item.quantity}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                    {formatMoney(item.estimatedPrice, currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteShoppingItem(item.id)}
                    aria-label={`Elimina articolo ${item.name}`}
                    className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
