import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';
import Navbar from './components/Navbar';
import MobileBottomBar from './components/MobileBottomBar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { Plus } from 'lucide-react';

// Route Code Splitting: Lazy-load heavy auxiliary tabs & modals on demand
const SharedProjectsPage = lazy(() => import('./pages/SharedProjectsPage'));
const LendingPage = lazy(() => import('./pages/LendingPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const AIAdvisorPage = lazy(() => import('./pages/AIAdvisorPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const QuickAddModal = lazy(() => import('./components/QuickAddModal'));
const ProfileModal = lazy(() => import('./components/ProfileModal'));

function TabFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 animate-pulse">
      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#00f5a0]/15 to-emerald-500/15 border border-[#00f5a0]/30 flex items-center justify-center font-bold text-[#00f5a0] text-xl shadow-[0_0_20px_rgba(0,245,160,0.1)]">
        ₹
      </div>
      <p className="text-xs text-slate-500 font-mono tracking-wide">Syncing ledger module...</p>
    </div>
  );
}

function AppContent() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hasGlobalModal, setHasGlobalModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['dashboard']));

  // Track global modal open state to prevent bottom buttons from overlapping modals
  useEffect(() => {
    const handler = (e) => {
      setHasGlobalModal(Boolean(e.detail?.hasOpenModal));
    };
    window.addEventListener('dhanmool:modal-change', handler);
    return () => window.removeEventListener('dhanmool:modal-change', handler);
  }, []);

  const isModalActive = isQuickAddOpen || isProfileOpen || hasGlobalModal;

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
      <div className="min-h-screen bg-[#05080e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00f5a0] to-emerald-600 flex items-center justify-center font-bold text-slate-950 text-2xl animate-pulse shadow-[0_0_30px_rgba(0,245,160,0.25)]">
            ₹
          </div>
          <p className="text-xs text-slate-400 font-mono tracking-wide">Rooting your wealth...</p>
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
    <div className="min-h-screen bg-[#05080e] text-slate-100 flex flex-col selection:bg-[#00f5a0] selection:text-slate-950">
      
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

        <Suspense fallback={<TabFallback />}>
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
        </Suspense>
      </main>

      {/* Mobile Floating Action Button (hidden when any modal is open) */}
      {!isModalActive && (
        <button
          type="button"
          onClick={() => setIsQuickAddOpen(true)}
          className="mobile-fab fixed bottom-20 right-4 z-30 md:hidden w-14 h-14 rounded-full bg-gradient-to-tr from-[#00f5a0] to-emerald-500 text-slate-950 shadow-xl shadow-[#00f5a0]/25 flex items-center justify-center transition-transform active:scale-90 border border-[#00f5a0]/40 cursor-pointer pointer-events-auto touch-manipulation"
          aria-label="Add Transaction"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      )}

      {/* Mobile Bottom Navigation Bar (hidden when any modal is open) */}
      {!isModalActive && (
        <MobileBottomBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Suspense Wrappers for Modals */}
      <Suspense fallback={null}>
        {isQuickAddOpen && (
          <QuickAddModal
            isOpen={isQuickAddOpen}
            onClose={() => setIsQuickAddOpen(false)}
            onExpenseAdded={handleExpenseAdded}
            events={events}
            projects={projects}
          />
        )}

        {isProfileOpen && (
          <ProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
          />
        )}
      </Suspense>

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
