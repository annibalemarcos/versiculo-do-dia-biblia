import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditLogItem } from '../types';
import {
  FileText,
  Search,
  Filter,
  Shield,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Inspector modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const res = await api.get<{
      items: AuditLogItem[];
      pagination: { total: number; page: number; pages: number };
    }>('/admin/audit/logs', {
      page,
      limit: 20,
      action: actionFilter,
      entity_type: entityFilter,
    });

    if (res.success && res.data) {
      setLogs(res.data.items);
      setTotalPages(res.data.pagination.pages);
      setTotalCount(res.data.pagination.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Trilha de Auditoria Administrativa
          </h2>
          <p className="text-xs text-slate-400">
            Registro imutável de todas as ações executadas pela equipe administrativa
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <select
          aria-label="Filtrar por Ação Realizada"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
        >
          <option value="">Todas as Ações</option>
          <option value="LOGIN">LOGIN</option>
          <option value="CREATE">CREATE (Criação)</option>
          <option value="UPDATE">UPDATE (Edição)</option>
          <option value="DELETE">DELETE (Exclusão)</option>
        </select>

        <select
          aria-label="Filtrar por Tipo de Entidade"
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
        >
          <option value="">Todas as Entidades</option>
          <option value="verse">Versículos (verse)</option>
          <option value="daily_verse">Versículo do Dia (daily_verse)</option>
          <option value="theme">Temas (theme)</option>
          <option value="emotion">Emoções (emotion)</option>
          <option value="user">Usuários (user)</option>
          <option value="feature_flag">Feature Flags</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Administrador</th>
                <th className="px-5 py-3.5">Ação</th>
                <th className="px-5 py-3.5">Entidade / ID</th>
                <th className="px-5 py-3.5">IP de Origem</th>
                <th className="px-5 py-3.5">Data e Hora</th>
                <th className="px-5 py-3.5 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    Carregando logs de auditoria...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    Nenhum log de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white">{log.admin_name || 'Sistema'}</div>
                      <div className="text-[11px] text-slate-400">{log.admin_email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          log.action === 'CREATE'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : log.action === 'UPDATE'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : log.action === 'DELETE'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-mono text-slate-300">
                        {log.entity_type} {log.entity_id ? `(${log.entity_id.substring(0, 8)}...)` : ''}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Ver payload de alteração"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Página {page} de {totalPages} ({totalCount} registros)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Inspector */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Detalhes do Evento de Auditoria</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Administrador:</span>
                <span className="font-bold text-white">{selectedLog.admin_name}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Ação & Entidade:</span>
                <span className="font-mono text-brand-400">
                  {selectedLog.action} {selectedLog.entity_type}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Payload JSON de Alteração:</span>
                <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
