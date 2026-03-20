import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Database, BarChart3, Target, 
  Sparkles, Settings, FileSpreadsheet, ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/Home', icon: LayoutDashboard, label: 'Home' },
  { path: '/DataSources', icon: Database, label: 'Data Sources' },
  { path: '/Datasets', icon: FileSpreadsheet, label: 'Datasets' },
  { path: '/KPIs', icon: Target, label: 'KPIs' },
  { path: '/Dashboards', icon: BarChart3, label: 'Dashboards' },
  { path: '/Helios', icon: Sparkles, label: 'HELIOS' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-slate-950 border-r border-slate-800/50 z-40 transition-all duration-300 flex flex-col",
      collapsed ? "w-[72px]" : "w-[240px]"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800/50">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
            <span className="text-slate-950 font-black text-sm">A</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm tracking-wide">AMBAR BI</span>
              <span className="text-amber-500/60 text-[10px] tracking-widest uppercase">Intelligence</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-amber-400")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-slate-800/50">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors text-sm"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
