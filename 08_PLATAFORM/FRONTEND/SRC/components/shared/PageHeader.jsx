import React from 'react';
import { motion } from 'framer-motion';

export default function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          {Icon && <Icon className="w-6 h-6 text-amber-400" />}
          <h1 className="text-3xl font-bold text-white">{title}</h1>
        </div>
        {subtitle && <p className="text-slate-400 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </motion.div>
  );
}
