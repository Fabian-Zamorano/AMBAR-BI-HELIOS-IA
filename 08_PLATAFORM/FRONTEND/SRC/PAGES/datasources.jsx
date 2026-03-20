import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  FileSpreadsheet,
  Database,
  Server,
  Globe,
  CloudUpload,
  X,
  Loader2,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/shared/PageHeader";

const sourceTypes = [
  {
    type: "excel",
    label: "Excel",
    icon: FileSpreadsheet,
    description: "Upload .xlsx or .xls files",
    accept: ".xlsx,.xls",
  },
  {
    type: "csv",
    label: "CSV",
    icon: FileText,
    description: "Upload .csv files",
    accept: ".csv",
  },
  {
    type: "sql",
    label: "SQL Database",
    icon: Database,
    description: "Connect to a database",
    disabled: true,
  },
  {
    type: "erp",
    label: "ERP Export",
    icon: Server,
    description: "Import ERP data",
    disabled: true,
  },
  {
    type: "api",
    label: "API",
    icon: Globe,
    description: "Connect via API",
    disabled: true,
  },
];

export default function DataSources() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  const { data: datasets = [] } = useQuery({
    queryKey: ["datasets"],
    queryFn: () => base44.entities.Dataset.list("-created_date"),
  });

  const analyzeDataset = useMutation({
    mutationFn: async ({ file, sourceType }) => {
      setUploading(true);
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Create dataset record
      const dataset = await base44.entities.Dataset.create({
        name: file.name.replace(/\.[^/.]+$/, ""),
        source_type: sourceType,
        file_url,
        status: "processing",
      });

      // Log activity
      await base44.entities.AnalysisActivity.create({
        type: "upload",
        title: `Uploaded ${file.name}`,
        description: `${sourceType.toUpperCase()} file uploaded for analysis`,
        dataset_id: dataset.id,
      });

      // Extract data to analyze
      const extracted =
        await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              columns: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: {
                      type: "string",
                      description: "One of: number, string, date, boolean",
                    },
                    sample_values: { type: "array", items: { type: "string" } },
                    missing_count: { type: "number" },
                    unique_count: { type: "number" },
                  },
                },
              },
              row_count: { type: "number" },
              data_sample: { type: "array", items: { type: "object" } },
            },
          },
        });

      if (extracted.status === "success" && extracted.output) {
        const rawColumns = extracted.output.columns || [];
        const rowCount = extracted.output.row_count || 0;
        const rawData = (extracted.output.data_sample || []).slice(0, 50);

        if (rawColumns.length === 0 || rowCount === 0) {
          await base44.entities.Dataset.update(dataset.id, {
            status: "error",
            columns: [],
            row_count: 0,
          });
          return dataset;
        }

        // Detect common business column types
        const businessKeywords = {
          date: [
            "fecha",
            "date",
            "dia",
            "mes",
            "año",
            "periodo",
            "time",
            "created",
            "updated",
          ],
          amount: [
            "monto",
            "amount",
            "total",
            "precio",
            "price",
            "revenue",
            "ingreso",
            "costo",
            "cost",
            "venta",
            "sale",
            "pago",
            "payment",
          ],
          category: [
            "categoria",
            "category",
            "tipo",
            "type",
            "estado",
            "status",
            "grupo",
            "group",
            "segmento",
          ],
          employee: [
            "empleado",
            "employee",
            "vendedor",
            "agente",
            "usuario",
            "user",
            "responsable",
          ],
          project: [
            "proyecto",
            "project",
            "cliente",
            "client",
            "producto",
            "product",
          ],
        };

        const columns = rawColumns.map((col) => {
          const lower = col.name.toLowerCase();
          let businessType = null;
          for (const [bType, keywords] of Object.entries(businessKeywords)) {
            if (keywords.some((k) => lower.includes(k))) {
              businessType = bType;
              break;
            }
          }
          return { ...col, business_type: businessType };
        });

        await base44.entities.Dataset.update(dataset.id, {
          columns,
          row_count: rowCount,
          raw_data: rawData,
        });

        // Auto-run HELIOS analysis only if real data exists
        const columnInfo = columns
          .map((c) => `${c.name} (${c.type})`)
          .join(", ");
        const heliosResult = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this business dataset and suggest KPIs.

Dataset: "${file.name}"
Columns: ${columnInfo}
Row count: ${rowCount}
Sample data: ${JSON.stringify(rawData.slice(0, 5))}

Based on the ACTUAL column names and data types present, suggest 3-6 meaningful business KPIs. Only suggest KPIs that can realistically be computed from the available columns. For each KPI provide a name, a simple formula description, and a brief business explanation.`,
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
          analysis_summary: heliosResult.summary,
          suggested_kpis: heliosResult.suggested_kpis || [],
        });

        await base44.entities.AnalysisActivity.create({
          type: "analysis",
          title: `HELIOS analizó ${file.name}`,
          description: heliosResult.summary,
          dataset_id: dataset.id,
        });
      } else {
        await base44.entities.Dataset.update(dataset.id, {
          status: "error",
          columns: [],
          row_count: 0,
        });
      }

      return dataset;
    },
    onSuccess: (dataset) => {
      setUploading(false);
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      navigate(`/Datasets?id=${dataset.id}`);
    },
    onError: () => setUploading(false),
  });

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split(".").pop().toLowerCase();
      const sourceType = ["xlsx", "xls"].includes(ext) ? "excel" : "csv";
      analyzeDataset.mutate({ file, sourceType });
    }
  }, []);

  const handleFileSelect = (e, sourceType) => {
    const file = e.target.files[0];
    if (file) {
      analyzeDataset.mutate({ file, sourceType });
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Data Sources"
        subtitle="Upload and manage your business data"
      />

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
            dragOver
              ? "border-amber-500 bg-amber-500/5"
              : "border-slate-800 bg-slate-900/30 hover:border-slate-700"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-4" />
              <p className="text-white font-medium mb-1">
                Procesando tu archivo...
              </p>
              <p className="text-sm text-slate-400">
                HELIOS está detectando columnas, tipos de datos y sugiriendo
                KPIs automáticamente
              </p>
            </div>
          ) : (
            <>
              <CloudUpload
                className={`w-12 h-12 mx-auto mb-4 ${dragOver ? "text-amber-400" : "text-slate-600"}`}
              />
              <p className="text-white font-medium mb-1">
                Arrastra y suelta tu archivo aquí
              </p>
              <p className="text-sm text-slate-400 mb-4">
                o haz clic en un tipo de fuente para cargar
              </p>
              <p className="text-xs text-slate-600">
                Soporta archivos Excel (.xlsx, .xls) y CSV (.csv)
              </p>
            </>
          )}
        </div>
      </motion.div>

      {/* Source Types */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h3 className="text-sm font-semibold text-white mb-4">
          Tipos de fuente
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {sourceTypes.map((src) => (
            <label
              key={src.type}
              className={`relative bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 text-center transition-all duration-200 ${
                src.disabled
                  ? "opacity-40 cursor-not-allowed"
                  : "cursor-pointer hover:border-amber-500/30 hover:bg-slate-900/80"
              }`}
            >
              {!src.disabled && (
                <input
                  type="file"
                  accept={src.accept}
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, src.type)}
                />
              )}
              <src.icon className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-white">{src.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {src.disabled ? "Próximamente" : src.description}
              </p>
            </label>
          ))}
        </div>
      </motion.div>

      {/* Existing Datasets */}
      {datasets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-semibold text-white mb-4">
            Conjuntos de datos cargados
          </h3>
          <div className="space-y-2">
            {datasets.map((ds) => (
              <button
                key={ds.id}
                onClick={() => navigate(`/Datasets?id=${ds.id}`)}
                className="w-full bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 flex items-center gap-4 hover:border-slate-700/50 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {ds.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {ds.source_type} · {ds.row_count || 0} rows ·{" "}
                    {ds.columns?.length || 0} columns
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    ds.status === "ready"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : ds.status === "processing"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-rose-500/10 text-rose-400"
                  }`}
                >
                  {ds.status === "ready" && (
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                  )}
                  {ds.status === "ready"
                    ? "Listo"
                    : ds.status === "processing"
                      ? "Procesando"
                      : "Error en archivo"}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
