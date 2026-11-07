import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  CalendarRange, Plus, Plane, Sparkles, Heart, Cake, Gift, AlertCircle, Trash2, CheckCircle 
} from 'lucide-react';

export default function EventsPage({ onOpenQuickAdd }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [eventDetails, setEventDetails] = useState(null);

  // Create Event Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('vacation');
  const [targetBudget, setTargetBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isolate, setIsolate] = useState(true);
  const [notes, setNotes] = useState('');

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents();
      setEvents(data);
      if (data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEventDetails = async (id) => {
    try {
      const data = await api.getEvent(id);
      setEventDetails(data);
    } catch (err) {
      console.error('Failed to load event details:', err);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadEventDetails(selectedEventId);
    }
  }, [selectedEventId]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!title.trim() || !targetBudget) return;
    try {
      await api.createEvent({
        title,
        event_type: eventType,
        target_budget: parseFloat(targetBudget),
        start_date: startDate || null,
        end_date: endDate || null,
        isolate_from_analytics: isolate,
        notes,
      });
      setShowCreateModal(false);
      setTitle('');
      setTargetBudget('');
      setNotes('');
      loadEvents();
    } catch (err) {
      alert(err.message || 'Failed to create event');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('Are you sure you want to delete this event? Linked expenses will remain as general expenses.')) return;
    try {
      await api.deleteEvent(id);
      loadEvents();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  const currency = user?.currency_symbol || '₹';

  const getEventIcon = (type) => {
    switch (type) {
      case 'vacation': return Plane;
      case 'festival': return Sparkles;
      case 'anniversary': return Heart;
      case 'birthday': return Cake;
      case 'wedding': return Gift;
      default: return CalendarRange;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-purple-400" />
            Events & Sinking Funds
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Dedicated budgets for planned vacations, weddings, Diwali & anniversaries — isolated from normal living averages.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Sinking Fund</span>
        </button>
      </div>

      {events.length === 0 && !loading ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <CalendarRange className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Sinking Funds Configured</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Create an isolated budget for an upcoming Goa trip or Diwali shopping so your standard monthly dining/travel averages stay accurate.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md cursor-pointer"
          >
            Create First Sinking Fund
          </button>
        </div>
      ) : (
        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
          
          {/* Mobile Horizontal Sinking Fund Selector (Swipeable Pills) */}
          <div className="block lg:hidden">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {events.map((ev) => {
                const Icon = getEventIcon(ev.event_type);
                const isSelected = selectedEventId === ev.id;
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEventId(ev.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{ev.title}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-purple-800 text-purple-100' : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {ev.progress_percentage}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Events Sidebar Cards (Desktop) */}
          <div className="hidden lg:block space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Active Sinking Funds ({events.length})
            </h2>

            <div className="space-y-3">
              {events.map((ev) => {
                const Icon = getEventIcon(ev.event_type);
                const isSelected = selectedEventId === ev.id;
                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEventId(ev.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/50 shadow-md shadow-purple-500/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="font-semibold text-xs text-white truncate max-w-[150px]">
                          {ev.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-purple-400 font-mono font-semibold">
                        {ev.progress_percentage}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden my-2">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          ev.is_overbudget ? 'bg-rose-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${Math.min(100, ev.progress_percentage)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                      <span>Spent: {currency}{ev.total_spent.toLocaleString('en-IN')}</span>
                      <span>Target: {currency}{parseFloat(ev.target_budget).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Event Details & Itemized Spends */}
          <div className="lg:col-span-2 space-y-6">
            {eventDetails ? (
              <>
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white">{eventDetails.title}</h2>
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-medium">
                          {eventDetails.event_type}
                        </span>
                        {eventDetails.isolate_from_analytics && (
                          <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            ✓ Isolated from baseline living
                          </span>
                        )}
                      </div>
                      {eventDetails.notes && (
                        <p className="text-xs text-slate-400 mt-1">{eventDetails.notes}</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteEvent(eventDetails.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Budget Meters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Target Fund</p>
                      <p className="text-lg font-bold font-mono text-white">
                        {currency}{parseFloat(eventDetails.target_budget).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Utilized</p>
                      <p className="text-lg font-bold font-mono text-purple-300">
                        {currency}{eventDetails.total_spent.toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Remaining Buffer</p>
                      <p className={`text-lg font-bold font-mono ${eventDetails.remaining_budget > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {currency}{eventDetails.remaining_budget.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-400">
                      {eventDetails.expenses?.length || 0} transaction(s) recorded under this fund
                    </span>
                    <button
                      onClick={onOpenQuickAdd}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                      + Add Event Expense
                    </button>
                  </div>
                </div>

                {/* Event Transactions Table & Cards */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
                    Itemized Expenses
                  </h3>

                  {eventDetails.expenses?.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No expenses tagged to this fund yet. Use "+ Add Event Expense" to tag flight tickets, hotel, or gifts.
                    </div>
                  ) : (
                    <>
                      {/* Mobile Cards for Event Expenses (< md) */}
                      <div className="block md:hidden space-y-2.5">
                        {eventDetails.expenses?.map((e) => (
                          <div key={e.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-white truncate max-w-[180px]">{e.merchant}</span>
                              <span className="font-mono font-bold text-white text-sm">
                                {currency}{parseFloat(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1.5 border-t border-slate-900">
                              <span className="text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded text-[10px]">
                                {e.payment_mode || 'UPI'}
                              </span>
                              <span>{e.spent_at}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table (>= md) */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400">
                              <th className="pb-2 pl-1">Date</th>
                              <th className="pb-2">Merchant / Item</th>
                              <th className="pb-2">Payment</th>
                              <th className="pb-2 text-right pr-1">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {eventDetails.expenses?.map((e) => (
                              <tr key={e.id} className="hover:bg-slate-800/30">
                                <td className="py-2.5 pl-1 font-mono text-slate-400">{e.spent_at}</td>
                                <td className="py-2.5 font-medium text-white">{e.merchant}</td>
                                <td className="py-2.5 text-slate-400">{e.payment_mode}</td>
                                <td className="py-2.5 text-right pr-1 font-mono font-bold text-white">
                                  {currency}{parseFloat(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">
                Select a sinking fund to view detailed progress.
              </div>
            )}
          </div>

        </div>
      )}

      {/* Create Event Modal (Mobile Bottom Sheet) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-slate-900 border-t sm:border border-slate-800 p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto sm:hidden mb-1" />
            <h3 className="text-base font-bold text-white">Create Sinking Fund</h3>
            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Event / Fund Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Shopping & Gifts, Goa Trip Nov, Sister's Wedding"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Event Type
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="vacation">Vacation / Trip</option>
                    <option value="festival">Festival (Diwali/Eid/Holi)</option>
                    <option value="anniversary">Anniversary</option>
                    <option value="birthday">Birthday</option>
                    <option value="wedding">Wedding / Shagun</option>
                    <option value="other">Other Sinking Fund</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Target Budget (₹) *
                  </label>
                  <input
                    type="number"
                    step="500"
                    required
                    placeholder="35000"
                    value={targetBudget}
                    onChange={(e) => setTargetBudget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-start gap-2">
                <input
                  type="checkbox"
                  id="isolate_check"
                  checked={isolate}
                  onChange={(e) => setIsolate(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="isolate_check" className="text-xs text-purple-200 cursor-pointer">
                  <strong>Isolate from Monthly Living Analytics:</strong> Prevents this one-off vacation or festival spend from artificially skewing your standard food and cab averages.
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs active:scale-95"
                >
                  Create Fund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
