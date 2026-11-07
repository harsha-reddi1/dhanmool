import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, UserPlus, KeyRound, ToggleLeft, ToggleRight, Users, Database, Activity, DollarSign, Calendar 
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
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-950/20 border border-amber-500/30 p-4 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Super Administrator Portal
          </h1>
          <p className="text-xs text-amber-200/80 mt-0.5">
            Private system governance: Closed user provisioning, credential control & platform activity monitoring.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>Provision New User</span>
        </button>
      </div>

      {/* System KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Users</p>
          <p className="text-xl font-bold font-mono text-white mt-1">{stats.total_users || 0}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Active Users</p>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1">{stats.active_users || 0}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Spends Logged</p>
          <p className="text-xl font-bold font-mono text-indigo-400 mt-1">{stats.total_expenses_count || 0}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Volume</p>
          <p className="text-xl font-bold font-mono text-white mt-1">{currency}{(stats.total_spent_volume || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Shared Ledgers</p>
          <p className="text-xl font-bold font-mono text-purple-400 mt-1">{stats.total_shared_projects || 0}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Udhar Records</p>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1">{stats.total_lending_count || 0}</p>
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Registered User Directory</h2>
            <p className="text-[11px] text-slate-400">All registered members and administrators in DhanMool</p>
          </div>
          <span className="text-xs font-mono text-slate-400">{usersList.length} accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-3 pl-1">User Details</th>
                <th className="pb-3">User UUID</th>
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
                return (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pl-1">
                      <div className="font-semibold text-white">{u.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>

                    <td className="py-3 font-mono text-slate-500 text-[10px]">
                      {u.id}
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
                        className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                          u.is_active 
                            ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' 
                            : 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20'
                        }`}
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
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setShowResetModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                        title="Reset password"
                      >
                        <KeyRound className="w-3 h-3 inline mr-1" />
                        Reset PW
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-400" />
              Provision New User Account
            </h3>
            <p className="text-xs text-slate-400">
              Only an Admin can register users. Provide initial credentials for the new member.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-3">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
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
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
                >
                  Create & Activate Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Reset User Password</h3>
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
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
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
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
