import React, { useState, useEffect } from "react";
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
  const urlParams = new URLSearchParams(window.location.search);
  const datasetId = urlParams.get("id");

  const { data: datasets = [] } = useQuery({
    queryKey: ["datasets"],
    queryFn: () => base44.entities.Dataset.list("-created_date"),
  });

  const [selectedId, setSelectedId] = useState(datasetId || null);

  useEffect(() => {
    if (datasetId) setSelectedId(datasetId);
    else if (datasets.length > 0 && !selectedId) setSelectedId(datasets[0].id);
  }, [datasetId, datasets]);

  const selected = datasets.find((d) => d.id === selectedId);

  const hasRealData =
    selected && selected.columns?.length > 0 && selected.row_count > 0;

  const deleteDataset = useMutation({
    mutationFn: (id) => base44.entities.Dataset.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      setSelectedId(null);
    },
  });

  const analyzeWithHelios = useMutation({
    mutationFn: async (dataset) => {
      if (!hasRealData)
        throw new Error("No hay datos procesados en este conjunto de datos.");

      await base44.entities.Dataset.update(dataset.id, {
        status: "processing",
      });

      const columnInfo = (dataset.columns || [])
        .map((c) => `${c.name} (${c.type})`)
        .join(", ");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this business dataset and suggest KPIs.

Dataset: "${dataset.name}"
Columns: ${columnInfo}
Row count: ${dataset.row_count}
Sample data: ${JSON.stringify((dataset.raw_data || []).slice(0, 5))}

Based on the ACTUAL column names and data types, suggest 3-5 business KPIs that can realistically be computed from the available columns. For each KPI, provide a name, a simple formula description, and a brief business explanation.`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            suggested_kpis: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  formula: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
      });

      await base44.entities.Dataset.update(dataset.id, {
        status: "ready",
        analysis_summary: result.summary,
        suggested_kpis: result.suggested_kpis || [],
      });

      await base44.entities.AnalysisActivity.create({
        type: "analysis",
        title: `HELIOS analizó ${dataset.name}`,
        description: result.summary,
        dataset_id: dataset.id,
      });

      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["datasets"] }),
  });

  const typeColors = {
    number: "text-emerald-400 bg-emerald-500/10",
    string: "text-blue-400 bg-blue-500/10",
    date: "text-purple-400 bg-purple-500/10",
    boolean: "text-orange-400 bg-orange-500/10",
  };

  const statusLabel = {
    ready: { text: "Listo", cls: "bg-emerald-500/10 text-emerald-400" },
    processing: { text: "Procesando", cls: "bg-amber-500/10 text-amber-400" },
    error: { text: "Error en archivo", cls: "bg-rose-500/10 text-rose-400" },
  };

  if (datasets.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <PageHeader
          title="Analizador de Datos"
          subtitle="Explora columnas, tipos de datos y métricas sugeridas"
        />
        <div className="text-center py-20">
          <FileSpreadsheet className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">
            Aún no hay conjuntos de datos. Carga un archivo para comenzar.
          </p>
          <button
            onClick={() => navigate("/DataSources")}
            className="text-amber-400 hover:text-amber-300 text-sm font-medium inline-flex items-center gap-1"
          >
            Ir a Fuentes de Datos <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Analizador de Datos"
        subtitle="Explora columnas, tipos de datos y métricas sugeridas por HELIOS"
        actions={
          selected &&
          hasRealData && (
            <HeliosButton
              onClick={() => analyzeWithHelios.mutate(selected)}
              label={
                analyzeWithHelios.isPending
                  ? "Analizando..."
                  : "Analizar con HELIOS"
              }
            />
          )
        }
      />

      {/* Dataset Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {datasets.map((ds) => (
          <button
            key={ds.id}
            onClick={() => setSelectedId(ds.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              selectedId === ds.id
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                : "bg-slate-900/50 text-slate-400 border border-slate-800/50 hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            {ds.name}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusLabel[ds.status]?.cls || "bg-slate-500/10 text-slate-400"}`}
            >
              {statusLabel[ds.status]?.text || ds.status}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column Analysis */}
          <div className="lg:col-span-2">
            {/* Error state */}
            {selected.status === "error" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 mb-4 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-400 mb-1">
                    Error al procesar el archivo
                  </p>
                  <p className="text-xs text-slate-400">
                    No se pudo procesar el archivo. Verifica el formato e
                    intenta cargar el archivo nuevamente.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Empty data warning */}
            {!hasRealData &&
              selected.status !== "error" &&
              selected.status !== "processing" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 mb-4 flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-300">
                    Este conjunto de datos no contiene información procesada.
                  </p>
                </motion.div>
              )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Columns className="w-4 h-4 text-slate-400" />
                  Columnas detectadas ({selected.columns?.length || 0})
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    {selected.row_count || 0} filas
                  </span>
                  <button
                    onClick={() => {
                      if (window.confirm("¿Eliminar este conjunto de datos?"))
                        deleteDataset.mutate(selected.id);
                    }}
                    className="text-slate-600 hover:text-rose-400 transition-colors p-1"
                    title="Eliminar dataset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {selected.columns && selected.columns.length > 0 ? (
                <div className="space-y-2">
                  {selected.columns.map((col, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">
                          {col.name}
                        </p>
                        {col.sample_values && col.sample_values.length > 0 && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            Muestra: {col.sample_values.slice(0, 3).join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {col.business_type && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400">
                            {col.business_type}
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeColors[col.type] || "text-slate-400 bg-slate-500/10"}`}
                        >
                          {col.type || "desconocido"}
                        </span>
                        {col.missing_count > 0 && (
                          <span className="text-[10px] text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />{" "}
                            {col.missing_count}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">
                  {selected.status === "processing"
                    ? "Procesando columnas..."
                    : "No se detectaron columnas"}
                </p>
              )}
            </motion.div>

            {/* Data Preview */}
            {selected.raw_data && selected.raw_data.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mt-6 bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5 overflow-x-auto"
              >
                <h3 className="text-sm font-semibold text-white mb-4">
                  Vista previa de datos
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {Object.keys(selected.raw_data[0]).map((key) => (
                        <th
                          key={key}
                          className="text-left text-slate-400 font-medium pb-2 pr-4 whitespace-nowrap"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.raw_data.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-slate-800/50">
                        {Object.values(row).map((val, j) => (
                          <td
                            key={j}
                            className="text-slate-300 py-2 pr-4 whitespace-nowrap"
                          >
                            {String(val ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}
          </div>

          {/* HELIOS Insights Sidebar */}
          <div>
            {selected.analysis_summary && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-900/50 border border-amber-500/20 rounded-2xl p-5 mb-6"
              >
                <div className="flex items-center gap-2 text-amber-400 text-xs font-medium mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  Análisis HELIOS
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {selected.analysis_summary}
                </p>
              </motion.div>
            )}

            {selected.suggested_kpis && selected.suggested_kpis.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-400" />
                    Indicadores sugeridos
                  </h3>
                </div>
                <div className="space-y-3">
                  {selected.suggested_kpis.map((kpi, i) => (
                    <div key={i} className="bg-slate-800/30 rounded-xl p-3">
                      <p className="text-sm font-medium text-white mb-1">
                        {kpi.name}
                      </p>
                      <p className="text-xs text-amber-400/70 mb-1 font-mono">
                        {kpi.formula}
                      </p>
                      <p className="text-xs text-slate-500">
                        {kpi.description}
                      </p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate(`/KPIs?dataset=${selected.id}`)}
                  className="w-full mt-4 text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center justify-center gap-1 py-2"
                >
                  Crear estos indicadores <ArrowRight className="w-3 h-3" />
                </button>
              </motion.div>
            )}

            {!selected.analysis_summary && hasRealData && (
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5 text-center">
                <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400 mb-4">
                  Ejecuta HELIOS para detectar KPIs y analizar este conjunto de
                  datos
                </p>
                <HeliosButton
                  onClick={() => analyzeWithHelios.mutate(selected)}
                  label={
                    analyzeWithHelios.isPending
                      ? "Analizando..."
                      : "Ejecutar análisis"
                  }
                />
              </div>
            )}

            {!hasRealData && selected.status !== "processing" && (
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5 text-center">
                <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  No hay datos suficientes para generar indicadores.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
