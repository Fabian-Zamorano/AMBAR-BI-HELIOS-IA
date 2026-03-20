import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Database, FileSpreadsheet, Target, BarChart3, Sparkles, 
  ArrowRight, Upload, Clock, Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import PageHeader from '@/components/shared/PageHeader';
import KPICard from '@/components/shared/KPICard';
import HeliosButton from '@/components/shared/HeliosButton';

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const { data: datasets = [] } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => base44.entities.Dataset.list('-created_date', 5),
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => base44.entities.KPI.list('-created_date', 10),
  });

  const { data: dashboards = [] } = useQuery({
    queryKey: ['dashboards'],
    queryFn: () => base44.entities.AnalysisDashboard.list('-created_date', 5),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.AnalysisActivity.list('-created_date', 8),
  });

  const handleHeliosQuery = () => {
    if (query.trim()) {
      navigate(`/Helios?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const quickActions = [
    { icon: Upload, label: 'Cargar datos', description: 'Importa un conjunto de datos', path: '/DataSources' },
    { icon: BarChart3, label: 'Analizar ventas', description: 'Revisa el desempeño comercial', path: '/Helios', query: 'Analizar ventas' },
    { icon: Target, label: 'Analizar operación', description: 'Evalúa la eficiencia operativa', path: '/Helios', query: 'Analizar operación' },
    { icon: Sparkles, label: 'Preguntar a HELIOS', description: 'Análisis con inteligencia artificial', path: '/Helios' },
  ];

  const activityIcons = {
    upload: Upload,
    analysis: Sparkles,
    kpi_created: Target,
    dashboard_generated: BarChart3,
    helios_query: Sparkles,
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Bienvenido a ÁMBAR BI" subtitle="Tu espacio de análisis inteligente para el negocio" />

      {/* HELIOS Query Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <div className="bg-gradient-to-r from-slate-900 to-slate-900/80 border border-slate-800/50 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-3">
              <Sparkles className="w-4 h-4" />
              <span>HELIOS · Asistente de análisis</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-4">¿Qué quieres analizar?</h2>
            <div className="flex gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleHeliosQuery()}
                placeholder="Ej: Analizar ventas, Ver costos de proyectos, Revisar eficiencia operativa..."
                className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
              />
              <button
                onClick={handleHeliosQuery}
                disabled={!query.trim()}
                className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold px-5 py-3 rounded-xl text-sm hover:shadow-lg hover:shadow-amber-500/20 transition-all disabled:opacity-40 flex items-center gap-2"
              >
                Analizar
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Summary */}
      {kpis.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Indicadores principales</h3>
            <button onClick={() => navigate('/KPIs')} className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.slice(0, 4).map((kpi) => (
              <KPICard
                key={kpi.id}
                label={kpi.name}
                value={kpi.value != null ? kpi.value.toLocaleString() : '—'}
                trend={kpi.trend}
                icon={Target}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Acciones rápidas</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.query ? `${action.path}?q=${encodeURIComponent(action.query)}` : action.path)}
              className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5 text-left hover:border-amber-500/30 hover:bg-slate-900/80 transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center mb-3 group-hover:bg-amber-500/10 transition-colors">
                <action.icon className="w-5 h-5 text-slate-400 group-hover:text-amber-400 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">{action.label}</p>
              <p className="text-xs text-slate-500">{action.description}</p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Two Column: Datasets + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Datasets */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Conjuntos de datos recientes</h3>
              <button onClick={() => navigate('/DataSources')} className="text-xs text-slate-400 hover:text-amber-400 transition-colors">Ver todos</button>
            </div>
            {datasets.length === 0 ? (
              <div className="text-center py-8">
                <Database className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-3">Aún no hay conjuntos de datos</p>
                <button onClick={() => navigate('/DataSources')} className="text-xs text-amber-400 hover:text-amber-300 inline-flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Carga tu primer conjunto de datos
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {datasets.map((ds) => (
                  <button key={ds.id} onClick={() => navigate(`/Datasets?id=${ds.id}`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/50 transition-colors text-left">
                    <FileSpreadsheet className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{ds.name}</p>
                      <p className="text-xs text-slate-500">{ds.row_count ? `${ds.row_count} rows` : ds.source_type}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      ds.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400' :
                      ds.status === 'analyzing' ? 'bg-amber-500/10 text-amber-400' :
                      ds.status === 'error' ? 'bg-rose-500/10 text-rose-400' :
                      'bg-slate-500/10 text-slate-400'
                    }`}>
                      {ds.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Actividad reciente</h3>
            {activities.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Sin actividad aún</p>
                <p className="text-xs text-slate-600 mt-1">Empieza cargando datos o preguntando a HELIOS</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activities.map((act) => {
                  const ActIcon = activityIcons[act.type] || Clock;
                  return (
                    <div key={act.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/30 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-slate-800/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <ActIcon className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{act.title}</p>
                        <p className="text-xs text-slate-500 truncate">{act.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
