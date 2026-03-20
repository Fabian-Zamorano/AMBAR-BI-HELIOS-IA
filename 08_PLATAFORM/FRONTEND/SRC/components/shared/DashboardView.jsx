import React from 'react';
import { motion } from 'framer-motion';
import KPICard from './KPICard';

export default function DashboardView({ dashboard, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400 text-sm">Generando dashboard...</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400 text-sm">No hay dashboard disponible</div>
      </div>
    );
  }

  const kpiCards = dashboard.kpi_cards || [];
  const charts = dashboard.charts || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
      className="space-y-6"
    >
      {/* KPI Section */}
      {kpiCards.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Indicadores</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((kpi, idx) => (
              <KPICard
                key={idx}
                label={kpi.label}
                value={kpi.value}
                trend={kpi.trend}
                format={kpi.format}
              />
            ))}
          </div>
        </div>
      )}

      {/* Charts Section */}
      {charts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Visualizaciones</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {charts.map((chart, idx) => (
              <div
                key={idx}
                className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6"
              >
                <h4 className="text-sm font-semibold text-white mb-4">{chart.title}</h4>
                <div className="text-slate-400 text-xs text-center py-12">
                  Gráfico tipo {chart.type}: {chart.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {kpiCards.length === 0 && charts.length === 0 && (
        <div className="text-center py-20">
          <p className="text-slate-400 text-sm">Dashboard vacío</p>
        </div>
      )}
    </motion.div>
  );
}
