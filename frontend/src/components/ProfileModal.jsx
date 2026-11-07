import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Calendar, User, Lock, Check, ShieldCheck } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile Form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [dob, setDob] = useState(user?.date_of_birth || '');
  const [anniversary, setAnniversary] = useState(user?.anniversary_date || '');
  const [monthlyBudget, setMonthlyBudget] = useState(user?.monthly_budget_target || 50000);
  const [currencySymbol, setCurrencySymbol] = useState(user?.currency_symbol || '₹');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  if (!isOpen) return null;

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    try {
      await api.updateProfile({
        full_name: fullName,
        date_of_birth: dob || null,
        anniversary_date: anniversary || null,
        monthly_budget_target: parseFloat(monthlyBudget) || 0,
        currency_symbol: currencySymbol,
      });
      await refreshProfile();
      setSuccessMsg('Profile and milestones updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }

    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSuccess(''), 3000);
    } catch (err) {
      setPwError(err.message || 'Failed to update password');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">Profile & Milestones</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6 pt-2 gap-4 text-xs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Personal & Milestones
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'security'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Security & Password
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {activeTab === 'profile' ? (
            <form onSubmit={handleProfileSave} className="space-y-4">
              
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 cursor-not-allowed font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">Managed by DhanMool Super Administrator.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-amber-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">AI plans birthday treats</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-rose-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Anniversary
                  </label>
                  <input
                    type="date"
                    value={anniversary}
                    onChange={(e) => setAnniversary(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">AI plans anniversary buffer</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Monthly Budget Target (₹)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white text-center font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {successMsg && (
                <p className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                  <Check className="w-3.5 h-3.5" /> {successMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Update Milestones & Budget'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {pwError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  {pwError}
                </p>
              )}

              {pwSuccess && (
                <p className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                  <Check className="w-3.5 h-3.5" /> {pwSuccess}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Change Password</span>
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
