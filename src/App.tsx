import React, { useState, useMemo, useEffect } from 'react';
import { api, pollExpenses, type Expense as ApiExpense } from './api';
import {
  Plus,
  Search,
  ArrowRight,
  ArrowLeft,
  ArrowUpDown,
  Check,
  X,
  Trash2,
  Users,
  Edit2,
  Calendar,
  Clock,
  LayoutGrid,
  Filter,
  Sparkles,
  Smile,
  AlertCircle
} from 'lucide-react';

// --- Types ---
export interface Expense {
  id: string;
  title: string;
  merchant: string;
  year: number; // e.g. 2026
  month: number; // 1-12
  monthName: string; // e.g. "November"
  day: number; // 1-31
  fullDate: string; // e.g. "2026-11-05"
  dayOfWeek: string; // e.g. "Thursday"
  time: string; // e.g. "08:45 PM"
  categoryId: string; // e.g. 'food', 'home', 'travel', 'misc'
  amount: number; // your share
  totalBill: number;
  isSplit: boolean;
  splitWith?: string;
  notes?: string;
}

export interface CategoryCard {
  id: string;
  name: string;
  emoji: string;
  budget: number;
  colorBg: string; // neo-brutalist pastel
  isCustom?: boolean;
}

const DEFAULT_CATEGORIES: CategoryCard[] = [
  {
    id: 'food',
    name: 'Food & Dining',
    emoji: '🍔',
    budget: 18000,
    colorBg: '#FEF08A' // Pastel yellow
  },
  {
    id: 'home',
    name: 'Home & Rent',
    emoji: '🏠',
    budget: 32000,
    colorBg: '#DDD6FE' // Pastel purple
  },
  {
    id: 'travel',
    name: 'Travel & Commute',
    emoji: '🚗',
    budget: 7500,
    colorBg: '#BAE6FD' // Pastel blue
  },
  {
    id: 'shopping',
    name: 'Shopping & Fits',
    emoji: '🛍️',
    budget: 10000,
    colorBg: '#FBCFE8' // Pastel pink
  },
  {
    id: 'subs',
    name: 'Subs & Entertainment',
    emoji: '🍿',
    budget: 3000,
    colorBg: '#BBF7D0' // Pastel mint
  },
  {
    id: 'misc',
    name: 'Misc & Daily Spends',
    emoji: '📦',
    budget: 5000,
    colorBg: '#FED7AA' // Pastel orange
  }
];

const EMOJI_OPTIONS = ['🍔', '🏠', '🚗', '🛍️', '🍿', '📦', '🏋️', '✈️', '🎮', '💊', '🐾', '📚', '⚡', '☕', '🎨', '💸'];

