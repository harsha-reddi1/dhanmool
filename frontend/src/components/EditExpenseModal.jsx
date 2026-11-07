import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, Edit2, Calendar, ShoppingBag } from 'lucide-react';

export default function EditExpenseModal({ 
  isOpen, 
  expense, 
  onClose, 
  onExpenseUpdated, 
  events = [], 
  projects = [] 
}) {
  const [categories, setCategories] = useState([]);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [spentAt, setSpentAt] = useState('');
  const [notes, setNotes] = useState('');
  const [eventId, setEventId] = useState('');
  const [sharedProjectId, setSharedProjectId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch categories (cached)
  useEffect(() => {
    if (isOpen) {
      api.getCategories()
        .then(cats => setCategories(cats || []))
        .catch(err => console.error('Failed to load categories', err));
    }
  }, [isOpen]);

  // Pre-fill form when expense changes
  useEffect(() => {
    if (expense) {
      setAmount(expense.amount ? expense.amount.toString() : '');
      setMerchant(expense.merchant || '');
      setCategoryId(expense.category_id ? expense.category_id.toString() : '');
      setPaymentMode(expense.payment_mode || 'UPI');
      setSpentAt(expense.spent_at || new Date().toISOString().split('T')[0]);
      setNotes(expense.notes || '');
      setEventId(expense.event_id || '');
      setSharedProjectId(expense.shared_project_id || '');
      setErrorMsg('');
    }
  }, [expense]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !expense) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }
    if (!merchant.trim()) {
      setErrorMsg('Please enter a merchant or description.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await api.updateExpense(expense.id, {
        amount: parseFloat(amount),
        merchant: merchant.trim(),
        category_id: categoryId ? parseInt(categoryId, 10) : null,
        payment_mode: paymentMode,
        spent_at: spentAt,
        notes: notes.trim() || null,
        event_id: eventId || null,
        shared_project_id: sharedProjectId || null,
      });

      if (onExpenseUpdated) {
        onExpenseUpdated();
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setRelativeDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setSpentAt(d.toISOString().split('T')[0]);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-slate-900 border-t sm:border border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1 bg-slate-700/60 rounded-full mx-auto mt-2.5 mb-0.5 shrink-0 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
              <Edit2 className="w-4 h-4" />
            </span>
            <h3 className="text-base font-semibold text-white">Edit Expense Record</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 momentum-scroll">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Amount Input with Quick Chips */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-sm font-semibold">₹</span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-base font-bold text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Quick Increment Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
              {[100, 200, 500, 1000, 2000].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setAmount(prev => ((parseFloat(prev) || 0) + chip).toString())}
                  className="text-[11px] font-mono px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 border border-slate-700/60 whitespace-nowrap cursor-pointer transition-colors"
                >
                  +{chip}
                </button>
              ))}
            </div>
          </div>

          {/* Merchant / Description */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Merchant / Spend Item *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Swiggy, Uber, Kirana store, Amazon"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category & Payment Mode Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Payment Mode
              </label>
              <div className="grid grid-cols-4 gap-1">
                {['UPI', 'Card', 'Cash', 'NetBanking'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-1.5 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                      paymentMode === mode
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {mode === 'NetBanking' ? 'NetBank' : mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date with Quick Chips */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Date Spent *
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRelativeDate(0)}
                  className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    spentAt === new Date().toISOString().split('T')[0]
                      ? 'bg-indigo-500/20 text-indigo-300 font-bold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setRelativeDate(1)}
                  className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded cursor-pointer"
                >
                  Yesterday
                </button>
              </div>
            </div>
            <input
              type="date"
              required
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Link to Sinking Fund / Event */}
          {events.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Tag to Sinking Fund / Event (Optional)
              </label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">No linked sinking fund (Standard Monthly Spend)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    🎯 {ev.title} ({ev.event_type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Link to Shared Project / Pool */}
          {projects.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Tag to Shared Pool (Optional)
              </label>
              <select
                value={sharedProjectId}
                onChange={(e) => setSharedProjectId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Personal expense (Not shared)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    👥 {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Notes / Tags
            </label>
            <input
              type="text"
              placeholder="e.g. Split with Rohan, Diwali gift shopping"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
