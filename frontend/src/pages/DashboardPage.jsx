import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import EditExpenseModal from '../components/EditExpenseModal';
import { 
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar 
} from 'recharts';
import { 
  TrendingDown, TrendingUp, AlertTriangle, ShieldCheck, Filter, Eye, EyeOff, 
  Trash2, Edit2, ShoppingBag, UtensilsCrossed, Car, Plane, Zap, RefreshCw, Calendar,
  ChevronLeft, ChevronRight, Mic, Check, RotateCcw, Sparkles, Clipboard, Compass, Coffee, ShoppingBasket, ArrowUpRight, ArrowDownRight, Flame
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DashboardPage({ onOpenQuickAdd, onOpenEvents, onOpenLending }) {
  const { user } = useAuth();
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [includeEvents, setIncludeEvents] = useState(false); // Isolated sinking fund by default!
  const [chartTab, setChartTab] = useState('timeline'); // Mobile chart toggle

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);

  // 1-Tap Quick Spend & Voice States
  const [quickInput, setQuickInput] = useState('');
  const [isQuickLogging, setIsQuickLogging] = useState(false);
  const [quickNotice, setQuickNotice] = useState('');
  const [lastQuickSaved, setLastQuickSaved] = useState(null);
  const [isUndoing, setIsUndoing] = useState(false);

  const { isListening: isDashListening, toggleListening: toggleDashListening } = useSpeechRecognition({
    lang: 'en-IN',
    onResult: (transcript, isFinal) => {
      setQuickInput(transcript);
      if (isFinal) {
        handleDashQuickLog(transcript);
      }
    },
    onError: (err) => {
      setQuickNotice(err);
      setTimeout(() => setQuickNotice(''), 4000);
    },
  });

  const handleDashQuickLog = async (overrideText) => {
    const textToLog = (overrideText || quickInput || '').trim();
    if (!textToLog) return;
    setIsQuickLogging(true);
    setQuickNotice('Logging...');
    try {
      const parsed = await api.parseNL(textToLog);
      if (!parsed.amount || parsed.amount <= 0) {
        onOpenQuickAdd();
        return;
      }

      let savedRecord = null;
      if (parsed.is_lending) {
        savedRecord = await api.createLending({
          contact_name: parsed.contact_name || parsed.merchant || 'Friend',
          contact_type: 'friend',
          direction: parsed.lending_direction || 'lent',
          principal_amount: parseFloat(parsed.amount),
          lent_date: new Date().toISOString().split('T')[0],
          notes: parsed.notes,
        });
      } else {
        savedRecord = await api.createExpense({
          amount: parseFloat(parsed.amount),
          category_id: parsed.category_id || null,
          merchant: parsed.merchant || 'General Spend',
          payment_mode: parsed.payment_mode || 'UPI',
          spent_at: new Date().toISOString().split('T')[0],
          notes: parsed.notes,
        });
      }

      loadData(true);
      setLastQuickSaved({
        id: savedRecord.id,
        type: parsed.is_lending ? 'lending' : 'expense',
        amount: parsed.amount,
        merchant: parsed.is_lending ? `Lent to ${parsed.contact_name || 'Friend'}` : (parsed.merchant || 'General Spend'),
        payment_mode: parsed.payment_mode || 'UPI',
      });
      setQuickInput('');
      setQuickNotice(`⚡ Logged ₹${parsed.amount} to ${parsed.merchant || 'Spend'} (${parsed.payment_mode || 'UPI'})!`);
      setTimeout(() => setQuickNotice(''), 6000);
    } catch (err) {
      console.error(err);
      setQuickNotice(err.message || 'Could not log. Tap + to add manually.');
    } finally {
      setIsQuickLogging(false);
    }
  };

  const handleDashUndo = async () => {
    if (!lastQuickSaved) return;
    setIsUndoing(true);
    try {
      if (lastQuickSaved.type === 'lending') {
        await api.deleteLending(lastQuickSaved.id);
      } else {
        await api.deleteExpense(lastQuickSaved.id);
      }
      setLastQuickSaved(null);
      setQuickNotice('Transaction undone.');
      loadData(true);
    } catch (err) {
      alert('Failed to undo transaction');
    } finally {
      setIsUndoing(false);
    }
  };

  const handlePasteSMS = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        setQuickNotice('Clipboard read not supported in this browser. Please paste into the box.');
        setTimeout(() => setQuickNotice(''), 4000);
        return;
      }
      const clipText = await navigator.clipboard.readText();
      if (!clipText || !clipText.trim()) {
        setQuickNotice('Clipboard is empty. Copy bank SMS or UPI receipt text first.');
        setTimeout(() => setQuickNotice(''), 4000);
        return;
      }
      setQuickInput(clipText.trim());
      setQuickNotice('Analyzing copied text...');
      const parsed = await api.parseNL(clipText.trim());
      if (parsed.amount && parsed.amount > 0) {
        setQuickNotice(`Detected: ₹${parsed.amount} at ${parsed.merchant || 'Spend'}. Click Log ⚡ to save!`);
      } else {
        setQuickNotice('Parsed text. Please confirm amount and tap Log ⚡.');
      }
    } catch (err) {
      setQuickNotice('Please allow clipboard access or paste directly into the box.');
      setTimeout(() => setQuickNotice(''), 4000);
    }
  };

  // Load auxiliary data for editing modal
  useEffect(() => {
    Promise.all([api.getEvents(), api.getProjects()])
      .then(([evList, projList]) => {
        setEvents(evList || []);
        setProjects(projList || []);
      })
      .catch(() => {});
  }, []);

  const loadData = async (bypassCache = false) => {
    // Only trigger full loading screen if we don't have any cached data yet
    if (!dashboardData) {
      setLoading(true);
    }
    try {
      const [data, expList] = await Promise.all([
        api.getDashboard({
          month: selectedMonth,
          year: selectedYear,
          include_events: includeEvents,
        }, bypassCache),
        api.getExpenses({
          month: selectedMonth,
          year: selectedYear,
          include_events: includeEvents,
          limit: 50,
        }, bypassCache),
      ]);
      setDashboardData(data);
      setExpenses(expList || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear, includeEvents]);

  // Reactive listener to revalidate dashboard in background when cache invalidates
  useEffect(() => {
    const handleInvalidation = (e) => {
      const tags = e.detail?.tags || [];
      if (tags.length === 0 || tags.includes('dashboard') || tags.includes('expenses')) {
        loadData(true);
      }
    };
    window.addEventListener('dhanmool:cache-invalidated', handleInvalidation);
    return () => window.removeEventListener('dhanmool:cache-invalidated', handleInvalidation);
  }, [selectedMonth, selectedYear, includeEvents]);

  const handleDeleteExpense = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.deleteExpense(id);
      loadData(true);
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  const summary = dashboardData?.summary || {};
  const categories = dashboardData?.category_breakdown || [];
  const timeline = dashboardData?.timeline || [];
  const payments = dashboardData?.payment_breakdown || [];
  const currency = user?.currency_symbol || '₹';

  // Kharcha Radar calculations (Micro-Spends <= ₹100)
  const microExpenses = expenses.filter(e => parseFloat(e.amount) <= 100);
  const microTotal = microExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const microCount = microExpenses.length;
  const microPercentOfTotal = expenses.length > 0 ? Math.round((microCount / expenses.length) * 100) : 0;
  
  const microChai = microExpenses.filter(e => /chai|tea|coffee/i.test(e.merchant || '') || /chai|tea|coffee/i.test(e.notes || ''));
  const microChaiTotal = microChai.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const microAuto = microExpenses.filter(e => /auto|metro|rapido|cab|petrol/i.test(e.merchant || '') || /commute/i.test(e.dm_categories?.name || ''));
  const microAutoTotal = microAuto.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const microQuick = microExpenses.filter(e => /blinkit|zepto|snack|bakery|dmart/i.test(e.merchant || '') || /groceries|food/i.test(e.dm_categories?.name || ''));
  const microQuickTotal = microQuick.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  // Delta Intelligence calculations
  const isCurrentMonth = selectedMonth === (today.getMonth() + 1) && selectedYear === today.getFullYear();
  const currentDay = today.getDate();
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const expectedPacingPct = Math.round((currentDay / daysInMonth) * 100);
  const actualBudgetPct = summary.budget_used_percentage || 0;
  const budgetPacingDelta = actualBudgetPct - expectedPacingPct;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Month Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 sm:p-4 rounded-2xl">
        <div className="flex items-center justify-between sm:block">
          <div>
            <h1 className="text-base sm:text-xl font-bold text-white tracking-tight">
              Financial Dashboard
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 hidden sm:block">
              Real-time Indian cashflow, UPI micro-spends & sinking fund analysis.
            </p>
          </div>

          {/* Quick Month Switcher for Mobile */}
          <div className="flex sm:hidden items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-md text-slate-400 hover:text-white active:scale-90"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-white font-mono px-1">
              {MONTH_NAMES[selectedMonth - 1].slice(0, 3)} '{selectedYear.toString().slice(-2)}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-md text-slate-400 hover:text-white active:scale-90"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          
          {/* Month & Year Selectors (Desktop) */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white">
            <button
              onClick={handlePrevMonth}
              className="p-0.5 rounded text-slate-400 hover:text-white"
              title="Previous Month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx + 1} value={idx + 1} className="bg-slate-900">
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent text-white focus:outline-none cursor-pointer font-mono"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-slate-900">
                  {y}
                </option>
              ))}
            </select>
            <button
              onClick={handleNextMonth}
              className="p-0.5 rounded text-slate-400 hover:text-white"
              title="Next Month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sinking Fund Isolation Toggle */}
          <button
            onClick={() => setIncludeEvents(!includeEvents)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
              includeEvents
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
            title="Toggle whether one-off vacation or festival sinking fund spends skew your standard monthly living averages"
          >
            {includeEvents ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{includeEvents ? 'Events On' : 'Sinking Funds Isolated'}</span>
          </button>

          <button
            onClick={loadData}
            className="p-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

        </div>
      </div>

      {/* 1-Tap Quick Spend & Voice Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-emerald-500/25 shadow-lg shadow-emerald-500/5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-Tap Quick Spend</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Speak e.g. "Swiggy 450", "Auto 80 cash", "Chai 20"
          </span>
        </div>

        {/* Listening banner */}
        {isDashListening && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-bold text-rose-300">Listening to voice...</span>
            </div>
            <span className="text-[11px] text-slate-400">Speak now (auto-saves on speech end)</span>
          </div>
        )}

        {/* Input Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={isDashListening ? "Listening... speak now" : 'Tap mic or type: "Swiggy 450", "Auto 80 cash", "Chai 20"'}
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleDashQuickLog())}
              className={`w-full bg-slate-950 border rounded-xl pl-3 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all ${
                isDashListening ? 'border-rose-500/60 ring-2 ring-rose-500/30' : 'border-slate-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50'
              }`}
            />
            <button
              type="button"
              onClick={toggleDashListening}
              title={isDashListening ? "Stop listening" : "Speak transaction details"}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all cursor-pointer ${
                isDashListening 
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleDashQuickLog()}
            disabled={isQuickLogging || !quickInput.trim()}
            className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">{isQuickLogging ? 'Logging...' : 'Log ⚡'}</span>
            <span className="sm:hidden">{isQuickLogging ? '...' : 'Log ⚡'}</span>
          </button>
        </div>

        {/* 1-Tap Quick Chips & SMS Sniffer */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={handlePasteSMS}
            title="Read bank SMS or payment text from clipboard"
            className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold whitespace-nowrap active:scale-95 transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Clipboard className="w-3 h-3" />
            <span>Paste SMS</span>
          </button>

          {[
            { label: '☕ Chai ₹20', text: 'Chai 20 cash' },
            { label: '🍲 Swiggy ₹350', text: 'Swiggy 350 upi' },
            { label: '🛺 Auto ₹80', text: 'Auto 80 cash' },
            { label: '🥦 Blinkit ₹450', text: 'Blinkit 450 upi' },
            { label: '⛽ Petrol ₹500', text: 'Petrol 500 upi' },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleDashQuickLog(chip.text)}
              disabled={isQuickLogging}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-emerald-500/10 hover:border-emerald-500/40 border border-slate-800 text-[11px] text-slate-300 font-medium whitespace-nowrap active:scale-95 transition-all cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Status / Undo Notice */}
        {quickNotice && (
          <div className="flex items-center justify-between text-[11px] text-emerald-400 pt-0.5 animate-in fade-in">
            <span className="flex items-center gap-1.5 truncate">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{quickNotice}</span>
            </span>
            {lastQuickSaved && (
              <button
                type="button"
                onClick={handleDashUndo}
                disabled={isUndoing}
                className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold flex items-center gap-1 cursor-pointer active:scale-95 shrink-0 ml-2"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isUndoing ? 'Undoing...' : 'Undo'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* "Tell Me What Changed" Delta Intelligence Card (Copilot & Fold inspired) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0a0f1d] border border-white/8 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00f5a0]/15 to-emerald-500/15 border border-[#00f5a0]/30 flex items-center justify-center text-[#00f5a0] shrink-0 shadow-[0_0_15px_rgba(0,245,160,0.15)]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">Tell Me What Changed</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00f5a0]/15 text-[#00f5a0] border border-[#00f5a0]/30 font-semibold">
                Delta Intel
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {isCurrentMonth ? (
                budgetPacingDelta < -5 ? (
                  <>🟢 <strong>Healthy Discipline:</strong> Budget consumption ({actualBudgetPct}%) is <span className="text-[#00f5a0] font-bold font-mono">{Math.abs(budgetPacingDelta)}% lower</span> than Day {currentDay} expected pace ({expectedPacingPct}%).</>
                ) : budgetPacingDelta > 10 ? (
                  <>🔴 <strong>Pacing Warning:</strong> Budget consumption ({actualBudgetPct}%) is <span className="text-rose-400 font-bold font-mono">{budgetPacingDelta}% ahead</span> of Day {currentDay} baseline ({expectedPacingPct}%). Cool down discretionary spends.</>
                ) : (
                  <>🟢 <strong>On Track:</strong> Spending pace ({actualBudgetPct}%) is balanced with Day {currentDay} target ({expectedPacingPct}% of monthly budget).</>
                )
              ) : (
                <>Historical Ledger: Reviewing completed cash outflows for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.</>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenQuickAdd}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700/60 transition-all cursor-pointer active:scale-95 shrink-0 self-end sm:self-center"
        >
          Add Spend →
        </button>
      </div>

      {/* KPI Cards (2x2 on Mobile, 4 columns on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Total Spend Card */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-[#0a0f1d] border border-[#00f5a0]/30 shadow-[0_0_20px_rgba(0,245,160,0.06)] relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span className="truncate">Spent in {MONTH_NAMES[selectedMonth - 1].slice(0, 3)}</span>
            <span className="p-1 sm:p-1.5 rounded-lg bg-[#00f5a0]/15 text-[#00f5a0] shrink-0">
              <TrendingDown className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-white tracking-tight truncate">
            {currency}{(summary.total_spent || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between">
            <span className="truncate">Budget: {currency}{(summary.monthly_budget || 0).toLocaleString('en-IN')}</span>
            <span className={`font-semibold shrink-0 ${summary.budget_used_percentage > 85 ? 'text-rose-400' : 'text-[#00f5a0]'}`}>
              {summary.budget_used_percentage || 0}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800/80 h-1 sm:h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                summary.budget_used_percentage > 90 
                  ? 'bg-rose-500' 
                  : summary.budget_used_percentage > 75 
                  ? 'bg-amber-400' 
                  : 'bg-[#00f5a0] shadow-[0_0_8px_#00f5a0]'
              }`}
              style={{ width: `${Math.min(100, summary.budget_used_percentage || 0)}%` }}
            />
          </div>
        </div>

        {/* Daily Burn Rate Card */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-[#0a0f1d] border border-white/8 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span className="truncate">Daily Burn</span>
            <span className="p-1 sm:p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-white tracking-tight truncate">
            {currency}{(summary.daily_burn_rate || 0).toLocaleString('en-IN')}
            <span className="text-[10px] sm:text-xs text-slate-400 font-sans font-normal"> /day</span>
          </div>
          <div className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400 truncate">
            Projected: <span className="font-semibold text-slate-200 font-mono">{currency}{(summary.projected_month_end || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Sinking Fund Pool Card */}
        <div 
          onClick={onOpenEvents}
          className="p-3.5 sm:p-5 rounded-2xl bg-[#0a0f1d] border border-purple-500/30 hover:border-purple-500/50 shadow-lg cursor-pointer transition-colors active:scale-95"
        >
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span className="truncate">Sinking Funds</span>
            <span className="p-1 sm:p-1.5 rounded-lg bg-purple-500/15 text-purple-400 shrink-0">
              <Plane className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-purple-300 tracking-tight truncate">
            {currency}{(summary.isolated_event_spend || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-1.5 text-[10px] sm:text-[11px] text-purple-400/80 flex items-center justify-between">
            <span className="truncate">Festivals & Trips</span>
            <span className="underline font-semibold shrink-0">View →</span>
          </div>
        </div>

        {/* Informal Udhar Net Position Card */}
        <div 
          onClick={onOpenLending}
          className="p-3.5 sm:p-5 rounded-2xl bg-[#0a0f1d] border border-amber-500/30 hover:border-amber-500/50 shadow-lg cursor-pointer transition-colors active:scale-95"
        >
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span className="truncate">Net Udhar</span>
            <span className="p-1 sm:p-1.5 rounded-lg bg-amber-500/15 text-amber-400 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-white tracking-tight truncate">
            {currency}{((summary.total_lent_unsettled || 0) - (summary.total_borrowed_unsettled || 0)).toLocaleString('en-IN')}
          </div>
          <div className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between">
            <span className="text-[#00f5a0] font-mono truncate">+{currency}{(summary.total_lent_unsettled || 0).toLocaleString('en-IN')}</span>
            <span className="underline text-amber-300 font-semibold shrink-0">Udhar →</span>
          </div>
        </div>

      </div>

      {/* Mobile Chart Segmented Toggle */}
      <div className="flex lg:hidden bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
        <button
          type="button"
          onClick={() => setChartTab('timeline')}
          className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
            chartTab === 'timeline' ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700 shadow-sm' : 'text-slate-400'
          }`}
        >
          Daily Rhythm
        </button>
        <button
          type="button"
          onClick={() => setChartTab('categories')}
          className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
            chartTab === 'categories' ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700 shadow-sm' : 'text-slate-400'
          }`}
        >
          Category Split
        </button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Timeline Area Chart */}
        <div className={`lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-[#0a0f1d] border border-white/8 shadow-xl ${
          chartTab === 'timeline' ? 'block' : 'hidden lg:block'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Daily Spending Rhythm</h2>
              <p className="text-[11px] text-slate-400">Day-by-day cash outflows across this month</p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </span>
          </div>

          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F5A0" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00F5A0" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="day" 
                  stroke="#4B5563" 
                  fontSize={10} 
                  tickLine={false}
                />
                <YAxis 
                  stroke="#4B5563" 
                  fontSize={10} 
                  tickLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0F1D', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val) => [`${currency}${val}`, 'Spent']}
                  labelFormatter={(day) => `Day ${day} (${MONTH_NAMES[selectedMonth - 1]})`}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#00F5A0" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#spendGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Donut Chart */}
        <div className={`p-4 sm:p-5 rounded-2xl bg-[#0a0f1d] border border-white/8 shadow-xl flex flex-col justify-between ${
          chartTab === 'categories' ? 'flex' : 'hidden lg:flex'
        }`}>
          <div>
            <h2 className="text-sm font-semibold text-white">Category Distribution</h2>
            <p className="text-[11px] text-slate-400">Where your money flowed this month</p>
          </div>

          <div className="h-52 w-full my-2">
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#10B981'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                    formatter={(val) => [`${currency}${val.toLocaleString('en-IN')}`, 'Spent']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No spends logged for this period
              </div>
            )}
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {categories.slice(0, 4).map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-300 truncate">{cat.name.split(' ')[0]}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-white font-medium">{currency}{cat.amount.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-slate-400 ml-1.5">({cat.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* Transactions & Payment Methods Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Transactions List */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0a0f1d] border border-white/8 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Recent Transactions</h2>
              <p className="text-[11px] text-slate-400">Latest expense outflows (Gross Outflow model)</p>
            </div>
            <button
              onClick={onOpenQuickAdd}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
            >
              + Log Transaction
            </button>
          </div>

          <div>
            {expenses.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No expenses found for this month. Click "+ Add Spend" above to log one!
              </div>
            ) : (
              <>
                {/* Mobile Cards View (Visible on < md) */}
                <div className="block md:hidden space-y-2.5">
                  {expenses.map((exp) => {
                    const cat = exp.dm_categories || {};
                    const isEventLinked = Boolean(exp.event_id);
                    return (
                      <div 
                        key={exp.id} 
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col gap-2 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{ 
                                backgroundColor: `${cat.color || '#6366F1'}20`, 
                                color: cat.color || '#818CF8',
                                border: `1px solid ${cat.color || '#6366F1'}40` 
                              }}
                            >
                              {cat.name ? cat.name.split('(')[0].trim() : 'General'}
                            </span>
                            <span className="text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                              {exp.payment_mode || 'UPI'}
                            </span>
                            {isEventLinked && (
                              <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">
                                Sinking Fund
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingExpense(exp)}
                              className="p-1 rounded text-slate-500 hover:text-indigo-400 active:text-indigo-300 transition-colors active:scale-95 cursor-pointer"
                              title="Edit transaction"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 active:text-rose-300 transition-colors active:scale-95 cursor-pointer"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-baseline justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-white text-sm truncate">
                              {exp.merchant || 'Expense'}
                            </p>
                            {exp.notes && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {exp.notes}
                              </p>
                            )}
                          </div>
                          <p className="font-mono font-bold text-white text-base shrink-0">
                            {currency}{parseFloat(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
                          <span>{exp.spent_at}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View (Visible on >= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-medium">
                        <th className="pb-3 pl-1">Date</th>
                        <th className="pb-3">Merchant / Item</th>
                        <th className="pb-3">Category</th>
                        <th className="pb-3">Mode</th>
                        <th className="pb-3 text-right">Amount</th>
                        <th className="pb-3 text-right pr-1">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {expenses.map((exp) => {
                        const cat = exp.dm_categories || {};
                        const isEventLinked = Boolean(exp.event_id);
                        return (
                          <tr key={exp.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 pl-1 font-mono text-slate-400 whitespace-nowrap">
                              {exp.spent_at}
                            </td>
                            <td className="py-3">
                              <div className="font-medium text-white truncate max-w-[160px]">
                                {exp.merchant || 'Expense'}
                              </div>
                              {exp.notes && (
                                <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                                  {exp.notes}
                                </div>
                              )}
                              {isEventLinked && (
                                <span className="inline-block mt-0.5 text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded border border-purple-500/30">
                                  Event Sinking Fund
                                </span>
                              )}
                            </td>
                            <td className="py-3">
                              <span 
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                style={{ 
                                  backgroundColor: `${cat.color || '#6366F1'}20`, 
                                  color: cat.color || '#818CF8',
                                  border: `1px solid ${cat.color || '#6366F1'}40` 
                                }}
                              >
                                {cat.name ? cat.name.split('(')[0].trim() : 'General'}
                              </span>
                            </td>
                            <td className="py-3 text-slate-300">
                              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                                {exp.payment_mode || 'UPI'}
                              </span>
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-white whitespace-nowrap">
                              {currency}{parseFloat(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 text-right pr-1">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingExpense(exp)}
                                  className="p-1 rounded text-slate-500 hover:text-indigo-400 active:text-indigo-300 transition-colors cursor-pointer"
                                  title="Edit transaction"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  className="p-1 rounded text-slate-500 hover:text-rose-400 active:text-rose-300 transition-colors cursor-pointer"
                                  title="Delete transaction"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

        </div>

        {/* Right Column: Kharcha Radar & Payment Rail Distribution */}
        <div className="space-y-6">
          
          {/* Kharcha Radar (Micro-Spends <= ₹100) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0a0f1d] border border-emerald-500/30 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#00f5a0]/15 text-[#00f5a0] border border-[#00f5a0]/30 shrink-0">
                  <Compass className="w-4 h-4 animate-spin-slow" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Kharcha Radar</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-[#00f5a0] border border-emerald-500/30 font-mono">
                      ≤ ₹100
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Impulse & Tapri Tracker</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-mono text-[#00f5a0]">{currency}{microTotal.toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-slate-400 font-mono">{microCount} micro-spends</div>
              </div>
            </div>

            {/* Micro breakdown pills */}
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-slate-400 text-[10px] flex items-center justify-center gap-1">
                  <Coffee className="w-3 h-3 text-amber-400" />
                  <span>Chai</span>
                </div>
                <div className="text-xs font-bold font-mono text-white mt-0.5">{currency}{microChaiTotal}</div>
                <div className="text-[9px] text-slate-500">{microChai.length} times</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-slate-400 text-[10px] flex items-center justify-center gap-1">
                  <Car className="w-3 h-3 text-blue-400" />
                  <span>Auto</span>
                </div>
                <div className="text-xs font-bold font-mono text-white mt-0.5">{currency}{microAutoTotal}</div>
                <div className="text-[9px] text-slate-500">{microAuto.length} times</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-slate-400 text-[10px] flex items-center justify-center gap-1">
                  <ShoppingBasket className="w-3 h-3 text-purple-400" />
                  <span>Snacks</span>
                </div>
                <div className="text-xs font-bold font-mono text-white mt-0.5">{currency}{microQuickTotal}</div>
                <div className="text-[9px] text-slate-500">{microQuick.length} times</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-slate-300 flex items-center justify-between">
              <span>
                <strong>{microPercentOfTotal}%</strong> of transactions are under ₹100.
              </span>
              <span className="text-[10px] text-[#00f5a0] font-semibold">
                {microCount > 12 ? 'Active 🔥' : 'Balanced 🌿'}
              </span>
            </div>
          </div>

          {/* Payment Modes & Quick UPI Insights */}
          <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-white/8 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Payment Rail Distribution</h2>
              <p className="text-[11px] text-slate-400">UPI vs Cards vs NetBanking</p>
            </div>

            <div className="h-44 w-full my-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payments} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="mode" type="category" stroke="#94A3B8" fontSize={11} width={80} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                    formatter={(val) => [`${currency}${val.toLocaleString('en-IN')}`, 'Amount']}
                  />
                  <Bar dataKey="amount" fill="#00f5a0" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
              <span className="text-[#00f5a0] font-semibold block mb-0.5">💡 Indian FinTip:</span>
              92% of everyday micro-outflows happen on UPI. Set daily UPI limits on your banking app to cap impulsive ordering!
            </div>
          </div>

        </div>

      </div>

      {/* Edit Expense Modal */}
      <EditExpenseModal
        isOpen={Boolean(editingExpense)}
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onExpenseUpdated={() => loadData(true)}
        events={events}
        projects={projects}
      />

    </div>
  );
}
