import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, Send, Bot, User, AlertTriangle, TrendingUp, Calendar, Heart, ShieldAlert, ArrowRight 
} from 'lucide-react';

export default function AIAdvisorPage({ onOpenEvents, onOpenLending }) {
  const { user } = useAuth();
  const [insights, setInsights] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  // Chat states
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Namaste ${user?.full_name?.split(' ')[0] || ''}! I am DhanMool AI, your India-first financial advisor. I track your live monthly spends, festive cycles (Diwali, Eid, weddings), Section 80C tax milestones, and informal udhar. How can I assist your wealth journey today?`,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    api.getAIInsights()
      .then(res => setInsights(res.insights || []))
      .catch(err => console.error('Failed to load AI insights:', err))
      .finally(() => setLoadingInsights(false));
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim() || isSending) return;

    const userMsg = { role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const res = await api.askAIAdvisor(query);
      setMessages(prev => [...prev, { role: 'assistant', text: res.response }]);
    } catch (err) {
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', text: 'I encountered an error analyzing your financial data. Please try again in a moment.' }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const promptSuggestions = [
    'How can I save ₹10,000 this month?',
    'Am I spending too much on Zomato & Swiggy?',
    'How should I budget for upcoming festivals?',
    'What is my outstanding Udhar recovery status?',
  ];

  const getInsightIcon = (type) => {
    switch (type) {
      case 'festival': return Sparkles;
      case 'tax': return AlertTriangle;
      case 'milestone': return Heart;
      case 'risk': return ShieldAlert;
      case 'opportunity': return TrendingUp;
      default: return Bot;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/30 p-4 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            DhanMool AI Advisor
          </h1>
          <p className="text-xs text-purple-200/80 mt-0.5">
            Contextual Indian financial intelligence: Cultural festival calendars, tax deadlines & spending guardrails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full border border-purple-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Financial Context
          </span>
        </div>
      </div>

      {/* Proactive Insights Cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          Proactive Radar & Risk Watch ({insights.length})
        </h2>

        {loadingInsights ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Scanning transaction rhythms and festival calendar...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((ins) => {
              const Icon = getInsightIcon(ins.type);
              const isDanger = ins.severity === 'danger';
              const isWarning = ins.severity === 'warning';

              return (
                <div
                  key={ins.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                    isDanger
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : isWarning
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`p-1.5 rounded-lg ${
                        isDanger ? 'bg-rose-500/20 text-rose-300' : isWarning ? 'bg-amber-500/20 text-amber-300' : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="text-[9px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
                        {ins.type}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-1">{ins.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{ins.description}</p>
                  </div>

                  {ins.suggested_action && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => {
                          if (ins.suggested_action === 'create_event') onOpenEvents();
                          else if (ins.suggested_action === 'view_lending') onOpenLending();
                        }}
                        className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{ins.action_label || 'Take Action'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Chat Console */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col h-[520px]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Ask DhanMool AI</h2>
          </div>
          <span className="text-[11px] text-slate-400">Context: Connected to your current month data</span>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div key={idx} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-emerald-600 text-slate-950 font-medium rounded-br-xs shadow-md'
                      : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-bl-xs'
                  }`}
                >
                  {msg.text}
                </div>
                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
            );
          })}
          {isSending && (
            <div className="flex gap-3 items-center text-xs text-slate-400 italic">
              <Bot className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>DhanMool AI is evaluating your cashflows...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Prompt Suggestions */}
        <div className="py-2 flex flex-wrap gap-1.5 overflow-x-auto">
          {promptSuggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(s)}
              className="text-[10px] bg-slate-950 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 pt-2 border-t border-slate-800"
        >
          <input
            type="text"
            placeholder="Ask about spending cuts, festival buffers, Section 80C, or savings..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={isSending || !inputText.trim()}
            className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

    </div>
  );
}
