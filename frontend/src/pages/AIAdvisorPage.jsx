import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { 
  Bot, Send, Mic, AlertTriangle, TrendingUp, Heart, ShieldAlert, ArrowRight, CheckCircle2 
} from 'lucide-react';

export default function AIAdvisorPage({ onOpenEvents, onOpenLending }) {
  const { user } = useAuth();
  const [insights, setInsights] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  // Chat states
  const firstName = user?.full_name?.split(' ')[0] || '';
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello ${firstName}. I'm synced with your live spending ledger. Ask me about your monthly budget, discretionary expense cuts, festival funds, or outstanding debt settlements. You can type or tap the microphone to speak.`,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [interimText, setInterimText] = useState('');
  const chatBottomRef = useRef(null);

  // Speech Recognition hook
  const { isListening, toggleListening } = useSpeechRecognition({
    lang: 'en-IN',
    onResult: (transcript, isFinal) => {
      setInputText(transcript);
      if (isFinal) {
        setInterimText('');
      } else {
        setInterimText(transcript);
      }
    },
    onError: (err) => {
      setSpeechError(err);
      setTimeout(() => setSpeechError(''), 4000);
    },
  });

  useEffect(() => {
    api.getAIInsights()
      .then(res => setInsights(res.insights || []))
      .catch(err => console.error('Failed to load AI insights:', err))
      .finally(() => setLoadingInsights(false));
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isListening]);

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim() || isSending) return;

    const userMsg = { role: 'user', text: query.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setInterimText('');
    setIsSending(true);

    try {
      const res = await api.askAIAdvisor(query.trim());
      setMessages(prev => [...prev, { role: 'assistant', text: res.response }]);
    } catch (err) {
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', text: 'Unable to analyze financial data at this moment. Please try again.' }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const promptSuggestions = [
    'How can I save ₹10,000 this month?',
    'Review my food delivery & dining spend',
    'How should I budget for upcoming festivals?',
    'What is my outstanding Udhar recovery status?',
  ];

  const getInsightIcon = (type) => {
    switch (type) {
      case 'tax': return AlertTriangle;
      case 'milestone': return Heart;
      case 'risk': return ShieldAlert;
      case 'opportunity': return TrendingUp;
      default: return CheckCircle2;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner (Clean & purposeful, zero generic purple gradient) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Financial Advisor
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Real-time analysis of monthly cashflows, festival sinking funds, and debt recoveries.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-[11px] font-mono bg-slate-950 text-emerald-400 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Ledger Active
          </span>
        </div>
      </div>

      {/* Financial Alerts & Insights */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Financial Alerts & Advisory Watch ({insights.length})
          </h2>
        </div>

        {loadingInsights ? (
          <div className="p-8 text-center text-xs text-slate-500 rounded-2xl bg-slate-900 border border-slate-800">
            Analyzing ledger patterns...
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
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-colors ${
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
                        isDanger ? 'bg-rose-500/20 text-rose-300' : isWarning ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="text-[9px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
                        {ins.type}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white mb-1">{ins.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{ins.description}</p>
                  </div>

                  {ins.suggested_action && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => {
                          if (ins.suggested_action === 'create_event') onOpenEvents();
                          else if (ins.suggested_action === 'view_lending') onOpenLending();
                        }}
                        className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
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
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col h-[540px]">
        
        {/* Chat Console Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Ask Financial Advisor</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Current Month Context</span>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div key={idx} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-emerald-600 text-white font-medium rounded-tr-xs shadow-md'
                      : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-tl-xs'
                  }`}
                >
                  {msg.text}
                </div>
                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold uppercase">
                    {firstName.charAt(0) || 'U'}
                  </div>
                )}
              </div>
            );
          })}

          {isSending && (
            <div className="flex gap-2.5 items-center text-xs text-slate-400">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Analyzing your financial data...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Listening / Audio Feedback Wave */}
        {isListening && (
          <div className="my-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span className="font-medium">Listening... speak now</span>
              {interimText && (
                <span className="text-white font-mono text-[11px] truncate max-w-[200px] sm:max-w-xs">
                  "{interimText}"
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={toggleListening}
              className="text-[10px] uppercase font-bold text-rose-400 hover:text-white px-2 py-0.5 rounded bg-rose-500/20"
            >
              Stop
            </button>
          </div>
        )}

        {/* Speech Error Notice */}
        {speechError && (
          <div className="my-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            {speechError}
          </div>
        )}

        {/* Prompt Suggestions (Horizontal scroll strip on mobile) */}
        <div className="py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap">
          {promptSuggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(s)}
              className="text-[11px] bg-slate-950 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full border border-slate-800 transition-colors whitespace-nowrap cursor-pointer active:scale-95 shrink-0"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input Bar with Speech Recognition & Send */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 pt-2 border-t border-slate-800"
        >
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={isListening ? "Listening to your voice..." : "Ask about spending, festival buffers, or savings (type or speak)..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isSending}
              className={`w-full bg-slate-950 border rounded-xl pl-4 pr-11 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                isListening 
                  ? 'border-rose-500/60 ring-1 ring-rose-500/40' 
                  : 'border-slate-800 focus:border-emerald-500'
              }`}
            />

            {/* Speech Microphone Button inside Input */}
            <button
              type="button"
              onClick={toggleListening}
              title={isListening ? "Stop voice listening" : "Click to speak with voice"}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <button
            type="submit"
            disabled={isSending || !inputText.trim()}
            className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
            title="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

    </div>
  );
}
