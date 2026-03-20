import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HeliosButton({ 
  children, 
  onClick, 
  disabled = false, 
  size = 'md',
  variant = 'primary',
  className,
  ...props 
}) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:shadow-lg hover:shadow-amber-500/20',
    secondary: 'bg-slate-900/50 border border-slate-800/50 text-slate-200 hover:border-amber-500/30 hover:text-white',
    ghost: 'text-slate-400 hover:text-amber-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 font-medium rounded-xl transition-all',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <Sparkles className="w-4 h-4" />
      {children}
    </button>
  );
}
