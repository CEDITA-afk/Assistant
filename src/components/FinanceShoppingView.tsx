import React, { useMemo, useState } from 'react';
import {
  Check,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import type { DriveFileRecord } from '../services/googleWorkspace';
import type {
  ExpenseItem,
  MonthlyBudget,
  ShoppingItem,
} from '../types/workspace';
import { getTodayISO } from '../utils/storage';

interface FinanceShoppingViewProps {
  expenses: ExpenseItem[];
  budget: MonthlyBudget;
  shoppingList: ShoppingItem[];
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

  // Expense form
  const [expDesc, setExpDesc] = useState('');
  const [expAmt, setExpAmt] = useState('');
  const [expCat, setExpCat] = useState<ExpenseItem['category']>('Groceries');
  const [expDate, setExpDate] = useState(today);
  const [filterCat, setFilterCat] = useState<string>('ALL');

  // Shopping form
  const [shopName, setShopName] = useState('');
  const [shopQty, setShopQty] = useState('1');
  const [shopPrice, setShopPrice] = useState('');
  const [shopCat, setShopCat] = useState<ShoppingItem['category']>('Produce');

  // Interactive Google Sheet editor state
  const [manualSheetId, setManualSheetId] = useState(linkedSpreadsheetId || '');
  const [editableRows, setEditableRows] = useState<string[][] | null>(null);

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

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expAmt);
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
    const price = parseFloat(shopPrice) || 0;
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
      ['Date', 'Description', 'Category', 'Amount'],
      ...expenses.map((e) => [
        e.date,
        `"${e.description.replace(/"/g, '""')}"`,
        e.category,
        e.amount.toFixed(2),
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadence-expenses-${currentMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalBudgetPct = Math.min(
    100,
    Math.round((totalMonthSpent / Math.max(1, budget.totalLimit)) * 100)
  );

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Monthly Budget, Expenses &amp; Google Sheets
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Read and write live Google Sheets ranges, track monthly budget caps, and manage your shopping cart
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportExpensesCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>

          {!linkedSpreadsheetId ? (
            <button
              type="button"
              onClick={onCreateSpreadsheet}
              disabled={!isGoogleConnected || syncingSheets}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {isGoogleConnected ? 'Create Google Sheet Ledger' : 'Connect Google for Sheets'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <a
                href={`https://docs.google.com/spreadsheets/d/${linkedSpreadsheetId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                {linkedSpreadsheetName || 'Open Sheet'}
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                type="button"
                onClick={onSyncToGoogleSheets}
                disabled={!isGoogleConnected || syncingSheets}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {syncingSheets ? 'Syncing...' : 'Sync Ledger to Sheets'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Live Google Sheets Reader & Writer */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Google Sheets Live Reader &amp; Editor
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select any Google Spreadsheet, inspect tabs, edit cell values directly, and write updates back to Google Sheets
            </p>
          </div>
          <button
            type="button"
            onClick={onRefreshSpreadsheets}
            disabled={!isGoogleConnected || loadingSheetGrid}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingSheetGrid ? 'animate-spin' : ''}`} />
            List My Spreadsheets
          </button>
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
              <option value="">Choose a Google Sheet...</option>
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
            placeholder="Or paste Spreadsheet ID..."
            className="w-64 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100"
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
            Read Sheet
          </button>

          {sheetTabs.length > 0 && linkedSpreadsheetId && (
            <div className="flex items-center gap-1 ml-auto">
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
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-xs text-left">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedGrid.slice(0, 25).map((row, rIdx) => {
                    const colCount = Math.max(4, ...displayedGrid.map((r) => r.length));
                    return (
                      <tr
                        key={rIdx}
                        className={rIdx === 0 ? 'bg-slate-50 dark:bg-[#0B0F17] font-semibold' : ''}
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
                              className="w-full min-w-[90px] bg-transparent px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:bg-blue-500/10 focus:outline-none rounded"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleAddGridRow}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Row
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
                  <Save className="h-3.5 w-3.5" /> Write Changes to Sheet
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isGoogleConnected
              ? 'Click "List My Spreadsheets" or "Create Google Sheet Ledger" to read and edit live spreadsheet cells.'
              : 'Connect Google to read and write live Google Sheets directly inside this table, or use the local ledger below.'}
          </p>
        )}
      </div>

      {/* Budget Overview & Category Caps */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Monthly Budget Tracker ({currentMonth})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Spent ${totalMonthSpent.toFixed(2)} of ${budget.totalLimit.toFixed(2)} ({totalBudgetPct}%)
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span>Monthly Limit ($)</span>
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
            const pct = Math.min(100, Math.round((spent / Math.max(1, limit)) * 100));
            const statusText =
              pct >= 95 ? 'Over / At Cap' : pct >= 75 ? 'Near Cap' : 'Nominal';
            const barClass =
              pct >= 95
                ? 'bg-red-600'
                : pct >= 75
                ? 'bg-amber-500'
                : 'bg-emerald-600';

            return (
              <div
                key={cat}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {cat}
                  </span>
                  <span
                    className={`font-medium ${
                      pct >= 95
                        ? 'text-red-600 dark:text-red-400'
                        : pct >= 75
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {statusText}
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
                    ${spent.toFixed(2)} spent
                  </span>
                  <label className="inline-flex items-center gap-1">
                    <span>Cap $</span>
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
                      aria-label={`${cat} monthly cap`}
                      className="w-16 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-slate-900 dark:text-slate-100"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-Column Ledger & Shopping List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Expense Ledger
              </h3>
            </div>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleExpenseSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              type="text"
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              placeholder="Expense description..."
              className="sm:col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={expAmt}
              onChange={(e) => setExpAmt(e.target.value)}
              placeholder="$ Amount"
              className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100"
            />
            <select
              value={expCat}
              onChange={(e) => setExpCat(e.target.value as ExpenseItem['category'])}
              className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
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
              aria-label="Add expense"
              className="sm:col-span-1 inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Description</th>
                  <th className="py-2 font-medium">Category</th>
                  <th className="py-2 font-medium text-right">Amount</th>
                  <th className="py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap pr-3">
                      {exp.date}
                    </td>
                    <td className="py-2.5 text-slate-900 dark:text-slate-100 pr-3">
                      {exp.description}
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400 pr-3">
                      {exp.category}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                      ${exp.amount.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteExpense(exp.id)}
                        aria-label={`Delete expense ${exp.description}`}
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

        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Shopping List
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {shoppingList.length} items · Est. total ${shoppingTotalEst.toFixed(2)}
                </p>
              </div>
            </div>
            {checkedCount > 0 && (
              <button
                type="button"
                onClick={onConvertCheckedShoppingToExpense}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 whitespace-nowrap cursor-pointer"
              >
                Log {checkedCount} Checked as Expense
              </button>
            )}
          </div>

          <form onSubmit={handleShopSubmit} className="grid grid-cols-12 gap-2">
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Item name..."
              className="col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />
            <input
              type="text"
              value={shopQty}
              onChange={(e) => setShopQty(e.target.value)}
              placeholder="Qty"
              className="col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2 py-2 text-xs text-slate-900 dark:text-slate-100"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              value={shopPrice}
              onChange={(e) => setShopPrice(e.target.value)}
              placeholder="$ Est"
              className="col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-2 py-2 font-mono text-xs text-slate-900 dark:text-slate-100"
            />
            <select
              value={shopCat}
              onChange={(e) => setShopCat(e.target.value as ShoppingItem['category'])}
              className="col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-1.5 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              {SHOP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              aria-label="Add shopping list item"
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
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border cursor-pointer ${
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
                      {item.category} · {item.quantity}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                    ${item.estimatedPrice.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteShoppingItem(item.id)}
                    aria-label={`Delete shopping item ${item.name}`}
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
