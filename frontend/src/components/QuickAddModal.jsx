import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, Sparkles, Wand2, Check, AlertCircle, ArrowUpRight, HandCoins } from 'lucide-react';

export default function QuickAddModal({ isOpen, onClose, onExpenseAdded, events = [], projects = [] }) {
  const [categories, setCategories] = useState([]);
  const [nlInput, setNlInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseNotice, setParseNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('expense'); // 'expense' or 'lending'

  // Form states
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [spentAt, setSpentAt] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [eventId, setEventId] = useState('');
  const [sharedProjectId, setSharedProjectId] = useState('');

  // Lending states
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactType, setContactType] = useState('friend');
  const [direction, setDirection] = useState('lent');
  const [expectedRepayDate, setExpectedRepayDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.getCategories()
        .then(cats => {
          setCategories(cats);
          if (cats.length > 0 && !categoryId) {
            setCategoryId(cats[0].id);
          }
        })
        .catch(err => console.error('Failed to load categories', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAIParse = async () => {
    if (!nlInput.trim()) return;
    setIsParsing(true);
    setParseNotice('');
    try {
      const parsed = await api.parseNL(nlInput);
      if (parsed.amount) setAmount(parsed.amount);
      if (parsed.merchant) setMerchant(parsed.merchant);
      if (parsed.category_id) setCategoryId(parsed.category_id);
      if (parsed.payment_mode) setPaymentMode(parsed.payment_mode);
      if (parsed.notes) setNotes(parsed.notes);

      if (parsed.is_lending) {
        setActiveTab('lending');
        setDirection(parsed.lending_direction || 'lent');
        setContactName(parsed.merchant || 'Friend');
        setParseNotice(`✨ AI recognized this as an Udhar (${parsed.lending_direction}) transaction!`);
      } else {
        setActiveTab('expense');
        setParseNotice(`✨ Auto-categorized as "${parsed.category_name}" via ${parsed.payment_mode}`);
      }
    } catch (err) {
      console.error(err);
      setParseNotice('Could not auto-parse. Please fill details manually.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeTab === 'expense') {
        await api.createExpense({
          amount: parseFloat(amount),
          category_id: categoryId ? parseInt(categoryId) : null,
          merchant: merchant || 'General Spend',
          payment_mode: paymentMode,
          spent_at: spentAt,
          notes: notes,
          event_id: eventId || null,
          shared_project_id: sharedProjectId || null,
        });
      } else {
        if (!contactName.trim()) {
          alert('Please enter contact name.');
          setIsSubmitting(false);
          return;
        }
        await api.createLending({
          contact_name: contactName,
          contact_phone: contactPhone,
          contact_type: contactType,
          direction: direction,
          principal_amount: parseFloat(amount),
          lent_date: spentAt,
          expected_repayment_date: expectedRepayDate || null,
          notes: notes,
        });
      }

      onExpenseAdded();
      onClose();
      // Reset
      setAmount('');
      setMerchant('');
      setNotes('');
      setNlInput('');
      setParseNotice('');
      setEventId('');
      setSharedProjectId('');
    } catch (err) {
      alert(err.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-slate-900 border-t sm:border border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              ₹
            </span>
            <h3 className="text-base font-semibold text-white">Record New Transaction</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 pb-8 sm:pb-6">
          
          {/* AI Quick Input Box */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/30 shadow-inner">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-purple-300">Natural Language & Voice Parser</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder='e.g., "Paid 450 at Swiggy via UPI" or "Lent 5000 to Rohan"'
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAIParse())}
                className="flex-1 bg-slate-950 border border-purple-500/40 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
              <button
                type="button"
                onClick={handleAIParse}
                disabled={isParsing || !nlInput.trim()}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-2 rounded-lg transition-all cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>{isParsing ? 'Parsing...' : 'AI Autofill'}</span>
              </button>
            </div>
            {parseNotice && (
              <p className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
                <Check className="w-3 h-3" /> {parseNotice}
              </p>
            )}
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('expense')}
              className={`py-2 rounded-lg font-medium transition-all ${
                activeTab === 'expense'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Regular / Event Spend
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lending')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'lending'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HandCoins className="w-3.5 h-3.5" />
              <span>Udhar (Lent / Borrowed)</span>
            </button>
          </div>

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-sm text-white font-mono font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={spentAt}
                  onChange={(e) => setSpentAt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* If Expense Tab */}
            {activeTab === 'expense' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Category *
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Payment Mode
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Cash">Cash</option>
                      <option value="NetBanking">NetBanking / NEFT</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Merchant / Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Swiggy, Blinkit, D-Mart, Petrol Pump"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Sinking Fund Event Tagging */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-300 uppercase tracking-wider mb-1.5">
                      Link to Event / Sinking Fund
                    </label>
                    <select
                      value={eventId}
                      onChange={(e) => setEventId(e.target.value)}
                      className="w-full bg-slate-950 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                    >
                      <option value="">None (Standard Monthly Living)</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title} ({ev.event_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-indigo-300 uppercase tracking-wider mb-1.5">
                      Shared Project Tag
                    </label>
                    <select
                      value={sharedProjectId}
                      onChange={(e) => setSharedProjectId(e.target.value)}
                      className="w-full bg-slate-950 border border-indigo-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                    >
                      <option value="">Personal Spend</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              /* Lending / Udhar Tab */
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Direction
                    </label>
                    <select
                      value={direction}
                      onChange={(e) => setDirection(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="lent">I Lent Money (Gave Udhar)</option>
                      <option value="borrowed">I Borrowed Money (Took Loan)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Relationship
                    </label>
                    <select
                      value={contactType}
                      onChange={(e) => setContactType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="family">Family Member</option>
                      <option value="friend">Friend</option>
                      <option value="colleague">Colleague / Flatmate</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cousin Rohan, Amit"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Phone Number (optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Expected Repayment Date (optional)
                  </label>
                  <input
                    type="date"
                    value={expectedRepayDate}
                    onChange={(e) => setExpectedRepayDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Notes / Purpose
              </label>
              <textarea
                rows="2"
                placeholder="Optional notes or remarks"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : activeTab === 'expense' ? 'Log Spend (Gross Outflow)' : 'Record Udhar'}
              </button>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
}
