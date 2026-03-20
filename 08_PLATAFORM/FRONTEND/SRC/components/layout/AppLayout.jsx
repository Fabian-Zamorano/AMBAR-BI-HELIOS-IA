import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950">
      <style>{`
        :root {
          --sidebar-width: ${collapsed ? '72px' : '240px'};
        }
      `}</style>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        collapsed ? "ml-[72px]" : "ml-[240px]"
      )}>
        <Outlet />
      </main>
    </div>
  );
}
