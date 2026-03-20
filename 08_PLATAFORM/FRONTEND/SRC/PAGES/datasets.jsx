import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  Columns,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Loader2,
  ArrowRight,
  Target,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/shared/PageHeader";
import HeliosButton from "@/components/shared/HeliosButton";

export default function Datasets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDatasetId, setSelectedDatasetId] = useState(null);
  const [analysisTab, setAnalysisTab] = useState(null);

  const { data: datasets = [] } = useQuery({
    queryKey: ["datasets"],
    queryFn: () => base44.entities.Dataset.list("-created_date"),
  });

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  const analyzeDataset = useMutation({
    mutationFn: async (dataset) => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this dataset structure and suggest KPIs:
Dataset: ${dataset.name}
Row count: ${dataset.row_count}
Columns: ${(dataset.columns || []).map((c) => `${c.name} (${c.type})`).join(", ")}

Suggest 3-5 business KPIs based on this data.`,
      });

      await base44.entities.AnalysisActivity.create({
        type: "dataset_analysis",
        title: `Analyzed: ${dataset.name}`,
        description: result.slice(0, 100),
        dataset_id: dataset.id,
      });

      return result;
    },
  });

  const deleteDataset = useMutation({
    mutationFn: (id) => base44.entities.Dataset.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      setSelectedDatasetId(null);
    },
  });

  const getColumnTypeColor = (type) => {
    const colors = {
      number: "text-blue-400 bg-blue-500/10",
      string: "text-purple-400 bg-purple-500/10",
      date: "text-green-400 bg-green-500/10",
      boolean: "text-orange-400 bg-orange-500/10",
    };
    return colors[type] || "text-slate-400 bg-slate-500/10";
  };

  const getStatusBadge = (status) => {
    const badges = {
      ready: { icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10" },
      processing: { icon: Loader2, color: "text-amber-400 bg-amber-500/10" },
      error: { icon: AlertTriangle, color: "text-rose-400 bg-rose-500/10" },
    };
    const badge = badges[status] || badges.processing;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg ${badge.color}`}>
        <Icon className={`w-3 h-3 ${status === "processing" ? "animate-spin" : ""}`} />
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Conjuntos de Datos"
        subtitle="Explora, analiza y gestiona tus datos"
        icon={FileSpreadsheet}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dataset List */}
        <div className="lg:col-span-1">
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {datasets.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No hay conjuntos de datos</div>
            ) : (
              datasets.map((dataset) => (
                <motion.button
                  key={dataset.id}
                  onClick={() => setSelectedDatasetId(dataset.id)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedDatasetId === dataset.id
                      ? "bg-amber-500/10 border border-amber-500/30"
                      : "bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-white truncate">{dataset.name}</div>
                      <div className="text-xs text-slate-400">{dataset.row_count} filas</div>
                    </div>
                    {getStatusBadge(dataset.status)}
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>

        {/* Dataset Details */}
        <div className="lg:col-span-2">
          {selectedDataset ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedDataset.name}</h2>
                  <p className="text-sm text-slate-400">{selectedDataset.row_count} filas · {(selectedDataset.columns || []).length} columnas</p>
                </div>
                <button onClick={() => deleteDataset.mutate(selectedDataset.id)} className="text-slate-500 hover:text-rose-400 transition-colors p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Analysis Tabs */}
              <div className="flex gap-2">
                {[
                  { id: "columns", label: "Columnas" },
                  { id: "preview", label: "Vista previa" },
                  { id: "helios", label: "HELIOS Insights" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAnalysisTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      analysisTab === tab.id
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-slate-900/50 text-slate-400 border border-slate-800/50 hover:border-slate-700/50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Columns Tab */}
              {analysisTab === "columns" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  {(selectedDataset.columns || []).map((col, idx) => (
                    <div key={idx} className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-white">{col.name}</div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-lg ${getColumnTypeColor(col.type)}`}>
                          {col.type}
                        </span>
                      </div>
                      {col.missing_count > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-400">
                          <AlertTriangle className="w-3 h-3" />
                          {col.missing_count} valores faltantes
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Preview Tab */}
              {analysisTab === "preview" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-x-auto">
                  <table className="w-full text-sm text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {(selectedDataset.columns || []).slice(0, 5).map((col, idx) => (
                          <th key={idx} className="text-left py-2 px-3 font-semibold text-white">
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedDataset.sample_data || []).slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-800/50">
                          {(selectedDataset.columns || []).slice(0, 5).map((col, colIdx) => (
                            <td key={colIdx} className="py-2 px-3">
                              {row[col.name]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}

              {/* HELIOS Insights Tab */}
              {analysisTab === "helios" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {analyzeDataset.isPending ? (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analizando datos...</span>
                    </div>
                  ) : analyzeDataset.data ? (
                    <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 text-sm text-slate-200 prose prose-sm prose-invert max-w-none">
                      {analyzeDataset.data}
                    </div>
                  ) : (
                    <button
                      onClick={() => analyzeDataset.mutate(selectedDataset)}
                      className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-amber-500/20 transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      Analizar con HELIOS
                    </button>
                  )}
                </motion.div>
              )}

              {/* Suggested KPIs */}
              {selectedDataset.suggested_kpis && selectedDataset.suggested_kpis.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-amber-400" />
                    <h3 className="font-semibold text-amber-400">KPIs Sugeridos por HELIOS</h3>
                  </div>
                  <div className="space-y-2">
                    {selectedDataset.suggested_kpis.map((kpi, idx) => (
                      <div key={idx} className="text-sm text-slate-300">{kpi}</div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate("/KPIs")}
                    className="mt-3 inline-flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Ir a KPIs
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-96 text-center">
              <div className="text-slate-400 text-sm">Selecciona un conjunto de datos para verlo</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
