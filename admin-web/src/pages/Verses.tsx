import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { VerseItem, ThemeItem, EmotionItem } from '../types';
import {
  Plus,
  Search,
  Filter,
  BookOpen,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const Verses: React.FC = () => {
  const { currentAppId, hasPermission } = useAuth();

  const [verses, setVerses] = useState<VerseItem[]>([]);
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [emotions, setEmotions] = useState<EmotionItem[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [translations, setTranslations] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [selectedTranslation, setSelectedTranslation] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVerse, setEditingVerse] = useState<VerseItem | null>(null);
  const [formBookId, setFormBookId] = useState('PHP');
  const [formChapter, setFormChapter] = useState(4);
  const [formVerseNumber, setFormVerseNumber] = useState(6);
  const [formReference, setFormReference] = useState('Filipenses 4:6');
  const [formText, setFormText] = useState('');
  const [formTranslation, setFormTranslation] = useState('NVI');
  const [formThemes, setFormThemes] = useState<string[]>([]);
  const [formEmotions, setFormEmotions] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<'draft' | 'published' | 'archived'>('published');
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchMeta = async () => {
    const [tRes, eRes, bRes, trRes] = await Promise.all([
      api.get<ThemeItem[]>('/admin/themes', { app_id: currentAppId }),
      api.get<EmotionItem[]>('/admin/emotions', { app_id: currentAppId }),
      api.get<any[]>('/admin/content-meta/books'),
      api.get<any[]>('/admin/content-meta/translations'),
    ]);

    if (tRes.success && tRes.data) setThemes(tRes.data);
    if (eRes.success && eRes.data) setEmotions(eRes.data);
    if (bRes.success && bRes.data) setBooks(bRes.data);
    if (trRes.success && trRes.data) setTranslations(trRes.data);
  };

  const fetchVerses = async () => {
    setLoading(true);
    const res = await api.get<{
      items: VerseItem[];
      pagination: { total: number; page: number; pages: number };
    }>('/admin/verses', {
      page,
      limit: 15,
      q: searchQuery,
      theme: selectedTheme,
      emotion: selectedEmotion,
      translation: selectedTranslation,
      app_id: currentAppId,
    });

    if (res.success && res.data) {
      setVerses(res.data.items);
      setTotalPages(res.data.pagination.pages);
      setTotalCount(res.data.pagination.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMeta();
  }, [currentAppId]);

  useEffect(() => {
    fetchVerses();
  }, [page, searchQuery, selectedTheme, selectedEmotion, selectedTranslation, currentAppId]);

  const handleOpenCreate = () => {
    setEditingVerse(null);
    setFormBookId('PHP');
    setFormChapter(4);
    setFormVerseNumber(6);
    setFormReference('Filipenses 4:6');
    setFormText('');
    setFormTranslation('NVI');
    setFormThemes(['paz']);
    setFormEmotions(['ansioso']);
    setFormStatus('published');
    setModalOpen(true);
  };

  const handleOpenEdit = (v: VerseItem) => {
    setEditingVerse(v);
    setFormBookId(v.book_id);
    setFormChapter(v.chapter);
    setFormVerseNumber(v.verse_number);
    setFormReference(v.reference);
    setFormText(v.text);
    setFormTranslation(v.translation);
    setFormThemes(v.themes || []);
    setFormEmotions(v.emotions || []);
    setFormStatus(v.status);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      app_id: currentAppId,
      book_id: formBookId,
      chapter: formChapter,
      verse_number: formVerseNumber,
      reference: formReference,
      text: formText,
      translation: formTranslation,
      themes: formThemes,
      emotions: formEmotions,
      status: formStatus,
    };

    let res;
    if (editingVerse) {
      res = await api.put(`/admin/verses/${editingVerse.id}`, payload);
    } else {
      res = await api.post('/admin/verses', payload);
    }

    setSaving(false);
    if (res.success) {
      setModalOpen(false);
      setToastMessage(editingVerse ? 'Versículo atualizado com sucesso!' : 'Versículo cadastrado com sucesso!');
      setTimeout(() => setToastMessage(null), 3000);
      fetchVerses();
    } else {
      alert(res.error?.message || 'Erro ao salvar versículo');
    }
  };

  const handleDelete = async (id: string, ref: string) => {
    if (!confirm(`Tem certeza que deseja excluir o versículo "${ref}"?`)) return;
    const res = await api.delete(`/admin/verses/${id}`);
    if (res.success) {
      setToastMessage('Versículo removido com sucesso.');
      setTimeout(() => setToastMessage(null), 3000);
      fetchVerses();
    } else {
      alert(res.error?.message || 'Erro ao excluir versículo');
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

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Banco de Versículos Bíblicos
          </h2>
          <p className="text-xs text-slate-400">
            Total de {totalCount} passagens cadastradas no catálogo
          </p>
        </div>

        {hasPermission('content.write') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-brand-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Versículo</span>
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por referência ou texto..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <select
          aria-label="Filtrar por Tema"
          value={selectedTheme}
          onChange={(e) => {
            setSelectedTheme(e.target.value);
            setPage(1);
          }}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
        >
          <option value="">Todos os Temas</option>
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por Emoção Espiritual"
          value={selectedEmotion}
          onChange={(e) => {
            setSelectedEmotion(e.target.value);
            setPage(1);
          }}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
        >
          <option value="">Todas as Emoções</option>
          {emotions.map((em) => (
            <option key={em.id} value={em.id}>
              {em.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por Tradução"
          value={selectedTranslation}
          onChange={(e) => {
            setSelectedTranslation(e.target.value);
            setPage(1);
          }}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
        >
          <option value="">Todas as Traduções</option>
          <option value="NVI">NVI (Nova Versão Internacional)</option>
          <option value="ACF">ACF (Almeida Corrigida Fiel)</option>
          <option value="KJV">KJV (King James Version)</option>
        </select>
      </div>

      {/* Verses Table */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Referência & Tradução</th>
                <th className="px-5 py-3.5">Texto Bíblico</th>
                <th className="px-5 py-3.5">Temas / Emoções</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    Carregando versículos...
                  </td>
                </tr>
              ) : verses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    Nenhum versículo encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                verses.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-white text-sm">{v.reference}</div>
                      <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 bg-slate-800 text-brand-400 rounded-md border border-slate-700/50">
                        {v.translation}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-md">
                      <p className="line-clamp-2 text-slate-300 italic">
                        "{v.text}"
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {v.themes?.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] bg-brand-950/70 text-brand-300 border border-brand-800/60 px-1.5 py-0.5 rounded"
                          >
                            {t}
                          </span>
                        ))}
                        {v.emotions?.map((e) => (
                          <span
                            key={e}
                            className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          v.status === 'published'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : v.status === 'draft'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right space-x-2">
                      {hasPermission('content.write') && (
                        <button
                          onClick={() => handleOpenEdit(v)}
                          className="p-1.5 text-slate-400 hover:text-brand-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Editar versículo"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission('content.delete') && (
                        <button
                          onClick={() => handleDelete(v.id, v.reference)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                          title="Excluir versículo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
            Página {page} de {totalPages} ({totalCount} itens)
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

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white">
                {editingVerse ? 'Editar Versículo Bíblico' : 'Novo Versículo Bíblico'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Livro
                  </label>
                  <select
                    value={formBookId}
                    onChange={(e) => {
                      setFormBookId(e.target.value);
                      const b = books.find((x) => x.id === e.target.value);
                      if (b) setFormReference(`${b.name} ${formChapter}:${formVerseNumber}`);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.testament})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Capítulo
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formChapter}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setFormChapter(val);
                      const b = books.find((x) => x.id === formBookId);
                      if (b) setFormReference(`${b.name} ${val}:${formVerseNumber}`);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Versículo
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formVerseNumber}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setFormVerseNumber(val);
                      const b = books.find((x) => x.id === formBookId);
                      if (b) setFormReference(`${b.name} ${formChapter}:${val}`);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Referência Completa
                  </label>
                  <input
                    type="text"
                    required
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Tradução
                  </label>
                  <select
                    value={formTranslation}
                    onChange={(e) => setFormTranslation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    {translations.map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.name} ({tr.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Texto Bíblico
                </label>
                <textarea
                  rows={4}
                  required
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Digite o texto bíblico..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Themes Multi-select */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">
                  Temas Relacionados
                </label>
                <div className="flex flex-wrap gap-2">
                  {themes.map((t) => {
                    const isSelected = formThemes.includes(t.id);
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => {
                          if (isSelected) {
                            setFormThemes(formThemes.filter((x) => x !== t.id));
                          } else {
                            setFormThemes([...formThemes, t.id]);
                          }
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-brand-500 text-slate-950 border-brand-500 font-bold'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Emotions Multi-select */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">
                  Emoções Espirituais Relacionadas
                </label>
                <div className="flex flex-wrap gap-2">
                  {emotions.map((em) => {
                    const isSelected = formEmotions.includes(em.id);
                    return (
                      <button
                        type="button"
                        key={em.id}
                        onClick={() => {
                          if (isSelected) {
                            setFormEmotions(formEmotions.filter((x) => x !== em.id));
                          } else {
                            setFormEmotions([...formEmotions, em.id]);
                          }
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {em.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Status de Publicação
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="published">Publicado (Disponível no App)</option>
                  <option value="draft">Rascunho</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
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
                  {saving ? 'Salvando...' : 'Salvar Versículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
