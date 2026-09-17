import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  RegistrationFieldItem,
  RegistrationFieldCreatePayload,
  RegistrationFieldUpdatePayload,
  RegistrationFieldType,
  RegistrationFieldOption
} from '../types';
import {
  Sliders,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Trash2,
  Edit3,
  Layers,
  Users,
  Smartphone,
  Check,
  X,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  FileText,
  Phone,
  Calendar,
  Hash,
  List,
  CheckSquare,
  Eye,
  Send,
  HelpCircle,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

const FIELD_TYPES: { id: RegistrationFieldType; label: string; icon: React.FC<{ className?: string }>; description: string }[] = [
  { id: 'text', label: 'Texto Curto', icon: FileText, description: 'Texto em linha única (ex: profissão, cidade)' },
  { id: 'phone', label: 'Telefone / WhatsApp', icon: Phone, description: 'Número de telefone com máscara' },
  { id: 'date', label: 'Data', icon: Calendar, description: 'Data de nascimento ou aniversário' },
  { id: 'number', label: 'Número', icon: Hash, description: 'Valor numérico inteiro ou decimal' },
  { id: 'select', label: 'Seleção Única (Dropdown)', icon: List, description: 'Escolha de uma única opção pré-definida' },
  { id: 'multiselect', label: 'Múltipla Escolha (Tags)', icon: CheckSquare, description: 'Múltiplas opções selecionáveis' },
  { id: 'boolean', label: 'Alternador (Sim / Não)', icon: CheckCircle2, description: 'Checkbox ou switch de confirmação' },
  { id: 'textarea', label: 'Texto Longo', icon: FileText, description: 'Área de texto com múltiplas linhas (ex: testemunho)' },
];

const REGEX_PRESETS = [
  { label: 'Nenhum (Padrão)', value: '' },
  { label: 'Telefone Celular BR: (XX) 9XXXX-XXXX', value: '^\\(?\\d{2}\\)?\\s?9?\\d{4}-?\\d{4}$' },
  { label: 'Data AAAA-MM-DD', value: '^\\d{4}-\\d{2}-\\d{2}$' },
  { label: 'CPF: XXX.XXX.XXX-XX', value: '^\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}$' },
  { label: 'Apenas Letras e Espaços', value: '^[a-zA-ZÀ-ÿ\\s]+$' },
  { label: 'Apenas Números', value: '^\\d+$' },
  { label: 'Instagram / Redes (@usuario)', value: '^@?[a-zA-Z0-9._]+$' },
];

export const RegistrationFields: React.FC = () => {
  const { currentAppId } = useAuth();
  const [selectedApp, setSelectedApp] = useState<string>(currentAppId || 'verse_daily');
  const [apps, setApps] = useState<{ id: string; name: string }[]>([
    { id: 'verse_daily', name: 'Versículo do Dia & Bíblia' }
  ]);
  const [fields, setFields] = useState<RegistrationFieldItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterRequired, setFilterRequired] = useState<'all' | 'required' | 'optional'>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingField, setEditingField] = useState<RegistrationFieldItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isTesterOpen, setIsTesterOpen] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<RegistrationFieldCreatePayload>({
    app_id: selectedApp,
    field_key: '',
    label: '',
    placeholder: '',
    help_text: '',
    field_type: 'text',
    options: [],
    is_required: false,
    is_active: true,
    min_length: undefined,
    max_length: undefined,
    regex_pattern: '',
    error_message: '',
    display_order: 0,
    show_in_profile: true,
    show_in_export: true,
  });
  const [newOptionVal, setNewOptionVal] = useState<string>('');
  const [newOptionLabel, setNewOptionLabel] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Preview / Interactive state
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});

  // Tester state
  const [testPayload, setTestPayload] = useState<string>('{\n  "email": "test_user@example.com",\n  "password": "Password123!",\n  "name": "Irmão Teste",\n  "app_id": "verse_daily",\n  "custom_fields": {}\n}');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  const fetchFields = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: RegistrationFieldItem[]; total_users: number }>(
        '/admin/registration-fields',
        { app_id: selectedApp }
      );
      if (res.success && res.data) {
        setFields(res.data.data || []);
        setTotalUsers(res.data.total_users || 0);
      }
    } catch (err) {
      console.error('Failed to fetch registration fields:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchApps = async () => {
    try {
      const res = await api.get<{ items?: any[]; data?: any[] } | any[]>('/admin/apps');
      if (res.success && res.data) {
        const rawList = Array.isArray(res.data) ? res.data : (res.data.items || res.data.data || []);
        if (rawList.length > 0) {
          setApps(rawList.map((a: any) => ({ id: a.id, name: a.name || a.id })));
        }
      }
    } catch (_) {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    fetchFields();
  }, [selectedApp]);

  // Sync app_id into formData
  useEffect(() => {
    setFormData((prev) => ({ ...prev, app_id: selectedApp }));
  }, [selectedApp]);

  // Filtered Fields
  const filteredFields = useMemo(() => {
    return fields.filter((f) => {
      if (filterActive === 'active' && !f.is_active) return false;
      if (filterActive === 'inactive' && f.is_active) return false;
      if (filterRequired === 'required' && !f.is_required) return false;
      if (filterRequired === 'optional' && f.is_required) return false;
      if (filterType !== 'all' && f.field_type !== filterType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchKey = f.field_key.toLowerCase().includes(q);
        const matchLabel = f.label.toLowerCase().includes(q);
        const matchHelp = f.help_text?.toLowerCase().includes(q);
        return matchKey || matchLabel || matchHelp;
      }
      return true;
    });
  }, [fields, filterActive, filterRequired, filterType, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = fields.length;
    const active = fields.filter((f) => f.is_active).length;
    const required = fields.filter((f) => f.is_active && f.is_required).length;
    const optional = fields.filter((f) => f.is_active && !f.is_required).length;
    const avgFillRate =
      fields.length > 0
        ? Math.round(
            fields.reduce((acc, curr) => acc + (curr.fill_rate || 0), 0) / fields.length
          )
        : 0;

    return { total, active, required, optional, avgFillRate };
  }, [fields]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingField(null);
    setFormData({
      app_id: selectedApp,
      field_key: '',
      label: '',
      placeholder: '',
      help_text: '',
      field_type: 'text',
      options: [],
      is_required: false,
      is_active: true,
      min_length: undefined,
      max_length: undefined,
      regex_pattern: '',
      error_message: '',
      display_order: fields.length + 1,
      show_in_profile: true,
      show_in_export: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (field: RegistrationFieldItem) => {
    setEditingField(field);
    setFormData({
      app_id: field.app_id,
      field_key: field.field_key,
      label: field.label,
      placeholder: field.placeholder || '',
      help_text: field.help_text || '',
      field_type: field.field_type,
      options: field.options || [],
      is_required: field.is_required,
      is_active: field.is_active,
      min_length: field.min_length,
      max_length: field.max_length,
      regex_pattern: field.regex_pattern || '',
      error_message: field.error_message || '',
      display_order: field.display_order,
      show_in_profile: field.show_in_profile,
      show_in_export: field.show_in_export,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Auto-generate slug from label if empty or creating
  const handleLabelChange = (val: string) => {
    setFormData((prev) => {
      const updated: RegistrationFieldCreatePayload = { ...prev, label: val };
      if (!editingField && (!prev.field_key || prev.field_key.trim() === '')) {
        const slug = val
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .substring(0, 40);
        updated.field_key = slug;
      }
      return updated;
    });
  };

  // Add Option to Select/MultiSelect
  const handleAddOption = () => {
    if (!newOptionLabel.trim()) return;
    const optVal =
      newOptionVal.trim() ||
      newOptionLabel
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_');

    const newOption: RegistrationFieldOption = {
      value: optVal,
      label: newOptionLabel.trim(),
    };

    setFormData((prev) => ({
      ...prev,
      options: [...(prev.options || []), newOption],
    }));
    setNewOptionVal('');
    setNewOptionLabel('');
  };

  const handleRemoveOption = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== index),
    }));
  };

  // Save Field (Create / Edit)
  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.label.trim()) {
      setFormError('O título do campo (label) é obrigatório.');
      return;
    }
    if (!editingField && !formData.field_key.trim()) {
      setFormError('A chave identificadora do campo (field_key) é obrigatória.');
      return;
    }

    if (['select', 'multiselect'].includes(formData.field_type) && (!formData.options || formData.options.length === 0)) {
      setFormError('Para campos de seleção, adicione ao menos uma opção.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingField) {
        const updatePayload: RegistrationFieldUpdatePayload = {
          label: formData.label,
          placeholder: formData.placeholder,
          help_text: formData.help_text,
          field_type: formData.field_type,
          options: formData.options,
          is_required: formData.is_required,
          is_active: formData.is_active,
          min_length: formData.min_length,
          max_length: formData.max_length,
          regex_pattern: formData.regex_pattern,
          error_message: formData.error_message,
          display_order: formData.display_order,
          show_in_profile: formData.show_in_profile,
          show_in_export: formData.show_in_export,
        };
        const res = await api.put(`/admin/registration-fields/${editingField.id}`, updatePayload);
        if (res.success) {
          setIsModalOpen(false);
          fetchFields();
        } else {
          setFormError(res.error?.message || 'Falha ao atualizar campo');
        }
      } else {
        const res = await api.post('/admin/registration-fields', formData);
        if (res.success) {
          setIsModalOpen(false);
          fetchFields();
        } else {
          setFormError(res.error?.message || 'Falha ao criar campo');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Erro de conexão com o servidor');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Toggle Active
  const handleToggleActive = async (field: RegistrationFieldItem) => {
    try {
      const res = await api.patch(`/admin/registration-fields/${field.id}/toggle-active`);
      if (res.success) {
        setFields((prev) =>
          prev.map((f) => (f.id === field.id ? { ...f, is_active: !f.is_active } : f))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Toggle Required
  const handleToggleRequired = async (field: RegistrationFieldItem) => {
    try {
      const res = await api.patch(`/admin/registration-fields/${field.id}/toggle-required`);
      if (res.success) {
        setFields((prev) =>
          prev.map((f) => (f.id === field.id ? { ...f, is_required: !f.is_required } : f))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reorder Item (Move Up/Down)
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredFields.length) return;

    const newOrder = [...filteredFields];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    const items = newOrder.map((f, i) => ({ id: f.id, display_order: i + 1 }));

    // Optimistic UI update
    setFields((prev) =>
      prev.map((f) => {
        const found = items.find((it) => it.id === f.id);
        return found ? { ...f, display_order: found.display_order } : f;
      })
    );

    try {
      await api.post('/admin/registration-fields/reorder', { items });
    } catch (err) {
      console.error('Failed to reorder:', err);
      fetchFields();
    }
  };

  // Delete Field
  const handleDeleteField = async (id: string) => {
    try {
      const res = await api.delete(`/admin/registration-fields/${id}`);
      if (res.success) {
        setDeleteConfirmId(null);
        fetchFields();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Test Runner against server-side endpoint
  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const parsed = JSON.parse(testPayload);
      const res = await api.post('/auth/register', parsed);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: { message: err.message || 'JSON inválido ou erro de requisição' },
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Live validate on preview change
  const handlePreviewInputChange = (field: RegistrationFieldItem, value: any) => {
    setPreviewValues((prev) => ({ ...prev, [field.field_key]: value }));

    // Perform live validation check
    const errors: Record<string, string> = { ...previewErrors };
    if (field.is_required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors[field.field_key] = field.error_message || `O campo "${field.label}" é obrigatório.`;
    } else if (value && typeof value === 'string' && field.min_length && value.trim().length < field.min_length) {
      errors[field.field_key] = `Mínimo de ${field.min_length} caracteres.`;
    } else if (value && typeof value === 'string' && field.max_length && value.trim().length > field.max_length) {
      errors[field.field_key] = `Máximo de ${field.max_length} caracteres.`;
    } else if (value && typeof value === 'string' && field.regex_pattern) {
      try {
        const reg = new RegExp(field.regex_pattern);
        if (!reg.test(value)) {
          errors[field.field_key] = field.error_message || 'Formato não atende aos requisitos.';
        } else {
          delete errors[field.field_key];
        }
      } catch (_) {
        delete errors[field.field_key];
      }
    } else {
      delete errors[field.field_key];
    }
    setPreviewErrors(errors);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                Campos Dinâmicos de Cadastro
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-medium">
                  Server-side Validated
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Configure campos adicionais, regras de obrigatoriedade, expressões regulares e pré-visualize o formulário mobile.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* App Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 shadow-sm">
            <Layers className="w-4 h-4 text-slate-400 mr-2" />
            <select
              value={selectedApp}
              onChange={(e) => setSelectedApp(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-200 focus:outline-none cursor-pointer"
            >
              {apps.map((a) => (
                <option key={a.id} value={a.id} className="bg-slate-900 text-slate-200">
                  {a.name} ({a.id})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchFields}
            disabled={loading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-colors"
            title="Recarregar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              // Pre-fill sample payload with existing fields
              const sampleCustom: Record<string, any> = {};
              fields.forEach((f) => {
                if (f.field_type === 'phone') sampleCustom[f.field_key] = '(11) 98765-4321';
                else if (f.field_type === 'date') sampleCustom[f.field_key] = '1995-08-20';
                else if (f.field_type === 'number') sampleCustom[f.field_key] = 25;
                else if (f.field_type === 'select') {
                  const firstOpt = f.options?.[0];
                  sampleCustom[f.field_key] = typeof firstOpt === 'object' ? firstOpt.value : firstOpt || 'opcao';
                } else if (f.field_type === 'multiselect') {
                  const firstOpt = f.options?.[0];
                  sampleCustom[f.field_key] = [typeof firstOpt === 'object' ? firstOpt.value : firstOpt || 'opcao'];
                } else if (f.field_type === 'boolean') sampleCustom[f.field_key] = true;
                else sampleCustom[f.field_key] = 'Exemplo de texto';
              });

              setTestPayload(
                JSON.stringify(
                  {
                    email: `teste_${Date.now()}@exemplo.com`,
                    password: 'SenhaForte123!',
                    name: 'Novo Discípulo',
                    app_id: selectedApp,
                    custom_fields: sampleCustom,
                  },
                  null,
                  2
                )
              );
              setIsTesterOpen(true);
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
            <span>Testador Server-side</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-brand-500/25 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Campo</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Campos</span>
            <Sliders className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{metrics.total}</div>
          <div className="text-xs text-slate-400 mt-1">
            <span className="text-emerald-400 font-medium">{metrics.active} ativos</span> • {metrics.total - metrics.active} inativos
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Obrigatórios</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{metrics.required}</div>
          <div className="text-xs text-slate-400 mt-1">
            Exigidos rigorosamente no cadastro
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Opcionais</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">{metrics.optional}</div>
          <div className="text-xs text-slate-400 mt-1">
            Coleta voluntária de perfil
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Taxa Média Preenchimento</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{metrics.avgFillRate}%</div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(metrics.avgFillRate, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left List + Right Mobile Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Fields Manager (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por label ou chave..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as any)}
                className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
              >
                <option value="all">Status: Todos</option>
                <option value="active">Apenas Ativos</option>
                <option value="inactive">Apenas Inativos</option>
              </select>

              <select
                value={filterRequired}
                onChange={(e) => setFilterRequired(e.target.value as any)}
                className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
              >
                <option value="all">Exigência: Todas</option>
                <option value="required">Obrigatórios</option>
                <option value="optional">Opcionais</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
              >
                <option value="all">Tipo: Todos</option>
                {FIELD_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fields List */}
          {loading ? (
            <div className="p-12 text-center bg-slate-900/30 rounded-2xl border border-slate-800/60">
              <RefreshCw className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Carregando definições de campos...</p>
            </div>
          ) : filteredFields.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/30 rounded-2xl border border-slate-800/60">
              <Sliders className="w-12 h-12 text-slate-600 mx-auto mb-3 stroke-[1.5]" />
              <h3 className="text-base font-semibold text-slate-200">Nenhum campo encontrado</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery || filterActive !== 'all' || filterRequired !== 'all'
                  ? 'Nenhum campo corresponde aos filtros aplicados.'
                  : 'Nenhum campo dinâmico cadastrado ainda para este aplicativo. Clique no botão abaixo para adicionar.'}
              </p>
              <button
                onClick={handleOpenCreate}
                className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Primeiro Campo</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFields.map((field, idx) => {
                const typeInfo = FIELD_TYPES.find((t) => t.id === field.field_type) || FIELD_TYPES[0];
                const TypeIcon = typeInfo.icon;

                return (
                  <div
                    key={field.id}
                    className={`group p-4 rounded-2xl border transition-all duration-200 ${
                      field.is_active
                        ? 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700/80 shadow-sm'
                        : 'bg-slate-950/50 border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left info & icon */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Order Index & controls */}
                        <div className="flex flex-col items-center justify-center pt-0.5">
                          <button
                            onClick={() => handleMoveOrder(idx, 'up')}
                            disabled={idx === 0}
                            className={`p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors ${
                              idx === 0 ? 'opacity-20 cursor-not-allowed' : ''
                            }`}
                            title="Mover para cima"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] font-mono font-bold text-slate-500 my-0.5">
                            #{field.display_order}
                          </span>
                          <button
                            onClick={() => handleMoveOrder(idx, 'down')}
                            disabled={idx === filteredFields.length - 1}
                            className={`p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors ${
                              idx === filteredFields.length - 1 ? 'opacity-20 cursor-not-allowed' : ''
                            }`}
                            title="Mover para baixo"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Type Icon Badge */}
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-brand-400 flex-shrink-0">
                          <TypeIcon className="w-4 h-4" />
                        </div>

                        {/* Main Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-slate-100 truncate">
                              {field.label}
                            </h4>
                            <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-indigo-400 border border-indigo-500/20">
                              {field.field_key}
                            </code>

                            {/* Required badge with quick toggle */}
                            <button
                              onClick={() => handleToggleRequired(field)}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                                field.is_required
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 text-slate-300'
                              }`}
                              title="Clique para alternar obrigatoriedade"
                            >
                              {field.is_required ? 'Obrigatório *' : 'Opcional'}
                            </button>

                            {/* Profile badge */}
                            {field.show_in_profile && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/40">
                                <Eye className="w-3 h-3 text-slate-400" />
                                Perfil
                              </span>
                            )}
                          </div>

                          {field.help_text && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                              {field.help_text}
                            </p>
                          )}

                          {/* Options pills if select / multiselect */}
                          {field.options && field.options.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-2">
                              <span className="text-[10px] text-slate-500 font-medium">Opções:</span>
                              {field.options.slice(0, 4).map((opt, optIdx) => {
                                const optLabel = typeof opt === 'object' ? opt.label : opt;
                                return (
                                  <span
                                    key={optIdx}
                                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950/80 text-slate-300 border border-slate-800"
                                  >
                                    {optLabel}
                                  </span>
                                );
                              })}
                              {field.options.length > 4 && (
                                <span className="text-[10px] text-slate-500 font-medium">
                                  +{field.options.length - 4} mais
                                </span>
                              )}
                            </div>
                          )}

                          {/* Rules summary row */}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500">
                            <span>Tipo: <strong className="text-slate-400 font-medium">{typeInfo.label}</strong></span>
                            {(field.min_length || field.max_length) && (
                              <span>
                                Limites:{' '}
                                <strong className="text-slate-400 font-medium">
                                  {field.min_length || 0} - {field.max_length || '∞'} carac.
                                </strong>
                              </span>
                            )}
                            {field.regex_pattern && (
                              <span className="text-brand-400 font-mono text-[10px] truncate max-w-[180px]">
                                Regex: {field.regex_pattern}
                              </span>
                            )}
                            {field.fill_rate !== undefined && (
                              <span className="text-emerald-400 font-medium">
                                Preenchido por {field.filled_count || 0} usuários ({field.fill_rate}%)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Quick Toggle Active Switch */}
                        <button
                          onClick={() => handleToggleActive(field)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            field.is_active ? 'bg-brand-600' : 'bg-slate-800'
                          }`}
                          title={field.is_active ? 'Desativar campo' : 'Ativar campo'}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              field.is_active ? 'translate-x-4.5' : 'translate-x-1'
                            }`}
                          />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(field)}
                          className="p-2 text-slate-400 hover:text-brand-400 hover:bg-slate-800 rounded-xl transition-colors"
                          title="Editar campo"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(field.id)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                          title="Excluir campo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Mobile Mockup (5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="sticky top-24">
            <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800/90 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-brand-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Prévia do App Mobile
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                  Ao Vivo
                </span>
              </div>

              {/* Smartphone Frame */}
              <div className="mx-auto max-w-[320px] rounded-[32px] border-4 border-slate-800 bg-slate-950 shadow-2xl overflow-hidden text-slate-100 font-sans">
                {/* Status Bar */}
                <div className="h-6 bg-slate-950 px-5 flex items-center justify-between text-[10px] text-slate-500">
                  <span>09:41</span>
                  <div className="w-12 h-3.5 bg-slate-900 rounded-full mx-auto -mt-1"></div>
                  <span>100%</span>
                </div>

                {/* Mobile App Header */}
                <div className="px-5 py-3 border-b border-slate-900 flex items-center justify-between bg-slate-950">
                  <div>
                    <h5 className="text-xs font-bold text-slate-100">Criar Nova Conta</h5>
                    <p className="text-[9px] text-slate-500">Versículo do Dia & Bíblia</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center text-[10px] font-bold">
                    VD
                  </div>
                </div>

                {/* Mobile Form Content */}
                <div className="p-4 space-y-3 max-h-[460px] overflow-y-auto custom-scrollbar text-[11px]">
                  {/* Fixed Core Fields */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                      Nome Completo <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value="Seu Nome"
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                      E-mail <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      disabled
                      value="seu.email@exemplo.com"
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                      Senha <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="password"
                      disabled
                      value="••••••••••••"
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-400 focus:outline-none"
                    />
                  </div>

                  {/* Section Divider */}
                  <div className="pt-2 border-t border-slate-900">
                    <div className="text-[10px] font-bold text-brand-400 uppercase tracking-wider mb-2">
                      Informações de Perfil
                    </div>
                  </div>

                  {/* Dynamic Configured Active Fields */}
                  {fields.filter((f) => f.is_active).length === 0 ? (
                    <div className="py-4 text-center text-[10px] text-slate-500">
                      Nenhum campo dinâmico ativo no momento.
                    </div>
                  ) : (
                    fields
                      .filter((f) => f.is_active)
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((f) => {
                        const hasError = previewErrors[f.field_key];
                        const curVal = previewValues[f.field_key] || '';

                        return (
                          <div key={f.id} className="space-y-1">
                            <label className="block text-[10px] font-semibold text-slate-300">
                              {f.label}{' '}
                              {f.is_required && <span className="text-rose-400 font-bold">*</span>}
                            </label>

                            {/* Render according to field_type */}
                            {f.field_type === 'select' ? (
                              <select
                                value={curVal}
                                onChange={(e) => handlePreviewInputChange(f, e.target.value)}
                                className={`w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-brand-500 ${
                                  hasError ? 'border-rose-500' : 'border-slate-800'
                                }`}
                              >
                                <option value="">{f.placeholder || 'Selecione uma opção...'}</option>
                                {(f.options || []).map((opt, i) => {
                                  const optVal = typeof opt === 'object' ? opt.value : opt;
                                  const optLabel = typeof opt === 'object' ? opt.label : opt;
                                  return (
                                    <option key={i} value={optVal}>
                                      {optLabel}
                                    </option>
                                  );
                                })}
                              </select>
                            ) : f.field_type === 'multiselect' ? (
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap gap-1">
                                  {(f.options || []).map((opt, i) => {
                                    const optVal = typeof opt === 'object' ? opt.value : opt;
                                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                                    const selectedList = Array.isArray(curVal) ? curVal : [];
                                    const isSel = selectedList.includes(optVal);

                                    return (
                                      <button
                                        type="button"
                                        key={i}
                                        onClick={() => {
                                          const next = isSel
                                            ? selectedList.filter((v: string) => v !== optVal)
                                            : [...selectedList, optVal];
                                          handlePreviewInputChange(f, next);
                                        }}
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                                          isSel
                                            ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                                        }`}
                                      >
                                        {optLabel}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : f.field_type === 'boolean' ? (
                              <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                                <input
                                  type="checkbox"
                                  checked={!!curVal}
                                  onChange={(e) => handlePreviewInputChange(f, e.target.checked)}
                                  className="rounded bg-slate-900 border-slate-700 text-brand-600 focus:ring-0 focus:ring-offset-0"
                                />
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {f.placeholder || 'Concordo / Sim'}
                                </span>
                              </label>
                            ) : f.field_type === 'textarea' ? (
                              <textarea
                                rows={2}
                                placeholder={f.placeholder || ''}
                                value={curVal}
                                onChange={(e) => handlePreviewInputChange(f, e.target.value)}
                                className={`w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500 resize-none ${
                                  hasError ? 'border-rose-500' : 'border-slate-800'
                                }`}
                              />
                            ) : (
                              <input
                                type={
                                  f.field_type === 'number'
                                    ? 'number'
                                    : f.field_type === 'date'
                                    ? 'date'
                                    : 'text'
                                }
                                placeholder={f.placeholder || ''}
                                value={curVal}
                                onChange={(e) => handlePreviewInputChange(f, e.target.value)}
                                className={`w-full bg-slate-900 border rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500 ${
                                  hasError ? 'border-rose-500' : 'border-slate-800'
                                }`}
                              />
                            )}

                            {f.help_text && (
                              <p className="text-[9px] text-slate-500 leading-tight">
                                {f.help_text}
                              </p>
                            )}
                            {hasError && (
                              <p className="text-[9px] text-rose-400 font-medium">
                                {hasError}
                              </p>
                            )}
                          </div>
                        );
                      })
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      className="w-full py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/20 transition-all text-center"
                    >
                      Cadastrar e Continuar
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-center mt-3">
                <p className="text-[11px] text-slate-500">
                  Esta visualização simula os componentes nativos do app Android e Web.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Create / Edit Field */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
                {editingField ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  {editingField ? 'Editar Campo Dinâmico' : 'Novo Campo Dinâmico'}
                </h3>
                <p className="text-xs text-slate-400">
                  Defina o tipo, obrigatoriedade e regras de validação no servidor.
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveField} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Título / Label Exibido <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Telefone / WhatsApp"
                    value={formData.label}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Chave do Campo (slug) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingField}
                    placeholder="Ex: phone_number"
                    value={formData.field_key}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-indigo-300 focus:outline-none focus:border-brand-500 disabled:opacity-50"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Nome da propriedade no JSON (snake_case).
                  </p>
                </div>
              </div>

              {/* Field Type & Placeholder */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tipo de Dado <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.field_type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        field_type: e.target.value as RegistrationFieldType,
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} - {t.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Placeholder / Texto de Apoio
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 98765-4321 ou Selecione seu estado..."
                    value={formData.placeholder || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, placeholder: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Help Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Texto de Ajuda / Orientação (Abaixo do campo)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Usado apenas para suporte e devocionais temáticos."
                  value={formData.help_text || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, help_text: e.target.value }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Options Manager if select or multiselect */}
              {['select', 'multiselect'].includes(formData.field_type) && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Opções da Lista ({formData.options?.length || 0})
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Adicione as opções que o usuário poderá escolher
                    </span>
                  </div>

                  {/* Add option row */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Texto da Opção (Ex: São Paulo)"
                      value={newOptionLabel}
                      onChange={(e) => setNewOptionLabel(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                    <input
                      type="text"
                      placeholder="Valor (Opcional, ex: SP)"
                      value={newOptionVal}
                      onChange={(e) => setNewOptionVal(e.target.value)}
                      className="w-32 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-indigo-300 focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  </div>

                  {/* Options List Pills */}
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar pt-1">
                    {(formData.options || []).map((opt, i) => {
                      const optLabel = typeof opt === 'object' ? opt.label : opt;
                      const optVal = typeof opt === 'object' ? opt.value : opt;
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300"
                        >
                          <span>{optLabel}</span>
                          <span className="text-[10px] font-mono text-indigo-400">({optVal})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(i)}
                            className="text-slate-500 hover:text-rose-400 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Validation Rules: Length & Regex */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <ShieldAlert className="w-4 h-4 text-brand-400" />
                  <span>Regras de Validação Server-side</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Mín. Caracteres</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.min_length ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          min_length: e.target.value ? parseInt(e.target.value) : undefined,
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Máx. Caracteres</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.max_length ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          max_length: e.target.value ? parseInt(e.target.value) : undefined,
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Padrões Prontos</label>
                    <select
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, regex_pattern: e.target.value }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
                    >
                      {REGEX_PRESETS.map((p, idx) => (
                        <option key={idx} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Expressão Regular (Regex Customizada)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: ^\d{2}/\d{2}/\d{4}$"
                      value={formData.regex_pattern || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, regex_pattern: e.target.value }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-brand-300 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Mensagem de Erro Customizada
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Informe um número de telefone com DDD válido."
                      value={formData.error_message || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, error_message: e.target.value }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* Toggles Row: Required, Active, Show in Profile, Show in Export */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.is_required}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, is_required: e.target.checked }))
                    }
                    className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-200">Obrigatório</span>
                    <span className="block text-[10px] text-slate-500">Trava se vazio</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                    }
                    className="rounded bg-slate-900 border-slate-700 text-brand-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-200">Ativo</span>
                    <span className="block text-[10px] text-slate-500">Exibido no app</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.show_in_profile}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, show_in_profile: e.target.checked }))
                    }
                    className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-200">No Perfil</span>
                    <span className="block text-[10px] text-slate-500">Editável depois</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.show_in_export}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, show_in_export: e.target.checked }))
                    }
                    className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-200">No Export</span>
                    <span className="block text-[10px] text-slate-500">Inclui em CSV</span>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-50"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{editingField ? 'Salvar Alterações' : 'Criar Campo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Server-side Registration Tester */}
      {isTesterOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsTesterOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  Simulador de Validação Server-side (/auth/register)
                </h3>
                <p className="text-xs text-slate-400">
                  Envie requisições de cadastro reais e teste se os campos obrigatórios e regex são validados pelo backend.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Payload de Teste (JSON POST /api/v1/auth/register)
                  </label>
                  <span className="text-[10px] text-slate-500">
                    Altere os campos em `custom_fields` para testar rejeições
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  className="w-full bg-slate-950 font-mono text-xs text-slate-200 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-brand-500 custom-scrollbar"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Dica: experimente apagar um campo obrigatório ou violar regex para ver a resposta 422.</span>
                </div>

                <button
                  onClick={handleRunTest}
                  disabled={isTesting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                  {isTesting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Executar Teste no Backend</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-mono space-y-2 ${
                    testResult.success
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-sans">
                    <span className="font-bold flex items-center gap-1.5">
                      {testResult.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Cadastro Validado e Aprovado pelo Backend (201 Created)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>Rejeitado pela Validação Server-side (Regra Violada)</span>
                        </>
                      )}
                    </span>
                  </div>

                  <pre className="p-3 bg-slate-950 rounded-xl overflow-x-auto text-[11px] text-slate-300 border border-slate-800 max-h-48 custom-scrollbar">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Excluir Campo?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Os dados já preenchidos pelos usuários existentes nos seus perfis não serão apagados, mas o campo não aparecerá mais no formulário.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteField(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationFields;
