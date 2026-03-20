import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Database,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/shared/PageHeader";

export default function DataSources() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sourceType, setSourceType] = useState("Excel");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = React.useRef(null);

  const { data: Sources = [] } = useQuery({
    queryKey: ["dataSources"],
    queryFn: () => base44.entities.Dataset.list("-created_date"),
  });

  const uploadFile = useMutation({
    mutationFn: async (file) => {
      // Determine file type based on extension
      let sourceType = "Excel";
      if (file.name.endsWith(".csv")) sourceType = "CSV";
      else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) sourceType = "Excel";

      const formData = new FormData();
      formData.append("file", file);

      const uploadedFile = await base44.core.ExtractDataFromUploadedFile({
        source_type: sourceType,
        data: formData,
      });

      // Run HELIOS analysis on the uploaded data
      if (uploadedFile.columns && uploadedFile.columns.length > 0) {
        const columnInfo = uploadedFile.columns.map((c) => `${c.name} (${c.type})`).join(", ");
        const sampleData = uploadedFile.sample_data ? JSON.stringify(uploadedFile.sample_data.slice(0, 3)) : "";

        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt: `Based on this data structure, suggest business KPIs and a dashboard approach:
Dataset: ${file.name.replace(/\.[^/.]+$/, "")}
Columns: ${columnInfo}
Sample rows: ${sampleData}

Return a brief analysis.`,
        });

        uploadedFile.suggested_kpis = analysis
          .split("\n")
          .filter((line) => line.trim())
          .slice(0, 5);
      }

      // Create dataset entity
      const dataset = await base44.entities.Dataset.create({
        name: file.name.replace(/\.[^/.]+$/, ""),
        source_type: sourceType,
        columns: uploadedFile.columns || [],
        row_count: uploadedFile.row_count || 0,
        sample_data: uploadedFile.sample_data || [],
        suggested_kpis: uploadedFile.suggested_kpis || [],
        status: "ready",
      });

      // Log activity
      await base44.entities.AnalysisActivity.create({
        type: "upload",
        title: `Uploaded: ${file.name}`,
        description: `${sourceType} file with ${(uploadedFile.columns || []).length} columns and ${uploadedFile.row_count || 0} rows`,
      });

      return dataset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dataSources"] });
    },
  });

  const deleteSource = useMutation({
    mutationFn: (id) => base44.entities.Dataset.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dataSources"] });
    },
  });

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      uploadFile.mutate(files[0]);
    }
  };

  const handleChange = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      uploadFile.mutate(files[0]);
    }
  };

  const sourceTypeOptions = [
    { value: "Excel", label: "Excel", icon: FileSpreadsheet, enabled: true },
    { value: "CSV", label: "CSV", icon: FileText, enabled: true },
    { value: "SQL", label: "SQL", icon: Database, enabled: false },
    { value: "API", label: "API", icon: Plus, enabled: false },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Origen de Datos"
        subtitle="Carga y gestiona archivos de datos"
        icon={Upload}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <div className="lg:col-span-1">
          <div className="space-y-4">
            {/* Source Type Selection */}
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">Tipo de origen</label>
              <div className="grid grid-cols-2 gap-2">
                {sourceTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSourceType(option.value)}
                    disabled={!option.enabled}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                      sourceType === option.value
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : option.enabled
                        ? "bg-slate-900/50 border-slate-800/50 text-slate-400 hover:border-slate-700"
                        : "bg-slate-900/30 border-slate-800/30 text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    <option.icon className="w-4 h-4 mx-auto mb-1" />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drag & Drop */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                dragActive
                  ? "border-amber-500/50 bg-amber-500/5"
                  : "border-slate-800 bg-slate-900/30 hover:border-amber-500/30"
              }`}
            >
              <input ref={fileInputRef} type="file" onChange={handleChange} className="hidden" />
              <Upload className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300 mb-1">Arrastra un archivo aquí</p>
              <p className="text-xs text-slate-500 mb-3">o</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors"
              >
                Seleccionar archivo
              </button>
              <p className="text-xs text-slate-600 mt-3">{sourceType} • Máx 100MB</p>
            </div>

            {uploadFile.isPending && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center gap-2 text-sm text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando archivo...
              </div>
            )}
          </div>
        </div>

        {/* Sources List */}
        <div className="lg:col-span-2">
          <div className="space-y-3">
            {Sources.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400">No hay fuentes de datos cargadas</p>
                <p className="text-xs text-slate-600">Carga tu primer archivo para comenzar</p>
              </div>
            ) : (
              Sources.map((source) => (
                <motion.div
                  key={source.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 hover:border-amber-500/30 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center flex-shrink-0">
                        {source.source_type === "Excel" && <FileSpreadsheet className="w-5 h-5 text-blue-400" />}
                        {source.source_type === "CSV" && <FileText className="w-5 h-5 text-green-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{source.name}</h3>
                        <p className="text-xs text-slate-400">
                          {source.row_count} filas · {(source.columns || []).length} columnas
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {source.status === "ready" && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                              <CheckCircle2 className="w-3 h-3" />
                              Listo
                            </span>
                          )}
                          {source.status === "processing" && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Procesando
                            </span>
                          )}
                          {source.suggested_kpis && source.suggested_kpis.length > 0 && (
                            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                              {source.suggested_kpis.length} KPIs sugeridos
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSource.mutate(source.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-rose-400 p-1.5 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
