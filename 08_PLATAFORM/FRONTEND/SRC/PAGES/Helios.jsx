import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Send, Loader2, Database, BarChart3, Target, User } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export default function Helios() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q') || '';

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const hasInitialized = useRef(false);

  const { data: datasets = [] } = useQuery({
    queryKey: ['datasets-all'],
    queryFn: () => base44.entities.Dataset.list('-created_date'),
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ['kpis-all'],
    queryFn: () => base44.entities.KPI.list('-created_date'),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (initialQuery && !hasInitialized.current && datasets) {
      hasInitialized.current = true;
      handleSend(initialQuery);
    }
  }, [initialQuery, datasets]);

  const sendMessage = useMutation({
    mutationFn: async (userMessage) => {
      // Only include datasets with real processed data
      const readyDatasets = datasets.filter(ds => ds.status === 'ready' && ds.columns?.length > 0 && ds.row_count > 0);

      const datasetContext = readyDatasets.map(ds => 
        `Dataset "${ds.name}": ${(ds.columns || []).map(c => c.name).join(', ')} (${ds.row_count} filas)`
      ).join('\n');

      const kpiContext = kpis.map(k => `KPI "${k.name}": ${k.operation} of ${k.column}`).join('\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are HELIOS, the analytical engine of AMBAR BI.

Your role is NOT to chat. Your role is to transform user intent into business analysis.

Available datasets (only processed, ready datasets with real data):
${datasetContext || 'No hay conjuntos de datos procesados disponibles.'}

Defined KPIs:
${kpiContext || 'No KPIs defined yet.'}

User message: "${userMessage}"

You must:
1. Detect what the user wants to analyze
2. Identify relevant datasets from the list above
3. Suggest business KPIs
4. Suggest visualizations
5. Propose a dashboard structure

Always respond using this exact format (use markdown headers):

**INTENT:**
What the user wants to analyze

**DATA USED:**
Which datasets are relevant (or instruct to upload data if none available)

**KPIs:**
List of calculated indicators with formulas

**VISUALIZATIONS:**
What charts should be created and why

**DASHBOARD STRUCTURE:**
How the dashboard should be organized

CRITICAL RULES:
- If there are no ready datasets, respond ONLY: "El conjunto de datos no contiene información procesada. Primero debes cargar y procesar un archivo para poder analizarlo."
- If datasets exist but have 0 columns or 0 rows, respond ONLY: "No hay datos suficientes para generar indicadores."
- NEVER invent data, columns, KPIs, or business context that is not present in the actual datasets listed above.
- Only suggest KPIs that can realistically be computed from the actual columns listed.

Be concise and business-focused. No small talk.`,
      });

      await base44.entities.AnalysisActivity.create({
        type: 'helios_query',
        title: `Asked HELIOS: ${userMessage.slice(0, 50)}`,
        description: result.slice(0, 100),
      });

      return result;
    },
  });

  const handleSend = async (text) => {
    const userMessage = text || input;
    if (!userMessage.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');

    setMessages(prev => [...prev, { role: 'assistant', content: null, loading: true }]);

    const result = await sendMessage.mutateAsync(userMessage);

    setMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = { role: 'assistant', content: result, loading: false };
      return updated;
    });
  };

  const suggestions = [
    'Analizar ventas',
    'Analizar operación y eficiencia',
    'Revisar costos y gastos',
    '¿Qué KPIs debería monitorear?',
  ];

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800/50 px-6 py-4 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-slate-950" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">HELIOS</h1>
            <p className="text-xs text-slate-500">Motor de análisis de AMBAR BI</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center mb-6">
              <Sparkles className="w-7 h-7 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">¿Qué quieres analizar?</h2>
            <p className="text-sm text-slate-400 mb-8 max-w-md">Dime qué quieres analizar y construiré un plan de análisis con KPIs, visualizaciones y estructura de dashboard.</p>
            
            {/* Quick Context */}
            <div className="flex items-center gap-4 mb-6 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {datasets.length} datasets</span>
              <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {kpis.length} KPIs</span>
            </div>

            {/* Suggestions */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestions.map((s) => (
                <button key={s} onClick={() => handleSend(s)} className="px-4 py-2 bg-slate-900/50 border border-slate-800/50 rounded-xl text-sm text-slate-300 hover:border-amber-500/30 hover:text-white transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-900/50 border border-slate-800/50'} rounded-2xl px-4 py-3`}>
                  {msg.loading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analizando...</span>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-200 prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                )}
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-800/50 px-6 py-4 bg-slate-950">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ej: Analizar ventas del último trimestre, revisar eficiencia operativa..."
            className="flex-1 bg-slate-900/50 border border-slate-800/50 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sendMessage.isPending}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 p-3 rounded-xl hover:shadow-lg hover:shadow-amber-500/20 transition-all disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
