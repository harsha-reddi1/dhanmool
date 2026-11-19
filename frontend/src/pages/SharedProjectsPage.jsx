import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useModalLock } from '../utils/modalManager';
import { 
  Users, Plus, UserPlus, ArrowRightLeft, Check, DollarSign, Calendar, Layers,
  Share2, Copy, ExternalLink, QrCode, Search, Filter, Trash2, ArrowUpRight, 
  ArrowDownRight, PieChart as PieChartIcon, Sparkles, Smartphone, MessageCircle, 
  AlertCircle, RefreshCw, ChevronRight, X, Edit2, Settings
} from 'lucide-react';

// Color palette for member avatars and contribution bars
const MEMBER_COLORS = [
  '#00F5A0', '#6366F1', '#38BDF8', '#F59E0B', '#EC4899', 
  '#8B5CF6', '#10B981', '#14B8A6', '#F97316', '#06B6D4'
];

/**
 * Minimum Cash Flow Debt Simplification Algorithm
 * Pairs debtors (<0 balance) and creditors (>0 balance) into the fewest pairwise transfers.
 */
function computeSimplifiedSettlements(settlementsList = []) {
  if (!settlementsList || settlementsList.length < 2) return [];

  // Clone items to avoid mutating props/state
  const debtors = [];
  const creditors = [];

  settlementsList.forEach((s) => {
    const net = Math.round((parseFloat(s.net_balance) || 0) * 100) / 100;
    if (net < -0.01) {
      debtors.push({ ...s, remainingDebt: Math.abs(net) });
    } else if (net > 0.01) {
      creditors.push({ ...s, remainingCredit: net });
    }
  });

  debtors.sort((a, b) => b.remainingDebt - a.remainingDebt);
  creditors.sort((a, b) => b.remainingCredit - a.remainingCredit);

  const transactions = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const amount = Math.min(debtor.remainingDebt, creditor.remainingCredit);
    const roundedAmt = Math.round(amount * 100) / 100;

    if (roundedAmt > 0) {
      transactions.push({
        id: `${debtor.user_id}-${creditor.user_id}-${transactions.length}`,
        fromId: debtor.user_id,
        fromName: debtor.full_name,
        fromEmail: debtor.email,
        toId: creditor.user_id,
        toName: creditor.full_name,
        toEmail: creditor.email,
        amount: roundedAmt,
      });
    }

    debtor.remainingDebt -= amount;
    creditor.remainingCredit -= amount;

    if (debtor.remainingDebt < 0.01) d++;
    if (creditor.remainingCredit < 0.01) c++;
  }

  return transactions;
}

