import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function KPICard({ label, value, trend, icon: Icon, format = 'default' }) {
  const isPositive = trend >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 hover:border-amber-500/50 transition-all h-full"
    >
      {/* Background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10">
        {/* Header with icon */}
        <div className="flex items-start justify-between mb-3">
          {Icon && (
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-amber-400" />
            </div>
          )}
        </div>

        {/* Label */}
        <div className="text-xs font-medium text-slate-400 mb-2 line-clamp-2">{label}</div>

        {/* Value */}
        <div className="text-2xl font-bold text-white mb-3">{value}</div>

        {/* Trend indicator */}
        {trend !== undefined && (
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-semibold px-2 py-1 rounded-lg',
                isPositive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-rose-500/10 text-rose-400'
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(trend)}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
