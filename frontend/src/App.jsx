import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';
import Navbar from './components/Navbar';
import QuickAddModal from './components/QuickAddModal';
import ProfileModal from './components/ProfileModal';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SharedProjectsPage from './pages/SharedProjectsPage';
import LendingPage from './pages/LendingPage';
import EventsPage from './pages/EventsPage';
import AIAdvisorPage from './pages/AIAdvisorPage';
import AdminPage from './pages/AdminPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadAuxData = async () => {
    if (!user) return;
    try {
      const [evList, projList] = await Promise.all([
        api.getEvents(),
        api.getProjects(),
      ]);
      setEvents(evList);
      setProjects(projList);
    } catch (err) {
      console.error('Failed to load aux data:', err);
    }
  };

  useEffect(() => {
    loadAuxData();
  }, [user, refreshTrigger]);

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
    setRefreshTrigger(prev => prev + 1);
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardPage 
            key={refreshTrigger}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            onOpenEvents={() => setActiveTab('events')}
            onOpenLending={() => setActiveTab('lending')}
          />
        )}

        {activeTab === 'shared' && (
          <SharedProjectsPage 
            key={refreshTrigger}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          />
        )}

        {activeTab === 'lending' && (
          <LendingPage 
            key={refreshTrigger}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          />
        )}

        {activeTab === 'events' && (
          <EventsPage 
            key={refreshTrigger}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          />
        )}

        {activeTab === 'ai' && (
          <AIAdvisorPage 
            onOpenEvents={() => setActiveTab('events')}
            onOpenLending={() => setActiveTab('lending')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPage />
        )}
      </main>

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