const MONTHS = [
  'All Months',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export default function App() {
  const [categories, setCategories] = useState<CategoryCard[]>(DEFAULT_CATEGORIES);
  
  // Requirement: Everything starts at 0 until user adds data!
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load the shared backend database so expenses added by Claude appear here.
  useEffect(() => {
    const toDashboardExpense = (row: ApiExpense): Expense => {
      const d = new Date(`${row.date}T12:00:00`);
      const category = row.category.toLowerCase();
      const categoryId =
        category.includes('food') || category.includes('lunch') || category.includes('coffee') || category.includes('dining') ? 'food' :
        category.includes('transport') || category.includes('petrol') || category.includes('travel') ? 'travel' :
        category.includes('shop') || category.includes('grocer') ? 'shopping' :
        category.includes('home') || category.includes('rent') ? 'home' :
        category.includes('sub') || category.includes('entertain') ? 'subs' : 'misc';
      const monthName = d.toLocaleString('en-IN', { month: 'long' });
      const dayOfWeek = d.toLocaleString('en-IN', { weekday: 'long' });
      return {
        id: row.id,
        title: row.notes || row.merchant,
        merchant: row.merchant,
        year: d.getFullYear(),
        month: d.getMonth(),
        monthName,
        day: d.getDate(),
        fullDate: row.date,
        dayOfWeek,
        time: new Date(row.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        categoryId,
        amount: row.amount,
        totalBill: row.amount,
        isSplit: false,
        notes: row.notes || undefined
      };
    };
    return pollExpenses((rows) => setExpenses(rows.map(toDashboardExpense)), 4000);
  }, []);

  // Total budget target (editable)
  const [customTotalBudget, setCustomTotalBudget] = useState<number>(75000);
  const [isEditingTotalBudget, setIsEditingTotalBudget] = useState(false);
  const [tempTotalBudgetInput, setTempTotalBudgetInput] = useState('');

  // Active view: 'overview' (cards + list) vs 'timeline' (full date & time log)
  const [viewMode, setViewMode] = useState<'overview' | 'timeline'>('overview');

  // Filters for Date & Time Log (Year & Month filters)
  const [filterYear, setFilterYear] = useState<string>('All Years');
  const [filterMonth, setFilterMonth] = useState<string>('All Months');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Panels
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [editingCardLimit, setEditingCardLimit] = useState<{ id: string; name: string; currentBudget: number } | null>(null);
  const [tempCardBudgetInput, setTempCardBudgetInput] = useState('');
  const [isRearrangeMode, setIsRearrangeMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Card Form state
  const [newCardName, setNewCardName] = useState('');
  const [newCardEmoji, setNewCardEmoji] = useState('🏋️');
  const [newCardBudget, setNewCardBudget] = useState('5000');
  const [newCardColor, setNewCardColor] = useState('#BBF7D0');

  // Controlled Add Expense form state (prevents null element reads)
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('food');
  const [expenseMerchant, setExpenseMerchant] = useState('');
  const [expenseDate, setExpenseDate] = useState('2026-11-05');
  const [expenseTime, setExpenseTime] = useState('08:30 PM');
  const [expenseIsSplit, setExpenseIsSplit] = useState(false);
  const [expenseSplitWith, setExpenseSplitWith] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');

  const openAddExpenseModal = () => {
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseCategory(categories[0]?.id || 'food');
    setExpenseMerchant('');
    setExpenseDate('2026-11-05');
    setExpenseTime('08:30 PM');
    setExpenseIsSplit(false);
    setExpenseSplitWith('');
    setExpenseNotes('');
    setIsAddExpenseModalOpen(true);
  };

  // Today's formatted date
  const currentFormattedDate = useMemo(() => {
    return {
      day: 'Thursday',
      date: '5',
      month: 'November',
      year: '2026',
      fullFormatted: 'Thursday, 5 November 2026'
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Move category cards left or right
  const moveCategory = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;
    const clone = [...categories];
    const [item] = clone.splice(index, 1);
    clone.splice(targetIdx, 0, item);
    setCategories(clone);
    triggerToast(`Moved ${item.name} ${direction === 'left' ? 'left' : 'right'}`);
  };

  // Reassign / Move an expense to another category ("put it somewhere else")
  const changeExpenseCategory = (expenseId: string, newCategoryId: string) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === expenseId ? { ...e, categoryId: newCategoryId } : e))
    );
    const target = categories.find((c) => c.id === newCategoryId);
    triggerToast(`Moved to ${target?.emoji} ${target?.name}`);
  };

  // Category stats calculation (will be 0 if expenses is empty)
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach((c) => (map[c.id] = 0));
    expenses.forEach((e) => {
      map[e.categoryId] = (map[e.categoryId] || 0) + e.amount;
    });
    return map;
  }, [categories, expenses]);

  // Total spent (starts at 0)
  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, item) => sum + item.amount, 0);
  }, [expenses]);

  // Available years from expenses or default
  const availableYears = useMemo(() => {
    const years = new Set<number>([2026, 2025]);
    expenses.forEach((e) => years.add(e.year));
    return ['All Years', ...Array.from(years).sort((a, b) => b - a).map(String)];
  }, [expenses]);

  // Sum of all individual card limits
  const totalCardLimitsSum = useMemo(() => {
    return categories.reduce((sum, c) => sum + c.budget, 0);
  }, [categories]);

  const isLimitsExceedingTotal = totalCardLimitsSum > customTotalBudget;
  const limitExceededDiff = totalCardLimitsSum - customTotalBudget;
  const unallocatedAmount = Math.max(0, customTotalBudget - totalCardLimitsSum);

  // Save Card Budget Limit with sum warning
  const handleSaveCardLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCardLimit) return;
    const val = parseFloat(tempCardBudgetInput);
    if (isNaN(val) || val <= 0) return;

    const projectedSum = (totalCardLimitsSum - editingCardLimit.currentBudget) + val;

    setCategories((prev) =>
      prev.map((c) => (c.id === editingCardLimit.id ? { ...c, budget: val } : c))
    );
    setEditingCardLimit(null);

    if (projectedSum > customTotalBudget) {
      triggerToast(
        `⚠️ Warning: Total card limits (₹${projectedSum.toLocaleString('en-IN')}) now exceeds total budget of ₹${customTotalBudget.toLocaleString('en-IN')} by ₹${(projectedSum - customTotalBudget).toLocaleString('en-IN')}!`
      );
    } else {
      triggerToast(`Updated ${editingCardLimit.name} limit to ₹${val.toLocaleString('en-IN')}`);
    }
  };

  // Save Total Overall Budget Limit with sum warning
  const handleSaveTotalBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempTotalBudgetInput);
    if (isNaN(val) || val <= 0) return;
    setCustomTotalBudget(val);
    setIsEditingTotalBudget(false);

    if (totalCardLimitsSum > val) {
      triggerToast(
        `⚠️ Warning: Total budget set to ₹${val.toLocaleString('en-IN')}. Card limits sum (₹${totalCardLimitsSum.toLocaleString('en-IN')}) exceeds it by ₹${(totalCardLimitsSum - val).toLocaleString('en-IN')}!`
      );
    } else {
      triggerToast(`Total monthly budget set to ₹${val.toLocaleString('en-IN')}`);
    }
  };

  // Add new custom category card with sum warning
  const handleCreateNewCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardName.trim()) return;
    const budgetVal = parseFloat(newCardBudget) || 5000;

    const newCat: CategoryCard = {
      id: `custom-${Date.now()}`,
      name: newCardName.trim(),
      emoji: newCardEmoji,
      budget: budgetVal,
      colorBg: newCardColor,
      isCustom: true
    };

    const projectedSum = totalCardLimitsSum + budgetVal;
    setCategories([...categories, newCat]);
    setIsAddCardModalOpen(false);
    setNewCardName('');

    if (projectedSum > customTotalBudget) {
      triggerToast(
        `⚠️ Created card! Card limits sum (₹${projectedSum.toLocaleString('en-IN')}) exceeds total budget of ₹${customTotalBudget.toLocaleString('en-IN')} by ₹${(projectedSum - customTotalBudget).toLocaleString('en-IN')}!`
      );
    } else {
      triggerToast(`Created card: ${newCat.emoji} ${newCat.name}!`);
    }
  };

  // Delete category card
  const handleDeleteCategory = (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (categories.length <= 1) {
      triggerToast('You need to keep at least one category!');
      return;
    }
    const fallbackId = categories.find((c) => c.id !== catId)?.id || 'misc';
    setExpenses((prev) =>
      prev.map((item) => (item.categoryId === catId ? { ...item, categoryId: fallbackId } : item))
    );
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    triggerToast('Category deleted');
  };

  // Filtered expenses with YEAR & MONTH support
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      // Category filter
      const matchCat = selectedCategoryFilter === 'all' || item.categoryId === selectedCategoryFilter;
      
      // Year filter
      const matchYear = filterYear === 'All Years' || item.year.toString() === filterYear;
      
      // Month filter
      const matchMonth = filterMonth === 'All Months' || item.monthName.toLowerCase() === filterMonth.toLowerCase();
      
      // Search
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.splitWith && item.splitWith.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchCat && matchYear && matchMonth && matchSearch;
    });
  }, [expenses, selectedCategoryFilter, filterYear, filterMonth, searchQuery]);

  // Grouped by fullDate for timeline view
  const groupedExpenses = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    filteredExpenses.forEach((exp) => {
      const key = `${exp.dayOfWeek}, ${exp.fullDate}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(exp);
    });
    return groups;
  }, [filteredExpenses]);

  // Delete single expense
  const handleDeleteExpense = async (id: string) => {
    try {
      await api.remove(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      triggerToast('Expense deleted');
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Could not delete expense');
    }
  };

  return (
    <div className="min-h-screen text-black flex flex-col font-sans selection:bg-yellow-300 relative overflow-x-hidden">
      {/* Decorative Neo-Brutalist Sticker Graphics */}
      <div className="fixed -top-10 -right-10 w-44 h-44 rounded-full bg-[#f472b6] border-3 border-black shadow-[5px_5px_0px_0px_#000] -z-10 pointer-events-none hidden md:block">
        <div className="absolute inset-0 flex items-center justify-center font-black text-2xl rotate-12">
          ✦
        </div>
      </div>
      <div className="fixed bottom-10 -left-10 w-36 h-36 rounded-full bg-[#fde047] border-3 border-black shadow-[5px_5px_0px_0px_#000] -z-10 pointer-events-none hidden md:block">
        <div className="absolute inset-0 flex items-center justify-center font-black text-xl -rotate-12">
          ₹
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#fde047] text-black border-2 border-black font-extrabold text-xs px-5 py-2.5 rounded-full shadow-[4px_4px_0px_0px_#000] flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* --- MINIMAL HEADER: NAME & ESSENTIALS ONLY --- */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b-3 border-black px-4 sm:px-8 py-3.5 shadow-[0px_4px_0px_0px_#000]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo Name Only */}
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-black flex items-center gap-1 uppercase">
              <span>spendsync</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#ec4899] border-2 border-black inline-block mb-1"></span>
            </span>
          </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* View Switcher: Cards vs Date & Time Log */}
            <div className="bg-black p-0.5 rounded-xl flex items-center text-xs font-black">
              <button
                onClick={() => setViewMode('overview')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'overview'
                    ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                    : 'text-white hover:text-yellow-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'timeline'
                    ? 'bg-[#bbf7d0] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                    : 'text-white hover:text-emerald-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Date & Time Log</span>
              </button>
            </div>

            {/* Quick Add Expense */}
            <button
              onClick={openAddExpenseModal}
              className="neo-btn px-4 py-1.5 rounded-xl bg-[#ec4899] text-white text-xs font-black flex items-center gap-1.5 shadow-[3px_3px_0px_0px_#000] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ ADD SPEND</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- MAIN DASHBOARD CONTAINER --- */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-7 w-full space-y-7 flex-1 z-10">
        {/* RETRO WINDOW HERO: DAY, DATE, YEAR & EDITABLE TOTAL BUDGET */}
        <div className="bg-white rounded-2xl border-3 border-black shadow-[6px_6px_0px_0px_#000] overflow-hidden">
          {/* Retro Window Title Bar */}
          <div className="bg-[#bbf7d0] border-b-3 border-black px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 font-mono text-xs font-black">
                <span className="w-3 h-3 rounded-full bg-[#f43f5e] border-2 border-black inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-[#fde047] border-2 border-black inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-[#22c55e] border-2 border-black inline-block"></span>
              </div>
              <span className="text-xs font-black uppercase tracking-wider ml-2">
                PERSONAL MONEY DASHBOARD
              </span>
            </div>

            {/* Full Day, Date, Year Display */}
            <div className="bg-white border-2 border-black px-2.5 py-0.5 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000]">
              <Calendar className="w-3.5 h-3.5 text-black" />
              <span>{currentFormattedDate.fullFormatted.toUpperCase()}</span>
            </div>
          </div>

          {/* Window Body */}
          <div className="p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white">
            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                CURRENT SPEND THIS CYCLE
              </span>

              {/* Big chunky numbers */}
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-5xl sm:text-6xl font-black tracking-tight text-black">
                  ₹{totalSpent.toLocaleString('en-IN')}
                </span>
                <span className="text-sm font-bold text-slate-600">
                  spent of
                </span>

                {/* Editable Total Monthly Limit Pill */}
                <div
                  onClick={() => {
                    setTempTotalBudgetInput(customTotalBudget.toString());
                    setIsEditingTotalBudget(true);
                  }}
                  className="neo-btn inline-flex items-center gap-1.5 bg-[#fde047] px-3 py-1.5 rounded-xl cursor-pointer text-sm font-black border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000]"
                  title="Click to edit your total monthly limit"
                >
                  <span>₹{customTotalBudget.toLocaleString('en-IN')}</span>
                  <Edit2 className="w-3.5 h-3.5" />
                </div>
              </div>

              <p className="text-xs font-bold text-slate-600">
                {totalSpent === 0 ? (
                  <span className="text-emerald-700 font-black">
                    🎉 Starting fresh at ₹0! Full ₹{customTotalBudget.toLocaleString('en-IN')} safe-to-spend ready.
                  </span>
                ) : (
                  <span>
                    ₹{Math.max(0, customTotalBudget - totalSpent).toLocaleString('en-IN')} safe-to-spend remaining.
                  </span>
                )}
              </p>
            </div>

            {/* Actions: Add Extra Card (ONLY IN THIS ONE PLACE!) & Rearrange */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Single dedicated Add Extra Card Button */}
              <button
                onClick={() => setIsAddCardModalOpen(true)}
                className="neo-btn px-4 py-2 rounded-xl text-xs font-black bg-[#ddd6fe] hover:bg-[#c4b5fd] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ ADD EXTRA CARD</span>
              </button>

              <button
                onClick={() => setIsRearrangeMode(!isRearrangeMode)}
                className={`neo-btn px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border-2 border-black shadow-[3px_3px_0px_0px_#000] cursor-pointer ${
                  isRearrangeMode
                    ? 'bg-[#fed7aa] text-black'
                    : 'bg-white hover:bg-slate-100 text-black'
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{isRearrangeMode ? 'DONE REARRANGING' : 'REARRANGE CARDS'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* --- BUDGET ALLOCATION & SUM WARNING BAR --- */}
        <div
          className={`neo-box p-4 rounded-2xl border-2 border-black transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isLimitsExceedingTotal ? 'bg-[#fca5a5]' : 'bg-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000] ${
              isLimitsExceedingTotal ? 'bg-black text-white' : 'bg-[#bbf7d0] text-black'
            }`}>
              <AlertCircle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
                <span>Card Limits Sum vs Total Spend Budget</span>
                <span className={`text-[10px] px-2 py-0.5 rounded border border-black font-black ${
                  isLimitsExceedingTotal ? 'bg-black text-white' : 'bg-[#bbf7d0] text-emerald-950'
                }`}>
                  {isLimitsExceedingTotal ? 'OVER-ALLOCATED' : 'WITHIN BUDGET'}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-700 mt-0.5">
                Sum of card limits: <strong className="text-black font-black">₹{totalCardLimitsSum.toLocaleString('en-IN')}</strong> of{' '}
                <strong className="text-black font-black">₹{customTotalBudget.toLocaleString('en-IN')}</strong> total limit
              </div>
            </div>
          </div>

          <div className="text-xs font-black sm:text-right">
            {isLimitsExceedingTotal ? (
              <span className="text-rose-950 bg-white/70 px-3 py-1 rounded-lg border border-black inline-block">
                ⚠️ Over total limit by ₹{limitExceededDiff.toLocaleString('en-IN')}!
              </span>
            ) : (
              <span className="text-emerald-900 bg-[#bbf7d0] px-3 py-1 rounded-lg border border-black inline-block">
                ✓ ₹{unallocatedAmount.toLocaleString('en-IN')} unallocated (can be lesser than ₹{customTotalBudget.toLocaleString('en-IN')})
              </span>
            )}
          </div>
        </div>

        {/* --- CARDS SECTION (NEO-BRUTALISM GRID) --- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider bg-black text-white px-2.5 py-1 rounded-md inline-block">
              CATEGORIES & LIMITS ({categories.length})
            </h2>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-800 hidden sm:inline">
                Click "LIMIT" on any card to edit
              </span>
              {selectedCategoryFilter !== 'all' && (
                <button
                  onClick={() => setSelectedCategoryFilter('all')}
                  className="text-xs font-black bg-white px-2 py-0.5 border-2 border-black rounded shadow-[2px_2px_0px_0px_#000]"
                >
                  Show All
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {categories.map((cat, idx) => {
              const spent = categoryStats[cat.id] || 0;
              const pct = Math.min(100, Math.round((spent / cat.budget) * 100));
              const isSelected = selectedCategoryFilter === cat.id;

              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    if (!isRearrangeMode) {
                      setSelectedCategoryFilter(isSelected ? 'all' : cat.id);
                    }
                  }}
                  style={{ backgroundColor: cat.colorBg }}
                  className={`neo-box rounded-2xl p-4 border-2 border-black transition-all cursor-pointer flex flex-col justify-between min-h-[160px] ${
                    isSelected ? 'ring-4 ring-black scale-[1.02]' : 'hover:-translate-y-1'
                  } ${isRearrangeMode ? 'border-dashed' : ''}`}
                >
                  {/* Card Top: Emoji + Reorder Buttons or Custom Delete */}
                  <div className="flex items-start justify-between">
                    <span className="text-2xl p-1.5 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                      {cat.emoji}
                    </span>

                    {isRearrangeMode ? (
                      <div className="flex items-center gap-1 bg-white border-2 border-black p-0.5 rounded-lg" onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={idx === 0}
                          onClick={() => moveCategory(idx, 'left')}
                          className="p-1 hover:bg-slate-200 rounded disabled:opacity-20"
                          title="Move card left"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          disabled={idx === categories.length - 1}
                          onClick={() => moveCategory(idx, 'right')}
                          className="p-1 hover:bg-slate-200 rounded disabled:opacity-20"
                          title="Move card right"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {cat.isCustom && (
                          <button
                            onClick={(e) => handleDeleteCategory(cat.id, e)}
                            className="p-1 bg-white hover:bg-rose-100 text-rose-600 border border-black rounded transition-colors"
                            title="Delete custom card"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        <span className="text-[10px] font-black bg-white px-1.5 py-0.5 rounded border border-black">
                          {pct}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="mt-3">
                    <div className="text-xs font-black text-black truncate" title={cat.name}>
                      {cat.name}
                    </div>
                    <div className="text-lg font-black text-black mt-0.5 tracking-tight">
                      ₹{spent.toLocaleString('en-IN')}
                    </div>

                    {/* EDITABLE CARD LIMIT: Clickable pill */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCardLimit({ id: cat.id, name: cat.name, currentBudget: cat.budget });
                        setTempCardBudgetInput(cat.budget.toString());
                      }}
                      className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white hover:bg-yellow-200 text-[10px] font-black border border-black cursor-pointer shadow-[1.5px_1.5px_0px_0px_#000] transition-colors"
                      title="Click to edit this card's limit"
                    >
                      <span>limit ₹{cat.budget.toLocaleString('en-IN')}</span>
                      <Edit2 className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  {/* Neo-brutalist Progress Bar */}
                  <div className="mt-3 w-full bg-white h-2 rounded-full border-2 border-black overflow-hidden">
                    <div
                      className="h-full bg-black transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- VIEW 1: CARDS OVERVIEW FEED --- */}
        {viewMode === 'overview' && (
          <div className="bg-white rounded-2xl border-3 border-black shadow-[6px_6px_0px_0px_#000] p-5 sm:p-6 space-y-4">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-black">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase text-black">
                  {selectedCategoryFilter === 'all'
                    ? 'TRANSACTIONS FEED'
                    : `${categories.find((c) => c.id === selectedCategoryFilter)?.emoji} ${
                        categories.find((c) => c.id === selectedCategoryFilter)?.name
                      }`}
                </h3>
                <span className="text-xs font-black px-2 py-0.5 rounded bg-[#fde047] border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                  {filteredExpenses.length}
                </span>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-black absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search food, rent, uber..."
                  className="w-full pl-9 pr-3 py-1.5 bg-[#f8fafc] text-xs font-bold rounded-xl border-2 border-black outline-none focus:bg-white shadow-[2px_2px_0px_0px_#000]"
                />
              </div>
            </div>

            {/* Expenses List */}
            <div className="space-y-2.5">
              {filteredExpenses.length === 0 ? (
                <div className="py-14 text-center border-2 border-dashed border-black rounded-2xl bg-[#f8fafc] p-6">
                  <div className="text-4xl mb-2">💸</div>
                  <h4 className="font-black text-sm text-black uppercase">
                    ALL CLEAN · ₹0 SPENT RECORDED
                  </h4>
                  <p className="text-xs font-bold text-slate-500 mt-1 max-w-sm mx-auto">
                    No transactions recorded yet! Click <span className="text-[#ec4899] font-black">+ ADD SPEND</span> to log your first expense.
                  </p>
                  <button
                    onClick={openAddExpenseModal}
                    className="mt-4 neo-btn px-4 py-2 rounded-xl bg-[#ec4899] text-white text-xs font-black border-2 border-black shadow-[3px_3px_0px_0px_#000] inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>RECORD FIRST EXPENSE</span>
                  </button>
                </div>
              ) : (
                filteredExpenses.map((expense) => {
                  const category = categories.find((c) => c.id === expense.categoryId);
                  return (
                    <div
                      key={expense.id}
                      className="p-3.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] bg-white hover:bg-yellow-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Left: Emoji & Details */}
                      <div className="flex items-start gap-3">
                        <div
                          style={{ backgroundColor: category?.colorBg || '#fef08a' }}
                          className="w-10 h-10 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center text-xl flex-shrink-0"
                        >
                          {category?.emoji || '💸'}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-black">
                              {expense.title}
                            </span>
                            {expense.isSplit && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#ddd6fe] text-black border border-black flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>Split with {expense.splitWith}</span>
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-bold text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{expense.dayOfWeek}, {expense.fullDate}</span>
                            <span>•</span>
                            <span className="text-black">{expense.time}</span>
                            <span>•</span>
                            <span>{expense.merchant}</span>
                          </div>

                          {expense.notes && (
                            <div className="text-[11px] font-medium text-slate-600 italic mt-0.5">
                              "{expense.notes}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Amount & Category Switcher */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0">
                        <div className="text-left sm:text-right">
                          <div className="font-black text-lg text-black">
                            ₹{expense.amount.toLocaleString('en-IN')}
                          </div>
                          {expense.isSplit && (
                            <div className="text-[10px] font-bold text-slate-400 line-through">
                              Total: ₹{expense.totalBill.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>

                        {/* Move / Category Switcher (Put it somewhere else) */}
                        <div className="flex items-center gap-1.5">
                          <select
                            value={expense.categoryId}
                            onChange={(e) => changeExpenseCategory(expense.id, e.target.value)}
                            className="text-xs font-black bg-[#f1f5f9] hover:bg-yellow-100 text-black px-2 py-1.5 rounded-lg border-2 border-black outline-none cursor-pointer shadow-[2px_2px_0px_0px_#000]"
                            title="Move to another category"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.emoji} {c.name}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* --- VIEW 2: FULL DATE & TIME LOG (WITH YEAR & MONTH FILTERING!) --- */}
        {viewMode === 'timeline' && (
          <div className="bg-white rounded-2xl border-3 border-black shadow-[6px_6px_0px_0px_#000] p-5 sm:p-6 space-y-5">
            {/* Filter Bar: Year & Month Filter Requested */}
            <div className="p-4 rounded-xl bg-[#f8fafc] border-2 border-black flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-sm uppercase text-black flex items-center gap-2">
                  <Clock className="w-4 h-4 text-black" />
                  <span>DATE & TIME EXPENSE LOG</span>
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-0.5">
                  Filter by Year and Month to audit all transactions with exact clock timestamps.
                </p>
              </div>

              {/* Filters Dropdown */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Year Filter */}
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                  <span className="text-[10px] font-black uppercase text-slate-500">Year:</span>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="text-xs font-black bg-transparent outline-none cursor-pointer"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Month Filter */}
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                  <span className="text-[10px] font-black uppercase text-slate-500">Month:</span>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="text-xs font-black bg-transparent outline-none cursor-pointer"
                  >
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters */}
                {(filterYear !== 'All Years' || filterMonth !== 'All Months') && (
                  <button
                    onClick={() => {
                      setFilterYear('All Years');
                      setFilterMonth('All Months');
                    }}
                    className="text-xs font-black text-rose-600 hover:underline px-2 py-1"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Grouped Table View */}
            <div className="space-y-6">
              {Object.keys(groupedExpenses).length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-black rounded-2xl bg-[#f8fafc]">
                  <Clock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <div className="font-black text-sm text-black uppercase">
                    NO EXPENSES MATCH {filterYear} / {filterMonth}
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-1">
                    Try changing your month or year filters, or add a spend for this period!
                  </p>
                </div>
              ) : (
                Object.entries(groupedExpenses).map(([dateGroup, items]) => (
                  <div key={dateGroup} className="space-y-2">
                    {/* Date Header Pill */}
                    <div className="flex items-center justify-between">
                      <div className="neo-box-sm bg-[#bbf7d0] px-3 py-1 rounded-lg text-xs font-black uppercase">
                        📅 {dateGroup}
                      </div>
                      <span className="text-xs font-black text-black">
                        Day Total: ₹{items.reduce((sum, i) => sum + i.amount, 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Table Rows with Time */}
                    <div className="border-2 border-black rounded-xl overflow-hidden divide-y-2 divide-black bg-white">
                      {items.map((exp) => {
                        const cat = categories.find((c) => c.id === exp.categoryId);
                        return (
                          <div key={exp.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-yellow-50/40 transition-colors">
                            <div className="flex items-center gap-3">
                              {/* Exact Time Badge */}
                              <div className="px-2.5 py-1 rounded-md bg-[#f1f5f9] border border-black font-mono text-[11px] font-black flex items-center gap-1 shadow-[1px_1px_0px_0px_#000]">
                                <Clock className="w-3 h-3 text-slate-600" />
                                <span>{exp.time}</span>
                              </div>

                              <span className="text-xl">{cat?.emoji}</span>

                              <div>
                                <div className="font-black text-xs sm:text-sm text-black">
                                  {exp.title}
                                </div>
                                <div className="text-[11px] font-bold text-slate-500">
                                  {exp.merchant} {exp.splitWith ? `· Split with ${exp.splitWith}` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0">
                              <span
                                style={{ backgroundColor: cat?.colorBg }}
                                className="text-[10px] font-black px-2 py-0.5 rounded border border-black"
                              >
                                {cat?.name}
                              </span>

                              <div className="font-black text-sm text-black">
                                ₹{exp.amount.toLocaleString('en-IN')}
                              </div>

                              {/* Put it somewhere else dropdown */}
                              <select
                                value={exp.categoryId}
                                onChange={(e) => changeExpenseCategory(exp.id, e.target.value)}
                                className="text-[11px] font-black bg-white px-1.5 py-1 rounded border border-black cursor-pointer"
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.emoji} {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: EDIT CARD BUDGET LIMIT */}
      {/* ========================================================================= */}
      {editingCardLimit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="neo-box bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h3 className="font-black text-base text-black uppercase">
                EDIT CARD LIMIT
              </h3>
              <button onClick={() => setEditingCardLimit(null)} className="font-black hover:text-rose-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCardLimit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-black font-black mb-1">
                  Budget limit for <span className="bg-[#fde047] px-1 border border-black">{editingCardLimit.name}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-500">₹</span>
                  <input
                    type="number"
                    step="100"
                    required
                    value={tempCardBudgetInput}
                    onChange={(e) => setTempCardBudgetInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[#f8fafc] rounded-xl border-2 border-black font-mono font-black text-lg text-black outline-none shadow-[2px_2px_0px_0px_#000]"
                  />
                </div>
              </div>

              {/* Live allocation warning / status */}
              {(() => {
                const enteredVal = parseFloat(tempCardBudgetInput) || 0;
                const projected = (totalCardLimitsSum - editingCardLimit.currentBudget) + enteredVal;
                const isOver = projected > customTotalBudget;
                return (
                  <div className={`p-2.5 rounded-xl border-2 border-black text-xs font-bold ${isOver ? 'bg-[#fca5a5]' : 'bg-[#bbf7d0]'}`}>
                    <div className="flex justify-between items-center">
                      <span>Projected Card Limits Total:</span>
                      <span className="font-mono font-black">₹{projected.toLocaleString('en-IN')} / ₹{customTotalBudget.toLocaleString('en-IN')}</span>
                    </div>
                    {isOver ? (
                      <p className="text-[11px] font-black text-rose-950 mt-1">
                        ⚠️ Warning: Total card limits will exceed your total budget (₹{customTotalBudget.toLocaleString('en-IN')}) by ₹{(projected - customTotalBudget).toLocaleString('en-IN')}!
                      </p>
                    ) : (
                      <p className="text-[11px] font-bold text-emerald-950 mt-1">
                        ✓ Within total budget (₹{(customTotalBudget - projected).toLocaleString('en-IN')} unallocated)
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setEditingCardLimit(null)}
                  className="px-4 py-2 font-black text-black hover:underline"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="neo-btn px-5 py-2 rounded-xl bg-[#bbf7d0] text-black font-black border-2 border-black shadow-[3px_3px_0px_0px_#000]"
                >
                  SAVE LIMIT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT OVERALL TOTAL BUDGET */}
      {/* ========================================================================= */}
      {isEditingTotalBudget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="neo-box bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <h3 className="font-black text-base text-black uppercase">
                  EDIT TOTAL MONTHLY LIMIT
                </h3>
                <p className="text-[11px] font-bold text-slate-500">Your total target spend ceiling</p>
              </div>
              <button onClick={() => setIsEditingTotalBudget(false)} className="font-black hover:text-rose-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTotalBudget} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-black font-black mb-1">
                  Overall Monthly Target (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-500">₹</span>
                  <input
                    type="number"
                    step="500"
                    required
                    value={tempTotalBudgetInput}
                    onChange={(e) => setTempTotalBudgetInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[#f8fafc] rounded-xl border-2 border-black font-mono font-black text-lg text-black outline-none shadow-[2px_2px_0px_0px_#000]"
                  />
                </div>
              </div>

              {/* Live comparison against card limits */}
              {(() => {
                const enteredTotal = parseFloat(tempTotalBudgetInput) || 0;
                const isOver = totalCardLimitsSum > enteredTotal;
                return (
                  <div className={`p-2.5 rounded-xl border-2 border-black text-xs font-bold ${isOver ? 'bg-[#fca5a5]' : 'bg-[#bbf7d0]'}`}>
                    <div className="flex justify-between items-center">
                      <span>Sum of current card limits:</span>
                      <span className="font-mono font-black">₹{totalCardLimitsSum.toLocaleString('en-IN')}</span>
                    </div>
                    {isOver ? (
                      <p className="text-[11px] font-black text-rose-950 mt-1">
                        ⚠️ Warning: Current card limits (₹{totalCardLimitsSum.toLocaleString('en-IN')}) will exceed this budget by ₹{(totalCardLimitsSum - enteredTotal).toLocaleString('en-IN')}!
                      </p>
                    ) : (
                      <p className="text-[11px] font-bold text-emerald-950 mt-1">
                        ✓ Card limits (₹{totalCardLimitsSum.toLocaleString('en-IN')}) fit within this total limit.
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setIsEditingTotalBudget(false)}
                  className="px-4 py-2 font-black text-black hover:underline"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="neo-btn px-5 py-2 rounded-xl bg-[#fde047] text-black font-black border-2 border-black shadow-[3px_3px_0px_0px_#000]"
                >
                  UPDATE TOTAL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD EXTRA CUSTOM CARD (ONLY ACCESSED FROM TOP BUTTON!) */}
      {/* ========================================================================= */}
      {isAddCardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="neo-box bg-white rounded-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <h3 className="font-black text-base text-black uppercase">
                  CREATE EXTRA CATEGORY CARD
                </h3>
                <p className="text-[11px] font-bold text-slate-500">Add Gym, Pets, Gifts, Vacation, Health, etc.</p>
              </div>
              <button onClick={() => setIsAddCardModalOpen(false)} className="font-black hover:text-rose-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCard} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-black font-black mb-1">Card Name</label>
                <input
                  required
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  placeholder="e.g. Gym & Fitness, Vacation, Pets"
                  className="w-full p-2.5 bg-[#f8fafc] rounded-xl border-2 border-black outline-none font-bold"
                />
              </div>

              {/* Emoji Picker */}
              <div>
                <label className="block text-black font-black mb-1.5">Pick an Icon</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewCardEmoji(em)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border-2 border-black transition-all ${
                        newCardEmoji === em
                          ? 'bg-[#fde047] shadow-[2px_2px_0px_0px_#000] scale-110'
                          : 'bg-white hover:bg-slate-100'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Limit */}
              <div>
                <label className="block text-black font-black mb-1">Monthly Spending Limit (₹)</label>
                <input
                  type="number"
                  step="500"
                  required
                  value={newCardBudget}
                  onChange={(e) => setNewCardBudget(e.target.value)}
                  className="w-full p-2.5 bg-[#f8fafc] rounded-xl border-2 border-black font-mono font-black"
                />
              </div>

              {/* Live projection warning */}
              {(() => {
                const enteredVal = parseFloat(newCardBudget) || 0;
                const projected = totalCardLimitsSum + enteredVal;
                const isOver = projected > customTotalBudget;
                return (
                  <div className={`p-2.5 rounded-xl border-2 border-black text-xs font-bold ${isOver ? 'bg-[#fca5a5]' : 'bg-[#bbf7d0]'}`}>
                    <div className="flex justify-between items-center">
                      <span>Projected Card Limits Total:</span>
                      <span className="font-mono font-black">₹{projected.toLocaleString('en-IN')} / ₹{customTotalBudget.toLocaleString('en-IN')}</span>
                    </div>
                    {isOver && (
                      <p className="text-[11px] font-black text-rose-950 mt-1">
                        ⚠️ Warning: Adding this card will make card limits exceed your total budget by ₹{(projected - customTotalBudget).toLocaleString('en-IN')}!
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setIsAddCardModalOpen(false)}
                  className="px-4 py-2 font-black text-black hover:underline"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="neo-btn px-5 py-2 rounded-xl bg-[#ddd6fe] text-black font-black border-2 border-black shadow-[3px_3px_0px_0px_#000]"
                >
                  CREATE CARD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD EXPENSE (WITH EXACT DATE & TIME) */}
      {/* ========================================================================= */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="neo-box bg-white rounded-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h3 className="font-black text-base text-black uppercase">
                ADD A SPEND
              </h3>
              <button onClick={() => setIsAddExpenseModalOpen(false)} className="font-black hover:text-rose-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!expenseTitle.trim()) {
                  triggerToast('Please enter what you spent on');
                  return;
                }
                const parsedAmount = parseFloat(expenseAmount);
                if (isNaN(parsedAmount) || parsedAmount <= 0) {
                  triggerToast('Please enter a valid amount');
                  return;
                }

                const d = new Date(expenseDate || '2026-11-05');
                const year = d.getFullYear() || 2026;
                const month = d.getMonth() + 1;
                const monthName = MONTHS[month] || 'November';
                const day = d.getDate() || 5;
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const dayOfWeek = days[d.getDay()] || 'Thursday';

                const newExp: Expense = {
                  id: `exp-${Date.now()}`,
                  title: expenseTitle.trim(),
                  merchant: expenseMerchant.trim() || 'Store',
                  year,
                  month,
                  monthName,
                  day,
                  fullDate: expenseDate || '2026-11-05',
                  dayOfWeek,
                  time: expenseTime || '08:30 PM',
                  categoryId: expenseCategory || 'food',
                  amount: parsedAmount,
                  totalBill: expenseIsSplit ? parsedAmount * 2 : parsedAmount,
                  isSplit: expenseIsSplit,
                  splitWith: expenseIsSplit ? (expenseSplitWith.trim() || 'Friends') : undefined,
                  notes: expenseNotes.trim() || undefined
                };

                try {
                  await api.create({
                    merchant: newExp.merchant,
                    amount: newExp.amount,
                    currency: 'INR',
                    category: newExp.categoryId,
                    date: newExp.fullDate,
                    notes: newExp.title + (newExp.notes ? ` — ${newExp.notes}` : ''),
                    status: 'pending'
                  });
                  setIsAddExpenseModalOpen(false);
                  triggerToast(`Logged ₹${parsedAmount.toLocaleString('en-IN')} for ${newExp.title}!`);
                } catch (error) {
                  triggerToast(error instanceof Error ? error.message : 'Could not save expense');
                }
              }}
              className="space-y-3.5 text-xs font-bold"
            >
              <div>
                <label className="block text-black font-black mb-1">What did you spend on?</label>
                <input
                  required
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="e.g. Swiggy Dinner, Coffee, Blinkit, Rent"
                  className="w-full p-2.5 bg-[#f8fafc] rounded-xl border-2 border-black outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-black font-black mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="1200"
                    className="w-full p-2.5 bg-[#f8fafc] rounded-xl border-2 border-black outline-none font-mono font-black text-sm"
                  />
                </div>
                <div>
                  <label className="block text-black font-black mb-1">Category Card</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full p-2.5 bg-[#f8fafc] rounded-xl border-2 border-black outline-none font-black"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Exact Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-black font-black mb-1">Date</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full p-2.5 bg-[#f8fafc] rounded-xl border-2 border-black outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-black font-black mb-1">Time</label>
                  <input
                    type="text"
                    value={expenseTime}
                    onChange={(e) => setExpenseTime(e.target.value)}
                    placeholder="e.g. 08:30 PM"
                    className="w-full p-2.5 bg-[#f8fafc] rounded-xl border-2 border-black outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-black font-black mb-1">Store / Place</label>
                <input
                  value={expenseMerchant}
                  onChange={(e) => setExpenseMerchant(e.target.value)}
                  placeholder="e.g. Third Wave Coffee, Blinkit, Zudio"
                  className="w-full p-2.5 bg-[#f8fafc] rounded-xl border-2 border-black outline-none"
                />
              </div>

              {/* Split Toggle */}
              <div className="bg-[#ddd6fe] p-3 rounded-xl border-2 border-black space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-black text-black">
                  <input
                    type="checkbox"
                    checked={expenseIsSplit}
                    onChange={(e) => setExpenseIsSplit(e.target.checked)}
                    className="rounded border-2 border-black"
                  />
                  <span>Split this bill with friends / flatmates?</span>
                </label>
                {expenseIsSplit && (
                  <input
                    value={expenseSplitWith}
                    onChange={(e) => setExpenseSplitWith(e.target.value)}
                    placeholder="Who did you split with? (e.g. Sara, Aman)"
                    className="w-full p-2 bg-white rounded-lg border-2 border-black outline-none text-xs font-bold"
                  />
                )}
              </div>

              {/* Notes field */}
              <div>
                <label className="block text-black font-black mb-1">Notes (Optional)</label>
                <input
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="e.g. GPay share, cash, personal"
                  className="w-full p-2.5 bg-[#f8fafc] rounded-xl border-2 border-black outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="px-4 py-2 font-black text-black hover:underline"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="neo-btn px-5 py-2 rounded-xl bg-[#ec4899] text-white font-black border-2 border-black shadow-[3px_3px_0px_0px_#000]"
                >
                  SAVE SPEND
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MINIMAL FOOTER --- */}
      <footer className="py-5 px-4 sm:px-8 border-t-3 border-black bg-white text-center text-xs font-black uppercase mt-auto z-10">
        <span>spendsync</span> · Neo-Brutalist Personal Money Manager
      </footer>
    </div>
  );
}
