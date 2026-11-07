import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';
import Navbar from './components/Navbar';
import MobileBottomBar from './components/MobileBottomBar';
import QuickAddModal from './components/QuickAddModal';
import ProfileModal from './components/ProfileModal';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SharedProjectsPage from './pages/SharedProjectsPage';
import LendingPage from './pages/LendingPage';
import EventsPage from './pages/EventsPage';
import AIAdvisorPage from './pages/AIAdvisorPage';
import AdminPage from './pages/AdminPage';
import { Plus } from 'lucide-react';

function AppContent() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['dashboard']));

  // Track visited tabs to keep them alive in memory (0ms instant tab switching)
  useEffect(() => {
    setVisitedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const loadAuxData = async (bypassCache = false) => {
    if (!user) return;
    try {
      const [evList, projList] = await Promise.all([
        api.getEvents(bypassCache),
        api.getProjects(bypassCache),
      ]);
      setEvents(evList);
      setProjects(projList);
    } catch (err) {
      console.error('Failed to load aux data:', err);
    }
  };

  useEffect(() => {
    loadAuxData();
  }, [user]);

  // Listen to cache invalidation events (e.g. after adding expense, project, event)
  useEffect(() => {
    const handleInvalidation = (e) => {
      const tags = e.detail?.tags || [];
      if (tags.length === 0 || tags.includes('events') || tags.includes('shared')) {
        loadAuxData(true);
      }
    };
    window.addEventListener('dhanmool:cache-invalidated', handleInvalidation);
    return () => window.removeEventListener('dhanmool:cache-invalidated', handleInvalidation);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-amber-500 flex items-center justify-center font-bold text-white text-2xl animate-pulse">
            ₹
          </div>
          <p className="text-xs text-slate-400 font-mono">Rooting your wealth...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleExpenseAdded = () => {
    // api.createExpense already invalidates cache and dispatches dhanmool:cache-invalidated
    loadAuxData(true);
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Content Area: Persistent Tabs for 0ms Instant Switching */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-8">
        <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
          <DashboardPage 
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            onOpenEvents={() => setActiveTab('events')}
            onOpenLending={() => setActiveTab('lending')}
          />
        </div>

        {visitedTabs.has('shared') && (
          <div className={activeTab === 'shared' ? 'block' : 'hidden'}>
            <SharedProjectsPage 
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            />
          </div>
        )}

        {visitedTabs.has('lending') && (
          <div className={activeTab === 'lending' ? 'block' : 'hidden'}>
            <LendingPage 
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            />
          </div>
        )}

        {visitedTabs.has('events') && (
          <div className={activeTab === 'events' ? 'block' : 'hidden'}>
            <EventsPage 
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            />
          </div>
        )}

        {visitedTabs.has('ai') && (
          <div className={activeTab === 'ai' ? 'block' : 'hidden'}>
            <AIAdvisorPage 
              onOpenEvents={() => setActiveTab('events')}
              onOpenLending={() => setActiveTab('lending')}
            />
          </div>
        )}

        {isAdmin && visitedTabs.has('admin') && (
          <div className={activeTab === 'admin' ? 'block' : 'hidden'}>
            <AdminPage />
          </div>
        )}
      </main>

      {/* Mobile Floating Action Button (1-tap quick add, above main, below bottom bar) */}
      <button
        type="button"
        onClick={() => setIsQuickAddOpen(true)}
        className="fixed bottom-20 right-4 z-40 md:hidden w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-xl shadow-emerald-500/30 flex items-center justify-center transition-transform active:scale-90 border border-emerald-300/40 cursor-pointer pointer-events-auto touch-manipulation"
        aria-label="Add Transaction"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Mobile Bottom Navigation Bar (Dedicated, z-50, always clickable) */}
      <MobileBottomBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onExpenseAdded={handleExpenseAdded}
        events={events}
        projects={projects}
      />

      {/* Profile & Milestones Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
