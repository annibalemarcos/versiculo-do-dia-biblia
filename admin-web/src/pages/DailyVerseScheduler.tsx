import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DailyVerseItem, VerseItem, ThemeItem } from '../types';
import {
  Calendar as CalendarIcon,
  Plus,
  Edit2,
  Sparkles,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  X,
  Clock
} from 'lucide-react';

export const DailyVerseScheduler: React.FC = () => {
  const { currentAppId, hasPermission } = useAuth();

  const [dailyVerses, setDailyVerses] = useState<DailyVerseItem[]>([]);
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [versesCatalog, setVersesCatalog] = useState<VerseItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Month navigation
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formVerseId, setFormVerseId] = useState('');
  const [formReflectionTitle, setFormReflectionTitle] = useState('');
  const [formReflectionText, setFormReflectionText] = useState('');
  const [formPrayerText, setFormPrayerText] = useState('');
  const [formThemeId, setFormThemeId] = useState('');
  const [formStatus, setFormStatus] = useState<'scheduled' | 'published' | 'archived'>('scheduled');
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Preview Drawer
  const [previewItem, setPreviewItem] = useState<DailyVerseItem | null>(null);

  const fetchDailyVerses = async () => {
    setLoading(true);
    const startStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const endStr = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0)
      .toISOString()
      .split('T')[0];

    const [dvRes, tRes, vRes] = await Promise.all([
      api.get<DailyVerseItem[]>('/admin/daily-verses', {
        start_date: startStr,
        end_date: endStr,
        app_id: currentAppId,
      }),
      api.get<ThemeItem[]>('/admin/themes', { app_id: currentAppId }),
      api.get<{ items: VerseItem[] }>('/admin/verses', { limit: 50, app_id: currentAppId }),
    ]);

    if (dvRes.success && dvRes.data) setDailyVerses(dvRes.data);
    if (tRes.success && tRes.data) setThemes(tRes.data);
    if (vRes.success && vRes.data) setVersesCatalog(vRes.data.items || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDailyVerses();
  }, [currentDate, currentAppId]);

  const handleOpenSchedule = (dateStr?: string) => {
    setEditingId(null);
    setFormDate(dateStr || new Date().toISOString().split('T')[0]);
    const firstVerse = versesCatalog[0];
    setFormVerseId(firstVerse ? firstVerse.id : '');
    setFormReflectionTitle('Paz e Confiança no Senhor');
    setFormReflectionText('Que a palavra de hoje traga tranquilidade e renove suas forças para a jornada.');
    setFormPrayerText('Senhor Deus, guia os meus passos e protege a minha família neste dia. Em nome de Jesus, amém.');
    setFormThemeId('paz');
    setFormStatus('scheduled');
    setModalOpen(true);
  };

  const handleOpenEdit = (dv: DailyVerseItem) => {
    setEditingId(dv.id);
    setFormDate(dv.target_date);
    setFormVerseId(dv.verse_id);
    setFormReflectionTitle(dv.reflection_title || '');
    setFormReflectionText(dv.reflection_text || '');
    setFormPrayerText(dv.prayer_text || '');
    setFormThemeId(dv.theme_id || '');
    setFormStatus(dv.status);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      app_id: currentAppId,
      target_date: formDate,
      verse_id: formVerseId,
      reflection_title: formReflectionTitle,
      reflection_text: formReflectionText,
      prayer_text: formPrayerText,
      theme_id: formThemeId || null,
      status: formStatus,
    };

    let res;
    if (editingId) {
      res = await api.put(`/admin/daily-verses/${editingId}`, payload);
    } else {
      res = await api.post('/admin/daily-verses', payload);
    }

    setSaving(false);
    if (res.success) {
      setModalOpen(false);
      setToastMessage('Agendamento de versículo salvo com sucesso!');
      setTimeout(() => setToastMessage(null), 3000);
      fetchDailyVerses();
    } else {
      alert(res.error?.message || 'Erro ao salvar agendamento');
    }
  };

  const selectedVerseObj = versesCatalog.find((v) => v.id === formVerseId);

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
            Agendador de Versículo do Dia
          </h2>
          <p className="text-xs text-slate-400">
            Planejamento editorial de versículos, reflexões e orações diárias
          </p>
        </div>

        {hasPermission('content.write') && (
          <button
            onClick={() => handleOpenSchedule()}
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-brand-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar Nova Data</span>
          </button>
        )}
      </div>

      {/* Daily Verses List / Calendar Cards */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-brand-400" />
            <span>Próximas Datas Agendadas ({dailyVerses.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Carregando cronograma editorial...
          </div>
        ) : dailyVerses.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Nenhuma data agendada para o período. Clique em "Agendar Nova Data" acima.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dailyVerses.map((dv) => {
              const isToday = dv.target_date === new Date().toISOString().split('T')[0];
              return (
                <div
                  key={dv.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isToday
                      ? 'bg-brand-950/40 border-brand-500/60 shadow-lg shadow-brand-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                          isToday
                            ? 'bg-brand-500 text-slate-950 font-extrabold'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {dv.target_date} {isToday && '• HOJE'}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          dv.status === 'published'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                        }`}
                      >
                        {dv.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mt-2">
                      {dv.reference}
                    </h4>
                    <p className="text-xs text-slate-300 italic mt-1 line-clamp-2">
                      "{dv.verse_text}"
                    </p>

                    {dv.reflection_title && (
                      <div className="mt-3 pt-3 border-t border-slate-800/60 text-xs text-slate-400">
                        <span className="font-semibold text-slate-300 block truncate">
                          💡 {dv.reflection_title}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                    <button
                      onClick={() => setPreviewItem(dv)}
                      className="text-xs text-brand-400 hover:text-brand-300 font-medium inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Pré-visualizar</span>
                    </button>

                    {hasPermission('content.write') && (
                      <button
                        onClick={() => handleOpenEdit(dv)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar agendamento"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingId ? 'Editar Versículo do Dia' : 'Agendar Versículo do Dia'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Data do Versículo
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="scheduled">Agendado</option>
                    <option value="published">Publicado</option>
                    <option value="archived">Arquivado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Selecione o Versículo do Catálogo
                </label>
                <select
                  value={formVerseId}
                  onChange={(e) => setFormVerseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  {versesCatalog.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.reference} — {v.text.substring(0, 45)}...
                    </option>
                  ))}
                </select>
              </div>

              {selectedVerseObj && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs italic text-slate-300">
                  "{selectedVerseObj.text}"
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Título da Reflexão
                </label>
                <input
                  type="text"
                  value={formReflectionTitle}
                  onChange={(e) => setFormReflectionTitle(e.target.value)}
                  placeholder="Ex: O Cuidado de Deus em Cada Detalhe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Texto da Reflexão
                </label>
                <textarea
                  rows={3}
                  value={formReflectionText}
                  onChange={(e) => setFormReflectionText(e.target.value)}
                  placeholder="Mensagem devocional de aprofundamento..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Oração Guiada
                </label>
                <textarea
                  rows={2}
                  value={formPrayerText}
                  onChange={(e) => setFormPrayerText(e.target.value)}
                  placeholder="Oração para o usuário orar ao final..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Tema Principal
                </label>
                <select
                  value={formThemeId}
                  onChange={(e) => setFormThemeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="">Nenhum</option>
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
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
                  {saving ? 'Salvando...' : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Card Drawer Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                Simulação no Aplicativo Android
              </span>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gradient-to-b from-slate-950 to-slate-900 border border-brand-500/30 rounded-2xl p-5 text-center space-y-3">
              <span className="text-[10px] uppercase font-bold text-brand-400 tracking-widest">
                VERSÍCULO DO DIA • {previewItem.target_date}
              </span>
              <p className="text-base font-serif italic text-white leading-relaxed">
                "{previewItem.verse_text}"
              </p>
              <div className="text-xs font-bold text-brand-300">
                {previewItem.reference} ({previewItem.translation})
              </div>

              {previewItem.reflection_title && (
                <div className="mt-4 pt-3 border-t border-slate-800 text-left space-y-2">
                  <div className="text-xs font-bold text-white">
                    📖 {previewItem.reflection_title}
                  </div>
                  <p className="text-xs text-slate-300 leading-normal">
                    {previewItem.reflection_text}
                  </p>
                </div>
              )}

              {previewItem.prayer_text && (
                <div className="mt-2 text-left bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-bold text-brand-400 uppercase">
                    Oração do Dia
                  </div>
                  <p className="text-xs text-slate-300 italic mt-1">
                    "{previewItem.prayer_text}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
