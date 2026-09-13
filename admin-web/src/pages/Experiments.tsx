import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ExperimentItem } from '../types';
import {
  FlaskConical,
  Plus,
  Play,
  Pause,
  CheckCircle2,
  TrendingUp,
  Award,
  Layers,
} from 'lucide-react';

export const Experiments: React.FC = () => {
  const { currentAppId, hasPermission } = useAuth();
  const [experiments, setExperiments] = useState<ExperimentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExperiments = async () => {
    setLoading(true);
    const res = await api.get<ExperimentItem[]>('/admin/experiments', { app_id: currentAppId });
    if (res.success && res.data) {
      setExperiments(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExperiments();
  }, [currentAppId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Testes A/B & Otimização de Paywall
          </h2>
          <p className="text-xs text-slate-400">
            Comparação de taxas de conversão de diferentes layouts e ofertas no app mobile
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/80 rounded-2xl border border-slate-800">
            Carregando experimentos...
          </div>
        ) : experiments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/80 rounded-2xl border border-slate-800">
            Nenhum experimento cadastrado no momento.
          </div>
        ) : (
          experiments.map((exp) => (
            <div
              key={exp.id}
              className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{exp.name}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {exp.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{exp.description}</p>
                </div>
                <div className="text-xs text-slate-400 font-mono">Chave: {exp.key}</div>
              </div>

              {/* Variants Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {exp.variants?.map((v) => {
                  const isWinner = v.conversion_rate && v.conversion_rate > 3.0;
                  return (
                    <div
                      key={v.name}
                      className={`p-4 rounded-xl border relative ${
                        isWinner
                          ? 'bg-brand-950/40 border-brand-500/50 shadow-md shadow-brand-500/10'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      {isWinner && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-brand-400">
                          <Award className="w-3.5 h-3.5" />
                          <span>Vencedor</span>
                        </div>
                      )}
                      <div className="text-xs font-bold text-white">{v.name}</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Tráfego: {v.traffic_split}%
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Conversão:</span>
                        <span className="text-sm font-extrabold text-white">
                          {v.conversion_rate}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
