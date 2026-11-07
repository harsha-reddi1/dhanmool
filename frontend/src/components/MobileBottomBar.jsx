import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  HandCoins, 
  CalendarRange, 
  Bot, 
  ShieldAlert 
} from 'lucide-react';

export default function MobileBottomBar({ activeTab, setActiveTab }) {
  const { isAdmin } = useAuth();

  const navItems = [
    { id: 'dashboard', shortLabel: 'Home', icon: LayoutDashboard },
    { id: 'shared', shortLabel: 'Shared', icon: Users },
    { id: 'lending', shortLabel: 'Udhar', icon: HandCoins },
    { id: 'events', shortLabel: 'Events', icon: CalendarRange },
    { id: 'ai', shortLabel: 'Advisor', icon: Bot },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', shortLabel: 'Admin', icon: ShieldAlert, isAdminTab: true });
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 safe-bottom md:hidden shadow-2xl pointer-events-auto">
      <div className="flex items-center justify-around w-full px-1 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTab(item.id);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer min-h-[48px] active:scale-95 touch-manipulation pointer-events-auto select-none ${
                isActive 
                  ? item.isAdminTab 
                    ? 'text-amber-400 font-bold' 
                    : 'text-emerald-400 font-bold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] mt-1 tracking-tight leading-none truncate max-w-full">
                {item.shortLabel}
              </span>
              {isActive && (
                <span className={`w-1 h-1 rounded-full mt-1 ${item.isAdminTab ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
