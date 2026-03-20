import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Sparkles, Loader2, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import PageHeader from '@/components/shared/PageHeader';
import DashboardView from '@/components/dashboard/DashboardView';

export default function Dashboards() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [intent, setIntent] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [viewingDashboard, setViewingDashboard] = useState(null);

  const { data: dashboards = [] } = useQuery({
    queryKey: ['dashboards'],
    queryFn: () => base44.entities.AnalysisDashboard.list('-created_date'),
  });

  const { data: allDatasets = [] } = useQuery({
    queryKey: ['datasets-ready'],
    queryFn: () => base44.entities.Dataset.filter({ status: 'ready' }),
  });
  // Only datasets with actual processed data
  const datasets = allDatasets.filter(d => d.columns?.length > 0 && d.row_count > 0);

  const generateDashboard = useMutation({
    mutationFn: async ({ intent, datasetId }) => {
      const dataset = datasets.find(d => d.id === datasetId);
      if (!dataset) return;

      const columnInfo = (dataset.columns || []).map(c => `${c.name} (${c.type})`).join(', ');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a dashboard configuration for a business analysis.

User intent: "${intent}"
Dataset: "${dataset.name}"
Columns: ${columnInfo}
Sample data: ${JSON.stringify((dataset.raw_data || []).slice(0, 10))}

Generate a dashboard with:
1. 3-4 KPI cards with realistic sample values based on the data
2. 2-3 charts (bar, line, or area) with data points based on the sample data
Each chart should have a title, type (bar/line/area), x_axis field, y_axis field, and data array with actual data points.
KPI cards should have label, value (as string with formatting), trend (up/down/stable), and change (percentage string).`,
        response_json_schema: {
          type: 'object',
          properties: {
            dashboard_name: { type: 'string' },
            kpi_cards: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  value: { type: 'string' },
                  trend: { type: 'string' },
                  change: { type: 'string' }
                }
              }
            },
            charts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  title: { type: 'string' },
                  x_axis: { type: 'string' },
                  y_axis: { type: 'string' },
                  data: { type: 'array', items: { type: 'object' } }
                }
              }
            }
          }
        }
      });

      const dashboard = await base44.entities.AnalysisDashboard.create({
        name: result.dashboard_name || intent,
        dataset_id: datasetId,
        intent,
        kpi_cards: result.kpi_cards || [],
        charts: result.charts || [],
      });

      await base44.entities.AnalysisActivity.create({
        type: 'dashboard_generated',
        title: `Dashboard: ${result.dashboard_name || intent}`,
        description: `Generated from "${intent}" using ${dataset.name}`,
        dataset_id: datasetId,
        dashboard_id: dashboard.id,
      });

      return dashboard;
    },
    onSuccess: (dashboard) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      setViewingDashboard(dashboard);
      setIntent('');
    },
  });

  const deleteDashboard = useMutation({
    mutationFn: (id) => base44.entities.AnalysisDashboard.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      if (viewingDashboard) setViewingDashboard(null);
    },
  });

  if (viewingDashboard) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <button onClick={() => setViewingDashboard(null)} className="text-sm text-slate-400 hover:text-white mb-4 inline-flex items-center gap-1">
          ← Volver a paneles
        </button>
        <DashboardView dashboard={viewingDashboard} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Paneles" subtitle="Paneles generados por HELIOS a partir de tu intención analítica" />

      {/* Generate Dashboard */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="bg-gradient-to-r from-slate-900 to-slate-900/80 border border-slate-800/50 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Generate with HELIOS
            </div>
            <p className="text-white font-semibold mb-4">Describe lo que quieres analizar</p>
            {datasets.length === 0 && (
              <p className="text-xs text-amber-400 mb-3 flex items-center gap-1">⚠ No hay conjuntos de datos con información procesada. Carga y procesa un archivo primero.</p>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
                <SelectTrigger className="w-full sm:w-48 bg-slate-800/50 border-slate-700/50 text-white">
                  <SelectValue placeholder="Seleccionar dataset" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map(ds => <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <input
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && selectedDatasetId && intent.trim() && generateDashboard.mutate({ intent, datasetId: selectedDatasetId })}
                placeholder="Ej: Analizar ventas, Mostrar costos de proyectos..."
                className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-amber-500/50"
              />
              <button
                onClick={() => generateDashboard.mutate({ intent, datasetId: selectedDatasetId })}
                disabled={!selectedDatasetId || !intent.trim() || generateDashboard.isPending}
                className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold px-5 py-3 rounded-xl text-sm hover:shadow-lg hover:shadow-amber-500/20 transition-all disabled:opacity-40 flex items-center gap-2 whitespace-nowrap"
              >
                {generateDashboard.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                Generar
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dashboard List */}
      {dashboards.length === 0 ? (
        <div className="text-center py-20">
          <BarChart3 className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">Aún no hay paneles</p>
          <p className="text-xs text-slate-600">Describe lo que quieres analizar y HELIOS generará un panel automáticamente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((db) => (
            <motion.div key={db.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <button
                onClick={() => setViewingDashboard(db)}
                className="w-full bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5 text-left hover:border-amber-500/30 transition-all group relative"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-amber-400" />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteDashboard.mutate(db.id); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-all p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm font-semibold text-white mb-1">{db.name}</p>
                <p className="text-xs text-slate-500 truncate">{db.intent}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] text-slate-600">{db.kpi_cards?.length || 0} KPIs · {db.charts?.length || 0} charts</span>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
