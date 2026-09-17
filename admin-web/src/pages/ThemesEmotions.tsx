import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ThemeItem, EmotionItem } from '../types';
import {
  Sparkles,
  Heart,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Tag,
} from 'lucide-react';

export const ThemesEmotions: React.FC = () => {
  const { currentAppId, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'themes' | 'emotions'>('themes');

  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [emotions, setEmotions] = useState<EmotionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIconName, setFormIconName] = useState('Sparkles');
  const [formColorHex, setFormColorHex] = useState('#c29337');
  const [formSortOrder, setFormSortOrder] = useState(1);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [tRes, eRes] = await Promise.all([
      api.get<ThemeItem[]>('/admin/themes', { app_id: currentAppId }),
      api.get<EmotionItem[]>('/admin/emotions', { app_id: currentAppId }),
    ]);

    if (tRes.success && tRes.data) setThemes(tRes.data);
    if (eRes.success && eRes.data) setEmotions(eRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentAppId]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormId('');
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormIconName(activeTab === 'themes' ? 'Sparkles' : 'Smile');
    setFormColorHex(activeTab === 'themes' ? '#c29337' : '#3a86ff');
    setFormSortOrder((activeTab === 'themes' ? themes.length : emotions.length) + 1);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: ThemeItem | EmotionItem) => {
    setEditingItem(item);
    setFormId(item.id);
    setFormName(item.name);
    setFormSlug(item.slug);
    setFormDescription(item.description || '');
    setFormIconName(item.icon_name);
    setFormColorHex(item.color_hex);
    setFormSortOrder(item.sort_order);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      id: formId || formSlug.replace(/[^a-z0-9_]/gi, '_').toLowerCase(),
      app_id: currentAppId,
      name: formName,
      slug: formSlug,
      description: formDescription,
      icon_name: formIconName,
      color_hex: formColorHex,
      sort_order: formSortOrder,
    };

    const endpoint = activeTab === 'themes' ? '/admin/themes' : '/admin/emotions';
    let res;
    if (editingItem) {
      res = await api.put(`${endpoint}/${editingItem.id}`, payload);
    } else {
      res = await api.post(endpoint, payload);
    }

    setSaving(false);
    if (res.success) {
      setModalOpen(false);
      setToastMessage(
        `${activeTab === 'themes' ? 'Tema' : 'Emoção espiritual'} salvo(a) com sucesso!`
      );
      setTimeout(() => setToastMessage(null), 3000);
      fetchData();
    } else {
      alert(res.error?.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja excluir "${name}"?`)) return;
    const endpoint = activeTab === 'themes' ? '/admin/themes' : '/admin/emotions';
    const res = await api.delete(`${endpoint}/${id}`);
    if (res.success) {
      setToastMessage('Item excluído com sucesso.');
      setTimeout(() => setToastMessage(null), 3000);
      fetchData();
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

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Classificação Temática & Emoções
          </h2>
          <p className="text-xs text-slate-400">
            Categorização de passagens bíblicas para navegação contextual
          </p>
        </div>

        {hasPermission('content.write') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-brand-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'themes' ? 'Novo Tema' : 'Nova Emoção'}</span>
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('themes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'themes'
              ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Temas Bíblicos ({themes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('emotions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'emotions'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Emoções Espirituais ({emotions.length})</span>
        </button>
      </div>

      {/* Privacy Notice for Emotions */}
      {activeTab === 'emotions' && (
        <div className="p-4 bg-navy-950/60 border border-navy-700/60 rounded-2xl flex items-start gap-3 text-xs text-slate-300">
          <Lock className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
          <div>
            <strong className="text-white block">Política de Privacidade & Sensibilidade Ética</strong>
            As emoções selecionadas pelos usuários no app são processadas com privacidade absoluta e
            utilizadas exclusivamente para recomendar passagens de conforto bíblico. Esses dados nunca são
            repassados a redes de anúncios (AdMob/AdSense) para perfilamento comercial.
          </div>
        </div>
      )}

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-500">
            Carregando itens...
          </div>
        ) : (activeTab === 'themes' ? themes : emotions).length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-500">
            Nenhum item cadastrado.
          </div>
        ) : (
          (activeTab === 'themes' ? themes : emotions).map((item) => (
            <div
              key={item.id}
              className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color_hex }}
                    />
                    <span className="text-xs font-bold text-white tracking-wide">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    #{item.sort_order}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                  {item.description || 'Sem descrição cadastrada.'}
                </p>

                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono bg-slate-950 px-2 py-1 rounded-lg border border-slate-800/60">
                  <Tag className="w-3 h-3 text-slate-400" />
                  <span>slug: {item.slug}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] text-brand-400 font-medium">
                  {item.verses_count !== undefined ? `${item.verses_count} versículos` : ''}
                </span>

                <div className="flex items-center gap-1">
                  {hasPermission('content.write') && (
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {hasPermission('content.delete') && (
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingItem
                  ? `Editar ${activeTab === 'themes' ? 'Tema' : 'Emoção'}`
                  : `Novo ${activeTab === 'themes' ? 'Tema' : 'Emoção'}`}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!editingItem) {
                      setFormSlug(
                        e.target.value
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9]/g, '-')
                      );
                    }
                  }}
                  placeholder="Ex: Paz Interior"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Slug (Identificador de URL)
                </label>
                <input
                  type="text"
                  required
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Cor Hexadecimal
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formColorHex}
                      onChange={(e) => setFormColorHex(e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formColorHex}
                      onChange={(e) => setFormColorHex(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Ordem de Exibição
                  </label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Texto explicativo para o usuário no app..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
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
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
