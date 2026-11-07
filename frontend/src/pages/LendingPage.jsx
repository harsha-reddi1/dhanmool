import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  HandCoins, Plus, ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock, Trash2, Calendar, UserCheck 
} from 'lucide-react';

export default function LendingPage({ onOpenQuickAdd }) {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Repayment Modal
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [selectedLending, setSelectedLending] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayNotes, setRepayNotes] = useState('');
  const [repaymentsList, setRepaymentsList] = useState([]);

  const loadLending = async () => {
    setLoading(true);
    try {
      const data = await api.getLending({
        direction: directionFilter || undefined,
        status_filter: statusFilter || undefined,
      });
      setRecords(data.records || []);
      setSummary(data.summary || {});
    } catch (err) {
      console.error('Failed to load lending records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLending();
  }, [directionFilter, statusFilter]);

  // Reactive background refresh when lending cache is invalidated
  useEffect(() => {
    const handleInvalidation = (e) => {
      const tags = e.detail?.tags || [];
      if (tags.length === 0 || tags.includes('lending')) {
        loadLending();
      }
    };
    window.addEventListener('dhanmool:cache-invalidated', handleInvalidation);
    return () => window.removeEventListener('dhanmool:cache-invalidated', handleInvalidation);
  }, [directionFilter, statusFilter]);

  const openRepayModal = async (rec) => {
    setSelectedLending(rec);
    setRepayAmount(rec.outstanding_amount);
    try {
      const repData = await api.getRepayments(rec.id);
      setRepaymentsList(repData.repayments || []);
    } catch (err) {
      setRepaymentsList([]);
    }
    setShowRepayModal(true);
  };

  const handleRecordRepayment = async (e) => {
    e.preventDefault();
    if (!repayAmount || parseFloat(repayAmount) <= 0) return;
    try {
      await api.addRepayment(selectedLending.id, {
        amount: parseFloat(repayAmount),
        notes: repayNotes,
      });
      setShowRepayModal(false);
      setRepayAmount('');
      setRepayNotes('');
      loadLending();
    } catch (err) {
      alert(err.message || 'Failed to record repayment');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this lending entry?')) return;
    try {
      await api.deleteLending(id);
      loadLending();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  const currency = user?.currency_symbol || '₹';

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-amber-400" />
            Informal Udhar & Lending Tracker
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track 1-on-1 money lent to or borrowed from family, friends and flatmates with repayment settlements.
          </p>
        </div>

        <button
          onClick={onOpenQuickAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Record New Udhar</span>
        </button>
      </div>

      {/* Summary KPI Cards (Compact 3-metric row for phones & desktop) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        
        {/* Money Lent (To Collect) */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-[10px] sm:text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <span className="truncate">Lent (Get)</span>
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          </div>
          <div className="text-base sm:text-2xl font-bold font-mono text-emerald-300 truncate">
            {currency}{(summary.total_lent_outstanding || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 hidden sm:block">Awaiting return</p>
        </div>

        {/* Money Borrowed (To Pay) */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-[10px] sm:text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">
            <span className="truncate">Borrowed (Pay)</span>
            <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          </div>
          <div className="text-base sm:text-2xl font-bold font-mono text-rose-400 truncate">
            {currency}{(summary.total_borrowed_outstanding || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 hidden sm:block">You need to return</p>
        </div>

        {/* Net Udhar Position */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-[10px] sm:text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
            <span className="truncate">Net Position</span>
            <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          </div>
          <div className="text-base sm:text-2xl font-bold font-mono text-white truncate">
            {currency}{(summary.net_position || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 hidden sm:block">
            {(summary.net_position || 0) >= 0 ? 'Surplus to collect' : 'Deficit to return'}
          </p>
        </div>

      </div>

      {/* Filter Tabs (Horizontal scrollable chips on mobile) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 p-2.5 sm:p-3 rounded-2xl border border-slate-800 text-xs">
        
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setDirectionFilter('')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 active:scale-95 ${
              directionFilter === '' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Directions
          </button>
          <button
            onClick={() => setDirectionFilter('lent')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 active:scale-95 ${
              directionFilter === 'lent' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            I Lent (Gave)
          </button>
          <button
            onClick={() => setDirectionFilter('borrowed')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 active:scale-95 ${
              directionFilter === 'borrowed' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            I Borrowed (Took)
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-slate-500 text-xs">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none text-xs"
          >
            <option value="">All Statuses</option>
            <option value="unsettled">Unsettled</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="settled">Settled</option>
          </select>
        </div>

      </div>

      {/* Records Grid */}
      {records.length === 0 && !loading ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <HandCoins className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Udhar Records Found</h3>
          <p className="text-xs text-slate-400">
            Track small or large informal loans with zero friction.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((rec) => {
            const isLent = rec.direction === 'lent';
            const isSettled = rec.status === 'settled';
            const isPartial = rec.status === 'partially_paid';

            return (
              <div 
                key={rec.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                      isLent 
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}>
                      {isLent ? 'Lent to' : 'Borrowed from'} ({rec.contact_type})
                    </span>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isSettled 
                        ? 'bg-slate-800 text-slate-400' 
                        : isPartial 
                        ? 'bg-amber-500/20 text-amber-300' 
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {rec.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white truncate">{rec.contact_name}</h3>
                  {rec.contact_phone && (
                    <p className="text-[11px] text-slate-400 font-mono">📞 {rec.contact_phone}</p>
                  )}
                  {rec.notes && (
                    <p className="text-xs text-slate-400 mt-1 italic">"{rec.notes}"</p>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Outstanding</p>
                      <p className="text-xl font-bold font-mono text-white">
                        {currency}{parseFloat(rec.outstanding_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Principal</p>
                      <p className="text-xs font-mono text-slate-400">
                        {currency}{parseFloat(rec.principal_amount).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  {rec.expected_repayment_date && (
                    <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Due: <strong className="text-slate-300">{rec.expected_repayment_date}</strong></span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => handleDelete(rec.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {!isSettled ? (
                    <button
                      onClick={() => openRepayModal(rec)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Record Repayment</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-medium">Fully Settled</span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Record Repayment Modal (Mobile bottom sheet with quick-settle buttons) */}
      {showRepayModal && selectedLending && (
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowRepayModal(false)}
        >
          <div 
            className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl bg-slate-900 border-t sm:border border-slate-800 p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto sm:hidden mb-1" />
            <h3 className="text-base font-bold text-white">Record Settlement / Repayment</h3>
            <p className="text-xs text-slate-400">
              Contact: <strong className="text-white">{selectedLending.contact_name}</strong> | Outstanding: <strong className="text-emerald-400 font-mono">{currency}{parseFloat(selectedLending.outstanding_amount).toLocaleString('en-IN')}</strong>
            </p>

            <form onSubmit={handleRecordRepayment} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Repayment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedLending.outstanding_amount}
                  required
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />

                {/* Quick settlement chips for 1-tap mobile operation */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setRepayAmount(selectedLending.outstanding_amount.toString())}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap cursor-pointer hover:bg-emerald-500/30 active:scale-95 transition-all"
                  >
                    Full (₹{parseFloat(selectedLending.outstanding_amount).toLocaleString('en-IN')})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepayAmount((parseFloat(selectedLending.outstanding_amount) / 2).toFixed(2))}
                    className="text-[11px] font-mono px-2 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 whitespace-nowrap cursor-pointer hover:bg-slate-700 active:scale-95"
                  >
                    50%
                  </button>
                  {[500, 1000, 2000].map((amt) => {
                    if (amt < parseFloat(selectedLending.outstanding_amount)) {
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setRepayAmount(amt.toString())}
                          className="text-[11px] font-mono px-2 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 whitespace-nowrap cursor-pointer hover:bg-slate-700 active:scale-95"
                        >
                          +{amt}
                        </button>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via PhonePe, Cash handed over"
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {repaymentsList.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Previous Repayments:</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {repaymentsList.map((r) => (
                      <div key={r.id} className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>{r.repayment_date}:</span>
                        <span className="font-mono text-emerald-400">+{currency}{r.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRepayModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs active:scale-95"
                >
                  Confirm Repayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
