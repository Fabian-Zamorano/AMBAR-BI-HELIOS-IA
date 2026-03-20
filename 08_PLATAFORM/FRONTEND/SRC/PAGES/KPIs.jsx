import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, Plus, Trash2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import KPICard from '@/components/shared/KPICard';

const operations = [
  { value: 'sum', label: 'SUM' },
  { value: 'average', label: 'AVERAGE' },
  { value: 'count', label: 'COUNT' },
  { value: 'min', label: 'MIN' },
  { value: 'max', label: 'MAX' },
];

export default function KPIs() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', dataset_id: '', column: '', operation: 'sum', group_by: '' });

  const { data: kpis = [] } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => base44.entities.KPI.list('-created_date'),
  });

  const { data: allDatasets = [] } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => base44.entities.Dataset.filter({ status: 'ready' }),
  });
  // Only datasets with actual data
  const datasets = allDatasets.filter(d => d.columns?.length > 0 && d.row_count > 0);

  const selectedDataset = datasets.find(d => d.id === form.dataset_id);

  const createKPI = useMutation({
    mutationFn: async (kpiData) => {
      const kpi = await base44.entities.KPI.create(kpiData);
      await base44.entities.AnalysisActivity.create({
        type: 'kpi_created',
        title: `Created KPI: ${kpiData.name}`,
        description: `${kpiData.operation.toUpperCase()} of ${kpiData.column}`,
        dataset_id: kpiData.dataset_id,
      });
      return kpi;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      setDialogOpen(false);
      setForm({ name: '', dataset_id: '', column: '', operation: 'sum', group_by: '' });
    },
  });

  const deleteKPI = useMutation({
    mutationFn: (id) => base44.entities.KPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpis'] }),
  });

  const autoCreateKPIs = useMutation({
    mutationFn: async (dataset) => {
      const suggestedKpis = dataset.suggested_kpis || [];
      for (const kpi of suggestedKpis) {
        await base44.entities.KPI.create({
          name: kpi.name,
          dataset_id: dataset.id,
          operation: 'sum',
          is_suggested: true,
        });
      }
      await base44.entities.AnalysisActivity.create({
        type: 'kpi_created',
        title: `Auto-created ${suggestedKpis.length} KPIs`,
        description: `HELIOS generated KPIs from ${dataset.name}`,
        dataset_id: dataset.id,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpis'] }),
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader 
        title="Indicadores (KPIs)" 
        subtitle="Define y monitorea tus métricas de negocio"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm hover:shadow-lg hover:shadow-amber-500/20 transition-all">
                <Plus className="w-4 h-4" /> Crear indicador
              </button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle>Crear indicador</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-slate-300 text-sm">Nombre del indicador</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Total de ventas" className="mt-1.5 bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Conjunto de datos</Label>
                  <Select value={form.dataset_id} onValueChange={(v) => setForm({ ...form, dataset_id: v, column: '', group_by: '' })}>
                    <SelectTrigger className="mt-1.5 bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Selecciona un dataset" /></SelectTrigger>
                    <SelectContent>
                      {datasets.map(ds => <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {selectedDataset && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-300 text-sm">Columna</Label>
                        <Select value={form.column} onValueChange={(v) => setForm({ ...form, column: v })}>
                          <SelectTrigger className="mt-1.5 bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            {(selectedDataset.columns || []).map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-300 text-sm">Operación</Label>
                        <Select value={form.operation} onValueChange={(v) => setForm({ ...form, operation: v })}>
                          <SelectTrigger className="mt-1.5 bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {operations.map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-300 text-sm">Agrupar por (opcional)</Label>
                      <Select value={form.group_by} onValueChange={(v) => setForm({ ...form, group_by: v })}>
                        <SelectTrigger className="mt-1.5 bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Ninguno</SelectItem>
                          {(selectedDataset.columns || []).map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <button
                  onClick={() => createKPI.mutate(form)}
                  disabled={!form.name || !form.dataset_id}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold py-2.5 rounded-xl text-sm hover:shadow-lg hover:shadow-amber-500/20 transition-all disabled:opacity-40"
                >
                  Crear indicador
                </button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Auto-create from suggestions */}
      {datasets.filter(d => d.suggested_kpis && d.suggested_kpis.length > 0).length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <div className="bg-slate-900/50 border border-amber-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5" /> HELIOS Suggestions
            </div>
            <p className="text-sm text-slate-300 mb-3">HELIOS detectó indicadores posibles en tus conjuntos de datos. ¿Crearlos automáticamente?</p>
            <div className="flex gap-2 flex-wrap">
              {datasets.filter(d => d.suggested_kpis && d.suggested_kpis.length > 0).map(ds => (
                <button
                  key={ds.id}
                  onClick={() => autoCreateKPIs.mutate(ds)}
                  className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors"
                >
                  Crear {ds.suggested_kpis.length} indicadores de {ds.name}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* KPI Grid */}
      {kpis.length === 0 ? (
        <div className="text-center py-20">
          <Target className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">Aún no hay indicadores definidos</p>
          <p className="text-xs text-slate-600">Crea indicadores manualmente o deja que HELIOS los sugiera a partir de tus datos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <motion.div key={kpi.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative group">
              <KPICard
                label={kpi.name}
                value={kpi.value != null ? kpi.value.toLocaleString() : '—'}
                trend={kpi.trend}
                icon={Target}
              />
              <button
                onClick={() => deleteKPI.mutate(kpi.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-rose-400 p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {kpi.is_suggested && (
                <div className="absolute top-3 left-3">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
