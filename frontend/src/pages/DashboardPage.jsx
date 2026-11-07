import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar 
} from 'recharts';
import { 
  TrendingDown, TrendingUp, AlertTriangle, ShieldCheck, Filter, Eye, EyeOff, 
  Trash2, ShoppingBag, UtensilsCrossed, Car, Plane, Zap, RefreshCw, Calendar,
  ChevronLeft, ChevronRight
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

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboard({
        month: selectedMonth,
        year: selectedYear,
        include_events: includeEvents,
      });
      setDashboardData(data);

      const expList = await api.getExpenses({
        month: selectedMonth,
        year: selectedYear,
        include_events: includeEvents,
        limit: 50,
      });
      setExpenses(expList);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear, includeEvents]);

  const handleDeleteExpense = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.deleteExpense(id);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  const summary = dashboardData?.summary || {};
  const categories = dashboardData?.category_breakdown || [];
  const timeline = dashboardData?.timeline || [];
  const payments = dashboardData?.payment_breakdown || [];
  const currency = user?.currency_symbol || '₹';

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

      {/* KPI Cards (2x2 on Mobile, 4 columns on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Total Spend Card */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span className="truncate">Spent in {MONTH_NAMES[selectedMonth - 1].slice(0, 3)}</span>
            <span className="p-1 sm:p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <TrendingDown className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-white tracking-tight truncate">
            {currency}{(summary.total_spent || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between">
            <span className="truncate">Budget: {currency}{(summary.monthly_budget || 0).toLocaleString('en-IN')}</span>
            <span className={`font-semibold shrink-0 ${summary.budget_used_percentage > 85 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {summary.budget_used_percentage || 0}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-1 sm:h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                summary.budget_used_percentage > 90 
                  ? 'bg-rose-500' 
                  : summary.budget_used_percentage > 75 
                  ? 'bg-amber-400' 
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, summary.budget_used_percentage || 0)}%` }}
            />
          </div>
        </div>

        {/* Daily Burn Rate Card */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span className="truncate">Daily Burn</span>
            <span className="p-1 sm:p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
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
          className="p-3.5 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 shadow-lg cursor-pointer transition-colors active:scale-95"
        >
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span className="truncate">Sinking Funds</span>
            <span className="p-1 sm:p-1.5 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
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
          className="p-3.5 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 shadow-lg cursor-pointer transition-colors active:scale-95"
        >
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span className="truncate">Net Udhar</span>
            <span className="p-1 sm:p-1.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-white tracking-tight truncate">
            {currency}{((summary.total_lent_unsettled || 0) - (summary.total_borrowed_unsettled || 0)).toLocaleString('en-IN')}
          </div>
          <div className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between">
            <span className="text-emerald-400 font-mono truncate">+{currency}{(summary.total_lent_unsettled || 0).toLocaleString('en-IN')}</span>
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
        <div className={`lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl ${
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
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
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
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val) => [`${currency}${val}`, 'Spent']}
                  labelFormatter={(day) => `Day ${day} (${MONTH_NAMES[selectedMonth - 1]})`}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#spendGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Donut Chart */}
        <div className={`p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between ${
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
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
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

                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors active:scale-95"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                                title="Delete transaction"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

        {/* Payment Modes & Quick UPI Insights */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Payment Rail Distribution</h2>
            <p className="text-[11px] text-slate-400">UPI vs Cards vs NetBanking</p>
          </div>

          <div className="h-48 w-full my-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payments} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="mode" type="category" stroke="#94A3B8" fontSize={11} width={80} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  formatter={(val) => [`${currency}${val.toLocaleString('en-IN')}`, 'Amount']}
                />
                <Bar dataKey="amount" fill="#3B82F6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-semibold block mb-0.5">💡 Indian FinTip:</span>
            92% of everyday micro-outflows happen on UPI. Set daily UPI limits on your banking app to cap impulsive ordering!
          </div>

        </div>

      </div>

    </div>
  );
}
