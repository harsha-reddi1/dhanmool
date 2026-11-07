import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Plus, UserPlus, ArrowRightLeft, Check, Shield, DollarSign, Calendar, Layers 
} from 'lucide-react';

export default function SharedProjectsPage({ onOpenQuickAdd }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);

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

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
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

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    try {
      await api.createProject({
        name: projectName,
        description: projectDesc,
        project_type: projectType,
      });
      setShowCreateModal(false);
      setProjectName('');
      setProjectDesc('');
      loadProjects();
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
        user_identifier: memberIdentifier,
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
        merchant: expMerchant || 'Shared Group Spend',
        notes: expNotes,
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

  const currency = user?.currency_symbol || '₹';

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Shared Expenses & Ledgers
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            2-Level Collaborative Tracking: Level 1 (Flatmates / Couples) & Level 2 (Trip & Event Pools).
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Shared Project</span>
        </button>
      </div>

      {projects.length === 0 && !loading ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <Layers className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Shared Projects Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Create a Level 1 shared ledger with your flatmates or spouse, or a Level 2 event pool for an upcoming Goa trip.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold shadow-md cursor-pointer"
          >
            Create First Shared Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Projects Sidebar */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Your Shared Pools ({projects.length})
            </h2>
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
                        ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-white truncate max-w-[150px]">
                        {p.name}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                        isL1 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-purple-500/20 text-purple-300'
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

          {/* Project Details & Settlements */}
          <div className="lg:col-span-3 space-y-6">
            {projectDetails ? (
              <>
                {/* Project Header Info */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{projectDetails.name}</h2>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                        {projectDetails.project_type === 'level1_continuous' ? 'Continuous Living Pool' : 'Event Sinking Pool'}
                      </span>
                    </div>
                    {projectDetails.description && (
                      <p className="text-xs text-slate-400 mt-1">{projectDetails.description}</p>
                    )}
                    <p className="text-[11px] text-emerald-400 font-mono mt-1">
                      Total Project Outflow: {currency}{(projectDetails.total_spent || 0).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Member</span>
                    </button>
                    <button
                      onClick={() => setShowExpenseModal(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Log Bill</span>
                    </button>
                  </div>
                </div>

                {/* Settlement Balances Matrix */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                        Fair Share & Settlement Balances
                      </h3>
                      <p className="text-[11px] text-slate-400">Equal split among all members</p>
                    </div>
                    <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {projectDetails.settlements?.map((s) => {
                      const isOwed = s.net_balance > 0;
                      const owes = s.net_balance < 0;
                      const isMe = s.user_id === user?.id;
                      return (
                        <div 
                          key={s.user_id}
                          className={`p-3.5 rounded-xl border ${
                            isMe ? 'bg-slate-950 border-emerald-500/40' : 'bg-slate-950/60 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                              {s.full_name} {isMe && '(You)'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Paid: {currency}{s.total_paid.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-slate-400 text-[11px]">Net Balance:</span>
                            <span className={`font-mono font-bold ${
                              isOwed ? 'text-emerald-400' : owes ? 'text-rose-400' : 'text-slate-400'
                            }`}>
                              {isOwed ? `+${currency}${s.net_balance}` : owes ? `-${currency}${Math.abs(s.net_balance)}` : 'Settled'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Project Expenses List */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
                    Shared Bills & Receipts
                  </h3>

                  {projectDetails.expenses?.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No shared expenses logged in this pool yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="pb-2 pl-1">Date</th>
                            <th className="pb-2">Description</th>
                            <th className="pb-2">Paid By</th>
                            <th className="pb-2 text-right pr-1">Total Bill</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {projectDetails.expenses?.map((e) => (
                            <tr key={e.id} className="hover:bg-slate-800/30">
                              <td className="py-2.5 pl-1 font-mono text-slate-400">{e.spent_at}</td>
                              <td className="py-2.5 font-medium text-white">{e.merchant}</td>
                              <td className="py-2.5 text-slate-300">
                                {e.dm_users?.full_name || 'Member'}
                              </td>
                              <td className="py-2.5 text-right pr-1 font-mono font-bold text-white">
                                {currency}{parseFloat(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs">
                Select a project from the sidebar to view details.
              </div>
            )}
          </div>

        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Create New Shared Project</h3>
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

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Add Member to Project</h3>
            <p className="text-xs text-slate-400">
              Enter the user's registered Email or User ID. The user must already be provisioned by a DhanMool Admin.
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
                <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  {memberSuccess}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs"
                >
                  Log Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
