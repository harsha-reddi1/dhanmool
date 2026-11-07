import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, UserPlus, KeyRound, Edit3, Trash2, Users, Database, 
  Activity, DollarSign, Calendar, X, Check, AlertTriangle, ShieldCheck 
} from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Provision Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('member');
  const [newDob, setNewDob] = useState('');
  const [newAnniversary, setNewAnniversary] = useState('');
  const [newBudget, setNewBudget] = useState('50000');
  const [createError, setCreateError] = useState('');

  // Edit User Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('member');
  const [editDob, setEditDob] = useState('');
  const [editAnniversary, setEditAnniversary] = useState('');
  const [editBudget, setEditBudget] = useState('50000');
  const [editError, setEditError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset PW Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [resetPw, setResetPw] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, s] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminStats(),
      ]);
      setUsersList(u);
      setStats(s);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');
    try {
      await api.createAdminUser({
        email: newEmail,
        password: newPassword,
        full_name: newName,
        role: newRole,
        date_of_birth: newDob || null,
        anniversary_date: newAnniversary || null,
        monthly_budget_target: parseFloat(newBudget) || 0,
      });
      setShowCreateModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      loadData();
    } catch (err) {
      setCreateError(err.message || 'Failed to provision user');
    }
  };

  const openEditModal = (target) => {
    setEditingUser(target);
    setEditName(target.full_name || '');
    setEditEmail(target.email || '');
    setEditRole(target.role || 'member');
    setEditDob(target.date_of_birth || '');
    setEditAnniversary(target.anniversary_date || '');
    setEditBudget(target.monthly_budget_target || 50000);
    setEditError('');
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError('');
    setIsUpdating(true);
    try {
      await api.updateAdminUser(editingUser.id, {
        full_name: editName,
        email: editEmail,
        role: editRole,
        date_of_birth: editDob || null,
        anniversary_date: editAnniversary || null,
        monthly_budget_target: parseFloat(editBudget) || 0,
      });
      setShowEditModal(false);
      loadData();
    } catch (err) {
      setEditError(err.message || 'Failed to update user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (target) => {
    if (target.id === user?.id) {
      alert('Security Safeguard: You cannot delete your own active administrator account.');
      return;
    }
    const confirmMsg = `Are you sure you want to PERMANENTLY REMOVE ${target.full_name} (${target.email})?\n\nThis will remove their profile and unbind their associated records.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.deleteAdminUser(target.id);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (targetUser) => {
    if (targetUser.id === user?.id) {
      alert('You cannot deactivate your own superuser account.');
      return;
    }
    try {
      await api.toggleUserStatus(targetUser.id, !targetUser.is_active);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPw.trim()) return;
    try {
      await api.resetUserPassword(selectedUser.id, resetPw);
      setResetSuccess('Password reset successfully!');
      setTimeout(() => {
        setShowResetModal(false);
        setResetSuccess('');
        setResetPw('');
      }, 1500);
    } catch (err) {
      alert(err.message || 'Failed to reset password');
    }
  };

  const currency = user?.currency_symbol || '₹';

  return (
    <div className="space-y-5 pb-10">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-950/20 border border-amber-500/30 p-4 sm:p-5 rounded-2xl">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Super Administrator Portal
          </h1>
          <p className="text-xs text-amber-200/80 mt-1">
            Private system governance: Manage, edit, provision & remove users.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>Provision New User</span>
        </button>
      </div>

      {/* System KPI Cards Grid (Responsive 2-col on mobile, 6-col on desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Users</p>
          <p className="text-lg sm:text-xl font-bold font-mono text-white mt-1">{stats.total_users || 0}</p>
        </div>
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Active Users</p>
          <p className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-1">{stats.active_users || 0}</p>
        </div>
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Spends</p>
          <p className="text-lg sm:text-xl font-bold font-mono text-indigo-400 mt-1">{stats.total_expenses_count || 0}</p>
        </div>
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Volume</p>
          <p className="text-sm sm:text-base lg:text-xl font-bold font-mono text-white mt-1 truncate">{currency}{(stats.total_spent_volume || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Shared Pools</p>
          <p className="text-lg sm:text-xl font-bold font-mono text-purple-400 mt-1">{stats.total_shared_projects || 0}</p>
        </div>
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Udhar Records</p>
          <p className="text-lg sm:text-xl font-bold font-mono text-amber-400 mt-1">{stats.total_lending_count || 0}</p>
        </div>
      </div>

      {/* Users Directory */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Registered User Directory</h2>
            <p className="text-[11px] text-slate-400">All registered members and administrators</p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            {usersList.length} accounts
          </span>
        </div>

        {/* --- MOBILE CARDS VIEW (Visible only on mobile screens < md) --- */}
        <div className="block md:hidden space-y-3">
          {usersList.map((u) => {
            const isAdminRole = u.role === 'admin';
            const isMe = u.id === user?.id;

            return (
              <div 
                key={u.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white text-sm truncate">{u.full_name}</h3>
                      {isMe && (
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono truncate">{u.email}</p>
                  </div>

                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                    isAdminRole 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {u.role}
                  </span>
                </div>

                {/* Details row */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Monthly Budget</span>
                    <span className="font-mono font-medium text-white">
                      {currency}{parseFloat(u.monthly_budget_target || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px]">Account Status</span>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`inline-flex items-center gap-1 font-semibold text-[10px] transition-colors ${
                        u.is_active ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span>{u.is_active ? 'Active' : 'Deactivated'}</span>
                    </button>
                  </div>

                  {(u.date_of_birth || u.anniversary_date) && (
                    <div className="col-span-2 pt-1 border-t border-slate-800/60 text-slate-400 text-[10px]">
                      {u.date_of_birth && <span>DOB: {u.date_of_birth} </span>}
                      {u.anniversary_date && <span>| Anniv: {u.anniversary_date}</span>}
                    </div>
                  )}
                </div>

                {/* Mobile Action Buttons (Full-width touch targets) */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    onClick={() => openEditModal(u)}
                    className="py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedUser(u);
                      setShowResetModal(true);
                    }}
                    className="py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors active:scale-95"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Reset PW</span>
                  </button>

                  <button
                    onClick={() => handleDeleteUser(u)}
                    disabled={isMe}
                    className="py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-rose-400 text-xs font-semibold flex items-center justify-center gap-1 transition-colors active:scale-95 border border-rose-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* --- DESKTOP TABLE VIEW (Visible on md and larger) --- */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-3 pl-1">User Details</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Milestones (DOB / Anniv)</th>
                <th className="pb-3 text-right">Budget Target</th>
                <th className="pb-3 text-right pr-1">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {usersList.map((u) => {
                const isAdminRole = u.role === 'admin';
                const isMe = u.id === user?.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pl-1">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <span>{u.full_name}</span>
                        {isMe && (
                          <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>

                    <td className="py-3">
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        isAdminRole 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                          u.is_active 
                            ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' 
                            : 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20'
                        }`}
                        title="Click to toggle status"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span>{u.is_active ? 'Active' : 'Deactivated'}</span>
                      </button>
                    </td>

                    <td className="py-3 text-[11px] text-slate-400">
                      <div>DOB: {u.date_of_birth || 'Not set'}</div>
                      <div>Anniv: {u.anniversary_date || 'Not set'}</div>
                    </td>

                    <td className="py-3 text-right font-mono font-medium text-white">
                      {currency}{parseFloat(u.monthly_budget_target || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 text-right pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(u)}
                          className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                          title="Edit user details"
                        >
                          <Edit3 className="w-3 h-3 text-indigo-400" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setShowResetModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                          title="Reset password"
                        >
                          <KeyRound className="w-3 h-3 text-amber-400" />
                          <span>Reset PW</span>
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={isMe}
                          className="p-1 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-rose-400 transition-colors cursor-pointer"
                          title={isMe ? 'Cannot delete yourself' : 'Permanently remove user'}
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
      </div>

      {/* --- EDIT USER MODAL --- */}
      {showEditModal && editingUser && (
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto sm:hidden mb-2" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                Edit User Account
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    System Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="member">Standard Member</option>
                    <option value="admin">Super Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Monthly Budget (₹)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Anniversary
                  </label>
                  <input
                    type="date"
                    value={editAnniversary}
                    onChange={(e) => setEditAnniversary(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {editError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  {editError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PROVISION USER MODAL --- */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto sm:hidden mb-2" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                Provision New User
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="vikram@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Initial Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Initial password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="member">Standard Member</option>
                    <option value="admin">Super Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Monthly Budget (₹)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Anniversary
                  </label>
                  <input
                    type="date"
                    value={newAnniversary}
                    onChange={(e) => setNewAnniversary(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {createError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  {createError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95"
                >
                  Create & Activate Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RESET PASSWORD MODAL --- */}
      {showResetModal && selectedUser && (
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowResetModal(false)}
        >
          <div 
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto sm:hidden mb-2" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Reset Password
              </h3>
              <button 
                onClick={() => setShowResetModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              User: <strong className="text-white">{selectedUser.full_name}</strong> ({selectedUser.email})
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter temporary or new password"
                  value={resetPw}
                  onChange={(e) => setResetPw(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {resetSuccess && (
                <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  {resetSuccess}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs active:scale-95"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
