import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ children, onCollapsedChange }: Props) {
  // Default to collapsed on narrow screens (mobile).
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    onCollapsedChange?.(next);
  };

  return (
    <div className={`relative flex-shrink-0 bg-sidebar flex flex-col transition-all duration-200 ${collapsed ? 'w-0 overflow-hidden' : 'w-64'}`}>
      <div className="flex-1 overflow-hidden flex flex-col">
        {children}
      </div>
      <button
        onClick={handleToggle}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-10 bg-sidebar border border-slate-600 rounded-r-md flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  );
}