export default function SharedProjectsPage({ onOpenQuickAdd }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'settlements' | 'expenses'

  // Search & Filter in Expenses Tab
  const [searchQuery, setSearchQuery] = useState('');
  const [payerFilter, setPayerFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc' | 'amount_desc' | 'amount_asc'

  // Create Project Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectType, setProjectType] = useState('level1_continuous');

  // Add Member Modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberIdentifier, setMemberIdentifier] = useState('');
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');

  // Add Shared Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expAmount, setExpAmount] = useState('');
  const [expMerchant, setExpMerchant] = useState('');
  const [expNotes, setExpNotes] = useState('');

  // 1-Tap UPI Settle Up Modal
  const [settleModalData, setSettleModalData] = useState(null); // { debtorName, creditorName, creditorId, amount }
  const [customUpiId, setCustomUpiId] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // Edit Project Details Modal
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editProjectForm, setEditProjectForm] = useState({ name: '', description: '', project_type: 'level1_continuous' });

  const handleOpenEditProject = () => {
    if (!projectDetails) return;
    setEditProjectForm({
      name: projectDetails.name || '',
      description: projectDetails.description || '',
      project_type: projectDetails.project_type || 'level1_continuous',
    });
    setShowEditProjectModal(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!editProjectForm.name.trim()) return;
    try {
      await api.updateProject(selectedProject, {
        name: editProjectForm.name.trim(),
        description: editProjectForm.description.trim(),
        project_type: editProjectForm.project_type,
      });
      setShowEditProjectModal(false);
      loadProjects();
      loadProjectDetails(selectedProject);
    } catch (err) {
      alert(err.message || 'Failed to update project');
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm(`Are you sure you want to delete the shared pool "${projectDetails?.name}"? All associated ledger data will be removed.`)) return;
    try {
      await api.deleteProject(selectedProject);
      setShowEditProjectModal(false);
      setSelectedProject(null);
      setProjectDetails(null);
      await loadProjects();
    } catch (err) {
      alert(err.message || 'Failed to delete project');
    }
  };

  // Edit Shared Expense Modal
  const [editingExpenseItem, setEditingExpenseItem] = useState(null);
  const [editExpenseForm, setEditExpenseForm] = useState({ amount: '', merchant: '', notes: '', spent_at: '' });

  const handleOpenEditExpense = (exp) => {
    setEditingExpenseItem(exp);
    setEditExpenseForm({
      amount: exp.amount?.toString() || '',
      merchant: exp.merchant || '',
      notes: exp.notes || '',
      spent_at: exp.spent_at || new Date().toISOString().split('T')[0],
    });
  };

  const handleUpdateSharedExpense = async (e) => {
    e.preventDefault();
    if (!editExpenseForm.amount || parseFloat(editExpenseForm.amount) <= 0) return;
    try {
      await api.updateExpense(editingExpenseItem.id, {
        amount: parseFloat(editExpenseForm.amount),
        merchant: editExpenseForm.merchant.trim() || 'Shared Spend',
        notes: editExpenseForm.notes.trim(),
        spent_at: editExpenseForm.spent_at,
      });
      setEditingExpenseItem(null);
      loadProjectDetails(selectedProject);
      loadProjects();
    } catch (err) {
      alert(err.message || 'Failed to update receipt');
    }
  };

  // Lock body scroll and notify bottom bars when modal is open
  useModalLock(
    showCreateModal || 
    showAddMemberModal || 
    showExpenseModal || 
    Boolean(settleModalData) || 
    showEditProjectModal || 
    Boolean(editingExpenseItem)
  );

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data || []);
      if (data && data.length > 0 && !selectedProject) {
        setSelectedProject(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectDetails = async (id) => {
    try {
      const data = await api.getProject(id);
      setProjectDetails(data);
    } catch (err) {
      console.error('Failed to load project details:', err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectDetails(selectedProject);
    }
  }, [selectedProject]);

  // Reactive background refresh when shared cache is invalidated
  useEffect(() => {
    const handleInvalidation = (e) => {
      const tags = e.detail?.tags || [];
      if (tags.length === 0 || tags.includes('shared')) {
        loadProjects();
        if (selectedProject) loadProjectDetails(selectedProject);
      }
    };
    window.addEventListener('dhanmool:cache-invalidated', handleInvalidation);
    return () => window.removeEventListener('dhanmool:cache-invalidated', handleInvalidation);
  }, [selectedProject]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    try {
      const newProj = await api.createProject({
        name: projectName.trim(),
        description: projectDesc.trim(),
        project_type: projectType,
      });
      setShowCreateModal(false);
      setProjectName('');
      setProjectDesc('');
      await loadProjects();
      if (newProj?.id) {
        setSelectedProject(newProj.id);
      }
    } catch (err) {
      alert(err.message || 'Failed to create project');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError('');
    setMemberSuccess('');
    try {
      await api.addProjectMember(selectedProject, {
        user_identifier: memberIdentifier.trim(),
      });
      setMemberSuccess('Member added to project successfully!');
      setMemberIdentifier('');
      loadProjectDetails(selectedProject);
      setTimeout(() => {
        setShowAddMemberModal(false);
        setMemberSuccess('');
      }, 1500);
    } catch (err) {
      setMemberError(err.message || 'Failed to add member');
    }
  };

  const handleCreateSharedExpense = async (e) => {
    e.preventDefault();
    if (!expAmount || parseFloat(expAmount) <= 0) return;
    try {
      await api.createProjectExpense(selectedProject, {
        amount: parseFloat(expAmount),
        merchant: expMerchant.trim() || 'Shared Group Spend',
        notes: expNotes.trim(),
      });
      setShowExpenseModal(false);
      setExpAmount('');
      setExpMerchant('');
      setExpNotes('');
      loadProjectDetails(selectedProject);
      loadProjects();
    } catch (err) {
      alert(err.message || 'Failed to log shared expense');
    }
  };

  const handleDeleteSharedExpense = async (expenseId) => {
    if (!confirm('Are you sure you want to remove this expense from the project?')) return;
    try {
      await api.deleteExpense(expenseId);
      loadProjectDetails(selectedProject);
      loadProjects();
    } catch (err) {
      alert(err.message || 'Failed to remove expense');
    }
  };

  const currency = user?.currency_symbol || '₹';

  // Computed: Debt Simplification Matrix
  const simplifiedSettlements = useMemo(() => {
    return computeSimplifiedSettlements(projectDetails?.settlements || []);
  }, [projectDetails?.settlements]);

  // Computed: Category Breakdown for Shared Expenses
  const categoryAnalysis = useMemo(() => {
    if (!projectDetails?.expenses || projectDetails.expenses.length === 0) return [];
    const map = {};
    let total = 0;

    projectDetails.expenses.forEach((e) => {
      const amt = parseFloat(e.amount) || 0;
      total += amt;
      const catName = e.dm_categories?.name || 'General Spends';
      const color = e.dm_categories?.color || '#6366F1';
      if (!map[catName]) {
        map[catName] = { name: catName, amount: 0, color };
      }
      map[catName].amount += amt;
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        percentage: total > 0 ? Math.round((item.amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [projectDetails?.expenses]);

  // Filtered & Sorted Expenses
  const filteredExpenses = useMemo(() => {
    if (!projectDetails?.expenses) return [];
    let list = [...projectDetails.expenses];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => 
        (e.merchant && e.merchant.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        (e.dm_users?.full_name && e.dm_users.full_name.toLowerCase().includes(q))
      );
    }

    if (payerFilter !== 'all') {
      list = list.filter((e) => e.user_id === payerFilter);
    }

    if (sortBy === 'amount_desc') {
      list.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
    } else if (sortBy === 'amount_asc') {
      list.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
    } else {
      list.sort((a, b) => new Date(b.spent_at || b.created_at) - new Date(a.spent_at || a.created_at));
    }

    return list;
  }, [projectDetails?.expenses, searchQuery, payerFilter, sortBy]);

  // Current User's Net Balance in this project
  const mySettlement = useMemo(() => {
    return projectDetails?.settlements?.find((s) => s.user_id === user?.id) || null;
  }, [projectDetails?.settlements, user?.id]);

  // WhatsApp Summary Formatter
  const handleExportWhatsApp = () => {
    if (!projectDetails) return;
    const total = (projectDetails.total_spent || 0).toLocaleString('en-IN');
    const fair = projectDetails.settlements?.[0]?.fair_share
      ? (projectDetails.settlements[0].fair_share || 0).toLocaleString('en-IN')
      : '0';

    let text = `🏖️ *DhanMool Shared Ledger: ${projectDetails.name}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *Total Group Outflow:* ${currency}${total}\n`;
    text += `👥 *Members:* ${projectDetails.members?.length || 0} (Fair Share: ${currency}${fair} each)\n\n`;

    text += `📊 *Member Contributions:*\n`;
    (projectDetails.settlements || []).forEach((s) => {
      const isOwed = s.net_balance > 0;
      const owes = s.net_balance < 0;
      const sign = isOwed ? `+${currency}` : owes ? `-${currency}` : '';
      const netStr = isOwed || owes ? ` (Net: ${sign}${Math.abs(s.net_balance).toLocaleString('en-IN')})` : ' (Settled)';
      text += `• ${s.full_name}: ${currency}${s.total_paid.toLocaleString('en-IN')}${netStr}\n`;
    });

    if (simplifiedSettlements.length > 0) {
      text += `\n🤝 *Settlement Matrix (Who Owes Whom):*\n`;
      simplifiedSettlements.forEach((item) => {
        text += `👉 *${item.fromName}* pays *${item.toName}* ${currency}${item.amount.toLocaleString('en-IN')}\n`;
      });
    } else {
      text += `\n✅ *All accounts in this pool are currently settled!*\n`;
    }

    text += `\n⚡ _Tracked via DhanMool - Friction-free Indian Finance_`;

    navigator.clipboard?.writeText(text).then(() => {
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 4000);
    });
  };

  // UPI Deep Link Builder
  const getUpiUrl = (recipientName, amount, upiId) => {
    const handle = upiId || `${recipientName.toLowerCase().replace(/[^a-z0-9]/g, '')}@upi`;
    const note = encodeURIComponent(`DhanMool ${projectDetails?.name || 'Shared'} Settlement`);
    return `upi://pay?pa=${encodeURIComponent(handle)}&pn=${encodeURIComponent(recipientName)}&am=${amount}&tn=${note}&cu=INR`;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0f1d] border border-white/8 p-4 sm:p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#6366F1]" />
            Shared Expenses & Ledgers
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Collaborative Indian expense sharing: Continuous Flatmates (L1) & Vacation Pools (L2) with 1-Tap UPI Settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {projectDetails && (
            <button
              onClick={handleExportWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-[#00f5a0] border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer active:scale-95"
              title="Copy formatted WhatsApp summary to clipboard"
            >
              {copiedWhatsApp ? <Check className="w-3.5 h-3.5 text-[#00f5a0]" /> : <MessageCircle className="w-3.5 h-3.5" />}
              <span>{copiedWhatsApp ? 'Copied WhatsApp Text!' : 'Export WhatsApp'}</span>
            </button>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-indigo-600 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Pool</span>
          </button>
        </div>
      </div>

      {projects.length === 0 && !loading ? (
        <div className="p-12 text-center rounded-2xl bg-[#0a0f1d] border border-white/8 space-y-3">
          <Layers className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Shared Pools Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Create a Level 1 continuous shared ledger with flatmates or spouse, or a Level 2 event pool for an upcoming Goa trip or festival.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-[#00f5a0] text-slate-950 text-xs font-bold shadow-md cursor-pointer hover:bg-emerald-400 transition-all active:scale-95"
          >
            Create First Shared Pool
          </button>
        </div>
      ) : (
        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-4 lg:gap-6">
          
          {/* Mobile Horizontal Project Selector */}
          <div className="block lg:hidden">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {projects.map((p) => {
                const isSelected = selectedProject === p.id;
                const isL1 = p.project_type === 'level1_continuous';
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProject(p.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#6366F1] to-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                        : 'bg-[#0a0f1d] border border-white/8 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                      isSelected ? 'bg-indigo-900/60 text-indigo-100' : isL1 ? 'bg-[#00f5a0]/15 text-[#00f5a0]' : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {isL1 ? 'L1 Continuous' : 'L2 Event'}
                    </span>
                    <span className="font-mono text-[11px] opacity-90">
                      {currency}{(p.total_spent || 0).toLocaleString('en-IN')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Left Sidebar: Projects List */}
          <div className="hidden lg:block space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Shared Pools ({projects.length})
              </h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-[11px] text-[#6366F1] hover:text-indigo-400 font-semibold cursor-pointer"
              >
                + New
              </button>
            </div>
            
            <div className="space-y-2">
              {projects.map((p) => {
                const isSelected = selectedProject === p.id;
                const isL1 = p.project_type === 'level1_continuous';
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProject(p.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0a0f1d] border-[#6366F1] shadow-lg shadow-indigo-500/10 ring-1 ring-[#6366F1]/50'
                        : 'bg-[#0a0f1d] border-white/8 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-white truncate max-w-[150px]">
                        {p.name}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                        isL1 ? 'bg-[#00f5a0]/15 text-[#00f5a0]' : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        {isL1 ? 'L1 Continuous' : 'L2 Event'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span>{p.member_count} member(s)</span>
                      <span className="font-mono font-semibold text-white">
                        {currency}{(p.total_spent || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Content Area (3 Cols) */}
          <div className="lg:col-span-3 space-y-6">
            {projectDetails ? (
              <>
                {/* Hero Card for Selected Project */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#0a0f1d] border border-white/8 shadow-xl relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-white tracking-tight">{projectDetails.name}</h2>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-mono border border-slate-700/60">
                          {projectDetails.project_type === 'level1_continuous' ? 'Continuous Living Pool' : 'Event Sinking Pool'}
                        </span>
                      </div>
                      {projectDetails.description && (
                        <p className="text-xs text-slate-400">{projectDetails.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      <button
                        onClick={handleOpenEditProject}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 transition-colors cursor-pointer active:scale-95"
                        title="Edit pool name, description or type"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Pool</span>
                      </button>
                      <button
                        onClick={() => setShowAddMemberModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 transition-colors cursor-pointer active:scale-95"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Member</span>
                      </button>
                      <button
                        onClick={() => setShowExpenseModal(true)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00f5a0] hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer active:scale-95 shadow-md shadow-emerald-500/20"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Log Bill</span>
                      </button>
                    </div>
                  </div>

                  {/* High-Level Financial Pulse Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/8">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Outflow</span>
                      <span className="text-base sm:text-lg font-bold font-mono text-white mt-0.5 block">
                        {currency}{(projectDetails.total_spent || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Fair Share / Person</span>
                      <span className="text-base sm:text-lg font-bold font-mono text-slate-200 mt-0.5 block">
                        {currency}{(projectDetails.settlements?.[0]?.fair_share || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Members</span>
                      <span className="text-base sm:text-lg font-bold font-mono text-white mt-0.5 block">
                        {projectDetails.members?.length || 0} People
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Your Position</span>
                      {mySettlement ? (
                        <span className={`text-base sm:text-lg font-bold font-mono mt-0.5 block ${
                          mySettlement.net_balance > 0 ? 'text-[#00f5a0]' : mySettlement.net_balance < 0 ? 'text-rose-400' : 'text-slate-400'
                        }`}>
                          {mySettlement.net_balance > 0 
                            ? `+${currency}${mySettlement.net_balance.toLocaleString('en-IN')}` 
                            : mySettlement.net_balance < 0 
                            ? `-${currency}${Math.abs(mySettlement.net_balance).toLocaleString('en-IN')}` 
                            : 'Settled'}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 mt-1 block">Not logged</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Interactive Navigation Tabs */}
                <div className="flex bg-[#0a0f1d] p-1.5 rounded-2xl border border-white/8 text-xs font-semibold gap-1">
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === 'analytics'
                        ? 'bg-gradient-to-r from-[#6366F1] to-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                    }`}
                  >
                    <PieChartIcon className="w-3.5 h-3.5" />
                    <span>Split & Analytics</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('settlements')}
                    className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
                      activeTab === 'settlements'
                        ? 'bg-gradient-to-r from-[#6366F1] to-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Settlements & UPI</span>
                    {simplifiedSettlements.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-[#00f5a0] animate-pulse ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('expenses')}
                    className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === 'expenses'
                        ? 'bg-gradient-to-r from-[#6366F1] to-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Bills & Receipts ({projectDetails.expenses?.length || 0})</span>
                  </button>
                </div>

                {/* TAB 1: Analytics & Split */}
                {activeTab === 'analytics' && (
                  <div className="space-y-6">
                    {/* Visual Contribution Stacked Bar */}
                    <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-white/8 shadow-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                            Member Spending Contributions
                          </h3>
                          <p className="text-[11px] text-slate-400">Proportion of total pool paid by each person</p>
                        </div>
                        <span className="text-[11px] font-mono text-[#00f5a0]">
                          100% Accounted
                        </span>
                      </div>

                      {/* Stacked Proportional Bar */}
                      <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden flex shadow-inner">
                        {projectDetails.settlements?.map((s, idx) => {
                          const pct = projectDetails.total_spent > 0 
                            ? (s.total_paid / projectDetails.total_spent) * 100 
                            : 0;
                          if (pct <= 0) return null;
                          return (
                            <div
                              key={s.user_id}
                              style={{ 
                                width: `${pct}%`,
                                backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length]
                              }}
                              className="h-full transition-all duration-500 relative group"
                              title={`${s.full_name}: ${pct.toFixed(1)}%`}
                            />
                          );
                        })}
                      </div>

                      {/* Member Split Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                        {projectDetails.settlements?.map((s, idx) => {
                          const isOwed = s.net_balance > 0;
                          const owes = s.net_balance < 0;
                          const isMe = s.user_id === user?.id;
                          const color = MEMBER_COLORS[idx % MEMBER_COLORS.length];
                          const pct = projectDetails.total_spent > 0 
                            ? Math.round((s.total_paid / projectDetails.total_spent) * 100) 
                            : 0;

                          return (
                            <div 
                              key={s.user_id}
                              className={`p-3.5 rounded-xl border transition-all ${
                                isMe 
                                  ? 'bg-slate-950 border-[#00f5a0]/40 shadow-md shadow-emerald-500/5' 
                                  : 'bg-slate-950/60 border-white/5 hover:border-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 truncate">
                                  <div 
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-950 shrink-0"
                                    style={{ backgroundColor: color }}
                                  >
                                    {s.full_name?.charAt(0).toUpperCase() || 'M'}
                                  </div>
                                  <span className="text-xs font-semibold text-white truncate max-w-[110px]">
                                    {s.full_name} {isMe && <span className="text-[#00f5a0]">(You)</span>}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                                  {pct}% of pool
                                </span>
                              </div>

                              <div className="mt-3 space-y-1 text-xs">
                                <div className="flex justify-between text-[11px] text-slate-400">
                                  <span>Paid Upfront:</span>
                                  <span className="font-mono text-white">{currency}{s.total_paid.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between text-[11px] text-slate-400">
                                  <span>Fair Share:</span>
                                  <span className="font-mono text-slate-300">{currency}{s.fair_share.toLocaleString('en-IN')}</span>
                                </div>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                                <span className="text-slate-400 text-[11px]">Net Status:</span>
                                <span className={`font-mono font-bold ${
                                  isOwed ? 'text-[#00f5a0]' : owes ? 'text-rose-400' : 'text-slate-400'
                                }`}>
                                  {isOwed ? `+${currency}${s.net_balance.toLocaleString('en-IN')}` : owes ? `-${currency}${Math.abs(s.net_balance).toLocaleString('en-IN')}` : 'Settled'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Shared Category Split Widget */}
                    <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-white/8 shadow-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                            Pool Category Distribution
                          </h3>
                          <p className="text-[11px] text-slate-400">How shared funds were spent across categories</p>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          {categoryAnalysis.length} Categories
                        </span>
                      </div>

                      {categoryAnalysis.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500">
                          No category data logged yet.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {categoryAnalysis.map((cat, idx) => (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                  <span className="font-medium text-white">{cat.name}</span>
                                </div>
                                <div className="font-mono">
                                  <span className="text-white font-semibold">{currency}{cat.amount.toLocaleString('en-IN')}</span>
                                  <span className="text-slate-400 text-[11px] ml-1.5">({cat.percentage}%)</span>
                                </div>
                              </div>
                              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: Settlements & 1-Tap UPI */}
                {activeTab === 'settlements' && (
                  <div className="space-y-6">
                    {/* Simplified "Who Owes Whom" Matrix Card */}
                    <div className="p-5 sm:p-6 rounded-2xl bg-[#0a0f1d] border border-white/8 shadow-xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                              Simplified Debt Settlement Matrix
                            </h3>
                            <span className="text-[10px] bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-mono">
                              Min-Cashflow Algo
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Minimum direct transfers required to settle the entire pool with zero roundtrips.
                          </p>
                        </div>

                        <button
                          onClick={handleExportWhatsApp}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 transition-colors cursor-pointer self-start sm:self-auto"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{copiedWhatsApp ? 'Copied!' : 'Share Breakdown'}</span>
                        </button>
                      </div>

                      {simplifiedSettlements.length === 0 ? (
                        <div className="p-8 text-center rounded-xl bg-slate-950 border border-white/5 space-y-2">
                          <Check className="w-8 h-8 text-[#00f5a0] mx-auto" />
                          <h4 className="text-sm font-bold text-white">All Settled Up!</h4>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Everyone in this pool has paid their exact fair share. No outstanding debts remaining!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {simplifiedSettlements.map((item) => {
                            const isDebtorMe = item.fromId === user?.id;
                            const isCreditorMe = item.toId === user?.id;

                            return (
                              <div
                                key={item.id}
                                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                                  isDebtorMe
                                    ? 'bg-rose-500/5 border-rose-500/30 shadow-md shadow-rose-500/5'
                                    : isCreditorMe
                                    ? 'bg-emerald-500/5 border-[#00f5a0]/30 shadow-md shadow-emerald-500/5'
                                    : 'bg-slate-950/70 border-white/5'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                                    <span className={`px-2 py-1 rounded-lg ${isDebtorMe ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-200'}`}>
                                      {item.fromName} {isDebtorMe && '(You)'}
                                    </span>
                                    <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400 mx-1 shrink-0" />
                                    <span className={`px-2 py-1 rounded-lg ${isCreditorMe ? 'bg-[#00f5a0]/20 text-[#00f5a0] border border-[#00f5a0]/30' : 'bg-slate-800 text-slate-200'}`}>
                                      {item.toName} {isCreditorMe && '(You)'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3">
                                  <span className="font-mono text-base font-bold text-white">
                                    {currency}{item.amount.toLocaleString('en-IN')}
                                  </span>

                                  <button
                                    onClick={() => {
                                      setSettleModalData({
                                        debtorName: item.fromName,
                                        creditorName: item.toName,
                                        creditorId: item.toId,
                                        creditorEmail: item.toEmail,
                                        amount: item.amount,
                                      });
                                      setCustomUpiId(`${item.toName.toLowerCase().replace(/[^a-z0-9]/g, '')}@upi`);
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                                      isDebtorMe
                                        ? 'bg-[#00f5a0] hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                                        : 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40'
                                    }`}
                                  >
                                    <Smartphone className="w-3.5 h-3.5" />
                                    <span>{isDebtorMe ? 'Pay via UPI' : 'UPI Details'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: Bills & Receipts */}
                {activeTab === 'expenses' && (
                  <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-white/8 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                          Shared Pool Expenses
                        </h3>
                        <p className="text-[11px] text-slate-400">All receipts logged under Gross Outflow accounting</p>
                      </div>

                      <button
                        onClick={() => setShowExpenseModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00f5a0] hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer self-start sm:self-auto"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Log Bill</span>
                      </button>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search receipts by merchant or notes..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={payerFilter}
                          onChange={(e) => setPayerFilter(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="all">All Payers</option>
                          {projectDetails.members?.map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                              Paid by {m.dm_users?.full_name || 'Member'}
                            </option>
                          ))}
                        </select>

                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="date_desc">Latest First</option>
                          <option value="amount_desc">Highest Amount</option>
                          <option value="amount_asc">Lowest Amount</option>
                        </select>
                      </div>
                    </div>

                    {filteredExpenses.length === 0 ? (
                      <div className="py-10 text-center text-xs text-slate-500">
                        {searchQuery ? 'No receipts match your search filter.' : 'No shared expenses logged in this pool yet.'}
                      </div>
                    ) : (
                      <>
                        {/* Mobile Cards for Shared Bills */}
                        <div className="block md:hidden space-y-2.5">
                          {filteredExpenses.map((e) => {
                            const isMyExpense = e.user_id === user?.id;
                            const isOwner = projectDetails.created_by === user?.id;
                            return (
                              <div key={e.id} className="p-3.5 rounded-xl bg-slate-950 border border-white/5 flex flex-col gap-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-white truncate max-w-[180px]">{e.merchant}</span>
                                  <span className="font-mono font-bold text-white text-sm">
                                    {currency}{parseFloat(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                {e.notes && (
                                  <p className="text-[11px] text-slate-400">{e.notes}</p>
                                )}
                                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1.5 border-t border-slate-900">
                                  <span className="text-slate-300 bg-slate-900 px-2 py-0.5 rounded text-[10px]">
                                    Paid by {e.dm_users?.full_name?.split(' ')[0] || 'Member'} {isMyExpense && '(You)'}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span>{e.spent_at}</span>
                                    {(isMyExpense || isOwner) && (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleOpenEditExpense(e)}
                                          className="text-slate-400 hover:text-indigo-400 p-1 cursor-pointer"
                                          title="Edit receipt"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSharedExpense(e.id)}
                                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                          title="Delete receipt"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400">
                                <th className="pb-2.5 pl-1">Date</th>
                                <th className="pb-2.5">Description</th>
                                <th className="pb-2.5">Paid By</th>
                                <th className="pb-2.5 text-right">Amount</th>
                                <th className="pb-2.5 text-right pr-1">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {filteredExpenses.map((e) => {
                                const isMyExpense = e.user_id === user?.id;
                                const isOwner = projectDetails.created_by === user?.id;
                                return (
                                  <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="py-3 pl-1 font-mono text-slate-400">{e.spent_at}</td>
                                    <td className="py-3">
                                      <div className="font-medium text-white">{e.merchant}</div>
                                      {e.notes && <div className="text-[10px] text-slate-400">{e.notes}</div>}
                                    </td>
                                    <td className="py-3 text-slate-300">
                                      <span className="bg-slate-900 px-2 py-0.5 rounded text-[11px]">
                                        {e.dm_users?.full_name || 'Member'} {isMyExpense && '(You)'}
                                      </span>
                                    </td>
                                    <td className="py-3 text-right font-mono font-bold text-white">
                                      {currency}{parseFloat(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3 text-right pr-1">
                                      {(isMyExpense || isOwner) && (
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            onClick={() => handleOpenEditExpense(e)}
                                            className="text-slate-400 hover:text-indigo-400 p-1 cursor-pointer"
                                            title="Edit receipt"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSharedExpense(e.id)}
                                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                            title="Delete receipt"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
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
                )}
              </>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs rounded-2xl bg-[#0a0f1d] border border-white/8">
                Select a shared pool from the sidebar to view details.
              </div>
            )}
          </div>

        </div>
      )}

      {/* 1-Tap UPI Settle Up Modal */}
      {settleModalData && (
        <div 
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSettleModalData(null)}
        >
          <div 
            className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl bg-[#0a0f1d] border-t sm:border border-white/10 p-5 sm:p-6 pb-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto sm:hidden mb-1" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#00f5a0]/15 border border-[#00f5a0]/30 flex items-center justify-center text-[#00f5a0]">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">1-Tap UPI Settle Up</h3>
                  <p className="text-[11px] text-slate-400">Direct transfer via Google Pay, PhonePe, Paytm</p>
                </div>
              </div>
              <button 
                onClick={() => setSettleModalData(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-2 text-center">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Payment to</span>
              <h4 className="text-sm font-bold text-white">{settleModalData.creditorName}</h4>
              <div className="text-2xl font-bold font-mono text-[#00f5a0]">
                {currency}{settleModalData.amount.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-300 uppercase">
                Recipient UPI ID / VPA
              </label>
              <input
                type="text"
                value={customUpiId}
                onChange={(e) => setCustomUpiId(e.target.value)}
                placeholder="e.g. mobile@upi, friend@okaxis"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#00f5a0]"
              />
              <p className="text-[10px] text-slate-500">Edit or enter the friend's exact UPI handle to pay directly.</p>
            </div>

            <div className="space-y-2 pt-2">
              {/* Direct UPI Intent Link (Native Mobile Launch) */}
              <a
                href={getUpiUrl(settleModalData.creditorName, settleModalData.amount, customUpiId)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00f5a0] to-teal-400 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open GPay / PhonePe / Paytm</span>
              </a>

              {/* Copy UPI Link */}
              <button
                type="button"
                onClick={() => {
                  const url = getUpiUrl(settleModalData.creditorName, settleModalData.amount, customUpiId);
                  navigator.clipboard?.writeText(url);
                  setCopiedUpi(true);
                  setTimeout(() => setCopiedUpi(false), 3000);
                }}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700/60 flex items-center justify-center gap-1.5 active:scale-95 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedUpi ? 'UPI Link Copied!' : 'Copy UPI Payment URI'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-[#0a0f1d] border-t sm:border border-white/10 p-5 sm:p-6 pb-6 space-y-4 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto sm:hidden mb-1" />
            <h3 className="text-base font-bold text-white">Create New Shared Pool</h3>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Project / Group Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4BHK Flatmates, Goa Vacation 2026, Couple Expenses"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Project Type
                </label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="level1_continuous">Level 1: Continuous Shared Ledger (Flatmates, Roommates, Family)</option>
                  <option value="level2_event">Level 2: Event-Based Pool (Goa Trip, Wedding, Festival)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows="2"
                  placeholder="Optional description"
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5 safe-bottom">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-indigo-600 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs active:scale-95 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  Create Pool
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div 
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowAddMemberModal(false)}
        >
          <div 
            className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl bg-[#0a0f1d] border-t sm:border border-white/10 p-5 sm:p-6 pb-6 space-y-4 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto sm:hidden mb-1" />
            <h3 className="text-base font-bold text-white">Add Member to Pool</h3>
            <p className="text-xs text-slate-400">
              Enter the user's registered Email or User ID. The user must already be registered in DhanMool.
            </p>
            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  User Email or UUID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. rahul@example.com or user UUID"
                  value={memberIdentifier}
                  onChange={(e) => setMemberIdentifier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {memberError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                  {memberError}
                </p>
              )}

              {memberSuccess && (
                <p className="text-xs text-[#00f5a0] bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  {memberSuccess}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5 safe-bottom">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs active:scale-95 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Shared Bill Modal */}
      {showExpenseModal && (
        <div 
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowExpenseModal(false)}
        >
          <div 
            className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl bg-[#0a0f1d] border-t sm:border border-white/10 p-5 sm:p-6 pb-6 space-y-4 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto sm:hidden mb-1" />
            <h3 className="text-base font-bold text-white">Log Shared Bill</h3>
            <p className="text-xs text-slate-400">
              You are paying upfront (Gross Outflow). The total will be split evenly across all members.
            </p>
            <form onSubmit={handleCreateSharedExpense} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#00f5a0]"
                />
                {/* Quick Add Amount Chips */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                  {[100, 200, 500, 1000, 2000, 5000].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setExpAmount(prev => ((parseFloat(prev) || 0) + chip).toString())}
                      className="text-[11px] font-mono px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-emerald-500/20 text-slate-300 hover:text-[#00f5a0] border border-white/5 whitespace-nowrap cursor-pointer transition-colors"
                    >
                      +{chip}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setExpAmount('')}
                    className="text-[10px] text-slate-500 hover:text-slate-300 px-1.5 py-1"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Bill Item / Merchant
                </label>
                <input
                  type="text"
                  placeholder="e.g. WiFi bill, Swiggy dinner, Airbnb deposit"
                  value={expMerchant}
                  onChange={(e) => setExpMerchant(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f5a0]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f5a0]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5 safe-bottom">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#00f5a0] hover:bg-emerald-400 text-slate-950 font-bold text-xs active:scale-95 cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  Log Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Shared Project Modal */}
      {showEditProjectModal && (
        <div 
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowEditProjectModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-[#0a0f1d] border-t sm:border border-white/10 p-5 sm:p-6 pb-6 space-y-4 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto sm:hidden mb-1" />
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit Shared Pool</h3>
              <button 
                type="button" 
                onClick={() => setShowEditProjectModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProject} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Pool Name *
                </label>
                <input
                  type="text"
                  required
                  value={editProjectForm.name}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Pool Type
                </label>
                <select
                  value={editProjectForm.project_type}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, project_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="level1_continuous">Level 1: Continuous Shared Ledger (Flatmates, Roommates)</option>
                  <option value="level2_event">Level 2: Event-Based Pool (Goa Trip, Festival, Wedding)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows="2"
                  value={editProjectForm.description}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5 safe-bottom">
                {projectDetails?.created_by === user?.id ? (
                  <button
                    type="button"
                    onClick={handleDeleteProject}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer"
                  >
                    Delete Pool
                  </button>
                ) : <span />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditProjectModal(false)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-indigo-600 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs active:scale-95 cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Shared Expense / Receipt Modal */}
      {editingExpenseItem && (
        <div 
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setEditingExpenseItem(null)}
        >
          <div 
            className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl bg-[#0a0f1d] border-t sm:border border-white/10 p-5 sm:p-6 pb-6 space-y-4 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto sm:hidden mb-1" />
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit Shared Receipt</h3>
              <button 
                type="button" 
                onClick={() => setEditingExpenseItem(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Modifying this bill automatically updates the fair-share contribution split and settlement debts.
            </p>

            <form onSubmit={handleUpdateSharedExpense} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editExpenseForm.amount}
                  onChange={(e) => setEditExpenseForm({ ...editExpenseForm, amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#00f5a0]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Merchant / Item Description *
                </label>
                <input
                  type="text"
                  required
                  value={editExpenseForm.merchant}
                  onChange={(e) => setEditExpenseForm({ ...editExpenseForm, merchant: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f5a0]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={editExpenseForm.spent_at}
                  onChange={(e) => setEditExpenseForm({ ...editExpenseForm, spent_at: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#00f5a0]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={editExpenseForm.notes}
                  onChange={(e) => setEditExpenseForm({ ...editExpenseForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f5a0]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5 safe-bottom">
                <button
                  type="button"
                  onClick={() => setEditingExpenseItem(null)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#00f5a0] hover:bg-emerald-400 text-slate-950 font-bold text-xs active:scale-95 cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  Save Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
