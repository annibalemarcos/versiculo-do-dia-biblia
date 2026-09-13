import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DevotionalItem, DevotionalDayItem } from '../types';
import {
  HeartHandshake,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  BookOpen,
} from 'lucide-react';

export const Devotionals: React.FC = () => {
  const { currentAppId, hasPermission } = useAuth();

  const [devotionals, setDevotionals] = useState<DevotionalItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DevotionalItem | null>(null);
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTotalDays, setFormTotalDays] = useState(7);
  const [formIsPremium, setFormIsPremium] = useState(false);
  const [formStatus, setFormStatus] = useState('published');
  const [formDays, setFormDays] = useState<DevotionalDayItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const fetchDevotionals = async () => {
    setLoading(true);
    const res = await api.get<DevotionalItem[]>('/admin/devotionals', { app_id: currentAppId });
    if (res.success && res.data) {
      setDevotionals(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDevotionals();
  }, [currentAppId]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormId('novo_plano_' + Date.now());
    setFormTitle('');
    setFormSlug('');
    setFormDescription('');
    setFormTotalDays(7);
    setFormIsPremium(false);
    setFormStatus('published');
    setFormDays([
      {
        day_number: 1,
        title: 'Dia 1: Primeiro Passo de Fé',
        verse_reference: 'Filipenses 4:6-7',
        verse_text: 'Não andem ansiosos por coisa alguma...',
        reflection: 'Reflexão profunda do dia...',
        prayer: 'Senhor, fortalece a minha fé hoje...',
        reading_passage: 'Filipenses 4',
      },
    ]);
    setModalOpen(true);
  };

  const handleOpenEdit = async (dev: DevotionalItem) => {
    const res = await api.get<DevotionalItem>(`/admin/devotionals/${dev.id}`);
    if (res.success && res.data) {
      const full = res.data;
      setEditingPlan(full);
      setFormId(full.id);
      setFormTitle(full.title);
      setFormSlug(full.slug);
      setFormDescription(full.description);
      setFormTotalDays(full.total_days);
      setFormIsPremium(full.is_premium);
      setFormStatus(full.status);
      setFormDays(full.days || []);
      setModalOpen(true);
    }
  };

  const handleAddDay = () => {
    const nextDay = formDays.length + 1;
    setFormDays([
      ...formDays,
      {
        day_number: nextDay,
        title: `Dia ${nextDay}: Título do Dia`,
        verse_reference: 'Salmos 23:1',
        verse_text: 'O Senhor é o meu pastor...',
        reflection: 'Reflexão diária...',
        prayer: 'Oração do dia...',
        reading_passage: 'Salmos 23',
      },
    ]);
  };

  const handleRemoveDay = (index: number) => {
    const updated = formDays.filter((_, idx) => idx !== index);
    setFormDays(updated.map((d, i) => ({ ...d, day_number: i + 1 })));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      id: formId,
      app_id: currentAppId,
      title: formTitle,
      slug: formSlug || formTitle.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      description: formDescription,
      total_days: formDays.length,
      is_premium: formIsPremium,
      language: 'pt-BR',
      days: formDays,
    };

    let res;
    if (editingPlan) {
      res = await api.put(`/admin/devotionals/${editingPlan.id}`, payload);
    } else {
      res = await api.post('/admin/devotionals', payload);
    }

    setSaving(false);
    if (res.success) {
      setModalOpen(false);
      setToastMessage('Plano devocional salvo com sucesso!');
      setTimeout(() => setToastMessage(null), 3000);
      fetchDevotionals();
    } else {
      alert(res.error?.message || 'Erro ao salvar plano devocional');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Tem certeza que deseja remover o plano devocional "${title}"?`)) return;
    const res = await api.delete(`/admin/devotionals/${id}`);
    if (res.success) {
      setToastMessage('Plano devocional excluído com sucesso.');
      setTimeout(() => setToastMessage(null), 3000);
      fetchDevotionals();
    } else {
      alert(res.error?.message || 'Erro ao excluir');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-emerald-950 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Planos Devocionais & Jornadas
          </h2>
          <p className="text-xs text-slate-400">
            Jornadas de leitura guiada com múltiplos dias de reflexão e oração
          </p>
        </div>

        {hasPermission('content.write') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-brand-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Novo Plano Devocional</span>
          </button>
        )}
      </div>

      {/* Devotionals List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-slate-900/80 p-8 text-center text-xs text-slate-500 rounded-2xl border border-slate-800">
            Carregando planos devocionais...
          </div>
        ) : devotionals.length === 0 ? (
          <div className="bg-slate-900/80 p-8 text-center text-xs text-slate-500 rounded-2xl border border-slate-800">
            Nenhum plano devocional cadastrado.
          </div>
        ) : (
          devotionals.map((dev) => {
            const isExpanded = expandedPlanId === dev.id;
            return (
              <div
                key={dev.id}
                className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-950 border border-brand-800/60 text-brand-400 flex items-center justify-center shrink-0 mt-0.5">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {dev.title}
                        </h3>
                        {dev.is_premium ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800/50">
                            <Lock className="w-3 h-3" />
                            Premium
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                            <Unlock className="w-3 h-3" />
                            Gratuito
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                        {dev.description}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2 font-medium">
                        <span>🗓️ {dev.total_days} Dias de Duração</span>
                        <span>•</span>
                        <span>Cadastrado em {new Date(dev.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {hasPermission('content.write') && (
                      <button
                        onClick={() => handleOpenEdit(dev)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                        title="Editar plano e dias"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {hasPermission('content.delete') && (
                      <button
                        onClick={() => handleDelete(dev.id, dev.title)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
                        title="Excluir plano"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Plan Modal with Multi-day builder */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingPlan ? 'Editar Plano Devocional' : 'Novo Plano Devocional'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Título do Plano
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => {
                      setFormTitle(e.target.value);
                      if (!editingPlan) {
                        setFormSlug(
                          e.target.value
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/[^a-z0-9]/g, '-')
                        );
                      }
                    }}
                    placeholder="Ex: 21 Dias de Fé Inabalável"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Descrição Geral do Plano
                </label>
                <textarea
                  rows={2}
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Resumo explicativo sobre a jornada..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center gap-4 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPremium}
                    onChange={(e) => setFormIsPremium(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-500 bg-slate-900 border-slate-700"
                  />
                  <span>Bloquear como Exclusivo para Assinantes Premium</span>
                </label>
              </div>

              {/* Days List Builder */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Cronograma dos Dias ({formDays.length} dias cadastrados)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddDay}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300 bg-brand-950/60 px-3 py-1.5 rounded-lg border border-brand-800/50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Dia</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formDays.map((day, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-brand-400">
                          Dia {day.day_number}
                        </span>
                        {formDays.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDay(idx)}
                            className="text-[11px] text-red-400 hover:text-red-300"
                          >
                            Remover Dia
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Título do dia (Ex: Oração no Deserto)"
                          value={day.title}
                          onChange={(e) => {
                            const updated = [...formDays];
                            updated[idx].title = e.target.value;
                            setFormDays(updated);
                          }}
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Referência Bíblica (Ex: Salmos 23:1)"
                          value={day.verse_reference}
                          onChange={(e) => {
                            const updated = [...formDays];
                            updated[idx].verse_reference = e.target.value;
                            setFormDays(updated);
                          }}
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                      </div>

                      <textarea
                        rows={2}
                        placeholder="Reflexão devocional para este dia..."
                        value={day.reflection}
                        onChange={(e) => {
                          const updated = [...formDays];
                          updated[idx].reflection = e.target.value;
                          setFormDays(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />

                      <input
                        type="text"
                        placeholder="Oração sugerida para o dia..."
                        value={day.prayer || ''}
                        onChange={(e) => {
                          const updated = [...formDays];
                          updated[idx].prayer = e.target.value;
                          setFormDays(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-brand-500/20 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Plano Completo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
