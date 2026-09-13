import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  PremiumProductItem,
  AdPlacementItem,
  SubscriptionItem,
  SimulatorResult,
  DiagnosticItem,
  MonetizationOverview,
  ProviderTestResult,
} from '../types';
import {
  DollarSign,
  Calculator,
  Sliders,
  ShieldCheck,
  TrendingUp,
  Package,
  Radio,
  Activity,
  AlertCircle,
  CheckCircle2,
  Lock,
  Plus,
  Edit2,
  Trash2,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  ExternalLink,
  Users,
  Crown,
  HelpCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  X,
  Archive,
  ArchiveRestore,
  Filter,
  Search,
  ArrowUpRight,
  BarChart3,
  Percent,
  Check,
  PieChart,
  Calendar,
  Scale,
  Wallet,
  Target,
  TrendingDown,
  AlertTriangle,
  Copy,
  Download,
  Save,
  Bookmark,
  FileSpreadsheet,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const MonetizationHub: React.FC = () => {
  const { currentAppId, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'simulator' | 'products' | 'placements' | 'subscriptions' | 'diagnostic'
  >('overview');

  // Real Overview State
  const [overview, setOverview] = useState<MonetizationOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);

  // -------------------------------------------------------------
  // SIMULATOR STATE & PARAMETERS (MRR, LTV, BREAK-EVEN)
  // -------------------------------------------------------------
  const [mau, setMau] = useState<number>(50000);
  const [avgSessionsPerUserDay, setAvgSessionsPerUserDay] = useState<number>(2.5);
  const [adImpressionsPerSession, setAdImpressionsPerSession] = useState<number>(2.0);
  const [ecpmReais, setEcpmReais] = useState<number>(7.5); // R$ 7,50
  const [premiumConversionRate, setPremiumConversionRate] = useState<number>(1.8); // 1.8%
  const [monthlyPriceReais, setMonthlyPriceReais] = useState<number>(14.9); // R$ 14,90
  const [annualPriceReais, setAnnualPriceReais] = useState<number>(99.9); // R$ 99,90
  const [annualSubscribersPct, setAnnualSubscribersPct] = useState<number>(40); // 40%
  const [monthlyUserGrowthPct, setMonthlyUserGrowthPct] = useState<number>(10.0); // 10%
  const [monthlyChurnPct, setMonthlyChurnPct] = useState<number>(5.0); // 5%
  const [monthlyFixedCosts, setMonthlyFixedCosts] = useState<number>(3500); // R$ 3.500
  const [cacReais, setCacReais] = useState<number>(15.0); // R$ 15,00
  const [googlePlayFeePct, setGooglePlayFeePct] = useState<number>(15.0); // 15% taxa da Google Play

  const [simulationResult, setSimulationResult] = useState<SimulatorResult | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [chartViewMode, setChartViewMode] = useState<'monthly_bars' | 'cumulative_area'>('monthly_bars');
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);
  const [loadingScenarios, setLoadingScenarios] = useState<boolean>(false);
  const [newScenarioName, setNewScenarioName] = useState<string>('');
  const [savingScenario, setSavingScenario] = useState<boolean>(false);

  // -------------------------------------------------------------
  // PRODUCTS STATE & CRUD
  // -------------------------------------------------------------
  const [products, setProducts] = useState<PremiumProductItem[]>([]);
  const [productSearch, setProductSearch] = useState<string>('');
  const [productStatusFilter, setProductStatusFilter] = useState<'all' | 'active' | 'inactive' | 'archived'>('all');
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'subs' | 'inapp'>('all');

  // Product Create/Edit Modal State
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [isEditingProduct, setIsEditingProduct] = useState<boolean>(false);
  const [submittingProduct, setSubmittingProduct] = useState<boolean>(false);
  const [currentProductForm, setCurrentProductForm] = useState<{
    id: string;
    product_id: string;
    base_plan_id: string;
    offer_id: string;
    product_type: 'subs' | 'inapp';
    title: string;
    description: string;
    reference_price: string;
    status: 'active' | 'inactive' | 'archived';
    entitlements: string[];
  }>({
    id: '',
    product_id: '',
    base_plan_id: '',
    offer_id: '',
    product_type: 'subs',
    title: '',
    description: '',
    reference_price: 'R$ 14,90/mês',
    status: 'active',
    entitlements: ['premium', 'ad_free'],
  });
  const [newEntitlementInput, setNewEntitlementInput] = useState<string>('');

  // -------------------------------------------------------------
  // PLACEMENTS, SUBSCRIPTIONS & DIAGNOSTICS STATE
  // -------------------------------------------------------------
  const [placements, setPlacements] = useState<AdPlacementItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Provider testing state for diagnostics
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [providerTestResults, setProviderTestResults] = useState<Record<string, ProviderTestResult>>({});

  // Placement modal state
  const [showAddPlacementModal, setShowAddPlacementModal] = useState<boolean>(false);
  const [newPlacement, setNewPlacement] = useState({
    name: '',
    provider: 'admob',
    platform: 'android',
    format: 'interstitial',
    ad_unit_id_masked: 'ca-app-pub-3940256099942544/1033173712',
    enabled: true,
    min_interval_seconds: 120,
    max_per_session: 3,
    free_only: true,
  });
  const [submittingPlacement, setSubmittingPlacement] = useState<boolean>(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // -------------------------------------------------------------
  // DATA FETCHING
  // -------------------------------------------------------------
  const fetchOverview = async () => {
    setLoadingOverview(true);
    const res = await api.get<MonetizationOverview>('/admin/monetization/overview', { app_id: currentAppId });
    if (res.success && res.data) {
      setOverview(res.data);
    }
    setLoadingOverview(false);
  };

  const fetchHubData = async () => {
    setLoading(true);
    const [pRes, plRes, sRes, dRes] = await Promise.all([
      api.get<PremiumProductItem[]>('/admin/monetization/products', { app_id: currentAppId }),
      api.get<AdPlacementItem[]>('/admin/monetization/placements', { app_id: currentAppId }),
      api.get<SubscriptionItem[]>('/admin/monetization/subscriptions'),
      api.get<{ overall_status: string; items: DiagnosticItem[] }>('/admin/monetization/diagnostic'),
    ]);

    if (pRes.success && pRes.data) setProducts(pRes.data);
    if (plRes.success && plRes.data) setPlacements(plRes.data);
    if (sRes.success && sRes.data) setSubscriptions(sRes.data);
    if (dRes.success && dRes.data) setDiagnostics(dRes.data.items || []);
    setLoading(false);
  };

  // -------------------------------------------------------------
  // SIMULATOR REAL API RUN (MRR, LTV, BREAK-EVEN)
  // -------------------------------------------------------------
  const runSimulation = async () => {
    setSimulating(true);
    const calculatedDau = Math.round(mau * 0.33);
    const res = await api.post<SimulatorResult>('/admin/monetization/simulator', {
      dau: calculatedDau,
      mau: mau,
      avg_sessions_per_user_day: avgSessionsPerUserDay,
      ad_impressions_per_session: adImpressionsPerSession,
      ecpm_reais: ecpmReais,
      premium_conversion_rate_pct: premiumConversionRate,
      monthly_price_reais: monthlyPriceReais,
      annual_price_reais: annualPriceReais,
      annual_subscribers_pct: annualSubscribersPct,
      monthly_churn_pct: monthlyChurnPct,
      monthly_user_growth_pct: monthlyUserGrowthPct,
      monthly_fixed_costs_reais: monthlyFixedCosts,
      customer_acquisition_cost_reais: cacReais,
      google_play_fee_pct: googlePlayFeePct,
    });

    if (res.success && res.data) {
      setSimulationResult(res.data);
    }
    setSimulating(false);
  };

  const fetchSavedScenarios = async () => {
    setLoadingScenarios(true);
    const res = await api.get<any[]>('/admin/monetization/scenarios', { app_id: currentAppId });
    if (res.success && res.data) {
      setSavedScenarios(res.data);
    }
    setLoadingScenarios(false);
  };

  useEffect(() => {
    fetchOverview();
    fetchHubData();
    fetchSavedScenarios();
  }, [currentAppId]);

  useEffect(() => {
    runSimulation();
  }, [
    mau,
    avgSessionsPerUserDay,
    adImpressionsPerSession,
    ecpmReais,
    premiumConversionRate,
    monthlyPriceReais,
    annualPriceReais,
    annualSubscribersPct,
    monthlyUserGrowthPct,
    monthlyChurnPct,
    monthlyFixedCosts,
    cacReais,
    googlePlayFeePct,
  ]);

  // -------------------------------------------------------------
  // SIMULATOR SCENARIO PRESETS & PERSISTENCE
  // -------------------------------------------------------------
  const applyScenarioPreset = (preset: 'conservative' | 'balanced' | 'aggressive' | 'annual_focus') => {
    if (preset === 'conservative') {
      setAvgSessionsPerUserDay(2.0);
      setAdImpressionsPerSession(1.5);
      setEcpmReais(4.5);
      setPremiumConversionRate(0.9);
      setMonthlyPriceReais(14.9);
      setAnnualPriceReais(89.9);
      setAnnualSubscribersPct(35);
      setMonthlyUserGrowthPct(4.0);
      setMonthlyChurnPct(7.0);
      setMonthlyFixedCosts(4000);
      setCacReais(22.0);
      setGooglePlayFeePct(15.0);
      showToast('Cenário Conservador aplicado.', 'info');
    } else if (preset === 'balanced') {
      setAvgSessionsPerUserDay(2.5);
      setAdImpressionsPerSession(2.0);
      setEcpmReais(7.5);
      setPremiumConversionRate(1.8);
      setMonthlyPriceReais(14.9);
      setAnnualPriceReais(99.9);
      setAnnualSubscribersPct(40);
      setMonthlyUserGrowthPct(10.0);
      setMonthlyChurnPct(5.0);
      setMonthlyFixedCosts(3500);
      setCacReais(15.0);
      setGooglePlayFeePct(15.0);
      showToast('Cenário Equilibrado aplicado.', 'info');
    } else if (preset === 'aggressive') {
      setAvgSessionsPerUserDay(3.5);
      setAdImpressionsPerSession(3.0);
      setEcpmReais(12.0);
      setPremiumConversionRate(3.2);
      setMonthlyPriceReais(19.9);
      setAnnualPriceReais(149.9);
      setAnnualSubscribersPct(50);
      setMonthlyUserGrowthPct(20.0);
      setMonthlyChurnPct(3.5);
      setMonthlyFixedCosts(5000);
      setCacReais(12.0);
      setGooglePlayFeePct(15.0);
      showToast('Cenário Agressivo de Escala aplicado.', 'info');
    } else if (preset === 'annual_focus') {
      setAvgSessionsPerUserDay(2.8);
      setAdImpressionsPerSession(1.5);
      setEcpmReais(8.0);
      setPremiumConversionRate(2.4);
      setMonthlyPriceReais(19.9);
      setAnnualPriceReais(119.9);
      setAnnualSubscribersPct(75);
      setMonthlyUserGrowthPct(12.0);
      setMonthlyChurnPct(3.8);
      setMonthlyFixedCosts(3800);
      setCacReais(18.0);
      setGooglePlayFeePct(15.0);
      showToast('Cenário Foco em Assinatura Anual aplicado.', 'info');
    }
  };

  const handleSaveScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioName.trim()) {
      showToast('Informe um nome para o cenário.', 'error');
      return;
    }
    setSavingScenario(true);
    const params = {
      mau,
      avgSessionsPerUserDay,
      adImpressionsPerSession,
      ecpmReais,
      premiumConversionRate,
      monthlyPriceReais,
      annualPriceReais,
      annualSubscribersPct,
      monthlyUserGrowthPct,
      monthlyChurnPct,
      monthlyFixedCosts,
      cacReais,
      googlePlayFeePct,
    };
    const summary = simulationResult
      ? {
          estimated_mrr: simulationResult.estimated_mrr,
          estimated_arr: simulationResult.estimated_arr,
          estimated_ltv_subscriber: simulationResult.estimated_ltv_subscriber,
          break_even_month: simulationResult.break_even_month,
          estimated_monthly_net_profit: simulationResult.estimated_monthly_net_profit,
        }
      : {};

    const res = await api.post('/admin/monetization/scenarios', {
      name: newScenarioName.trim(),
      description: `MAU ${mau.toLocaleString()} | Conv ${premiumConversionRate}% | Churn ${monthlyChurnPct}%`,
      parameters: params,
      projection_summary: summary,
      app_id: currentAppId,
    });

    setSavingScenario(false);
    if (res.success) {
      showToast(`Cenário "${newScenarioName}" salvo com sucesso!`, 'success');
      setNewScenarioName('');
      fetchSavedScenarios();
    } else {
      showToast(res.error?.message || 'Falha ao salvar cenário.', 'error');
    }
  };

  const handleLoadScenario = (scenario: any) => {
    const p = scenario.parameters || {};
    if (p.mau !== undefined) setMau(Number(p.mau));
    if (p.avgSessionsPerUserDay !== undefined) setAvgSessionsPerUserDay(Number(p.avgSessionsPerUserDay));
    if (p.adImpressionsPerSession !== undefined) setAdImpressionsPerSession(Number(p.adImpressionsPerSession));
    if (p.ecpmReais !== undefined) setEcpmReais(Number(p.ecpmReais));
    if (p.premiumConversionRate !== undefined) setPremiumConversionRate(Number(p.premiumConversionRate));
    if (p.monthlyPriceReais !== undefined) setMonthlyPriceReais(Number(p.monthlyPriceReais));
    if (p.annualPriceReais !== undefined) setAnnualPriceReais(Number(p.annualPriceReais));
    if (p.annualSubscribersPct !== undefined) setAnnualSubscribersPct(Number(p.annualSubscribersPct));
    if (p.monthlyUserGrowthPct !== undefined) setMonthlyUserGrowthPct(Number(p.monthlyUserGrowthPct));
    if (p.monthlyChurnPct !== undefined) setMonthlyChurnPct(Number(p.monthlyChurnPct));
    if (p.monthlyFixedCosts !== undefined) setMonthlyFixedCosts(Number(p.monthlyFixedCosts));
    if (p.cacReais !== undefined) setCacReais(Number(p.cacReais));
    if (p.googlePlayFeePct !== undefined) setGooglePlayFeePct(Number(p.googlePlayFeePct));
    showToast(`Cenário "${scenario.name}" carregado com sucesso!`, 'success');
  };

  const handleDeleteScenario = async (id: string, name: string) => {
    if (!window.confirm(`Deseja realmente excluir o cenário "${name}"?`)) return;
    const res = await api.delete(`/admin/monetization/scenarios/${id}`);
    if (res.success) {
      setSavedScenarios((prev) => prev.filter((s) => s.id !== id));
      showToast(`Cenário "${name}" excluído.`, 'success');
    } else {
      showToast(res.error?.message || 'Falha ao excluir cenário.', 'error');
    }
  };

  const handleExportProjectionsCsv = () => {
    if (!simulationResult || !simulationResult.twelve_months_projection) return;
    const headers = [
      'Mês',
      'MAU Projetado',
      'Receita Ads (R$)',
      'Receita Assinaturas (R$)',
      'Faturamento Total (R$)',
      'Custos Operacionais (R$)',
      'Lucro Líquido (R$)',
      'Lucro Acumulado (R$)',
      'Break-even Atingido',
    ];
    const rows = simulationResult.twelve_months_projection.map((m) => [
      m.month,
      m.projected_mau,
      m.projected_ads_revenue.toFixed(2),
      m.projected_premium_revenue.toFixed(2),
      m.projected_total_revenue.toFixed(2),
      (m.projected_costs || 0).toFixed(2),
      (m.projected_net_profit || 0).toFixed(2),
      (m.projected_cumulative_profit || 0).toFixed(2),
      m.is_breakeven_reached ? 'SIM' : 'NAO',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `projecao_financeira_12_meses_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Projeção financeira exportada em CSV!', 'success');
  };

  // -------------------------------------------------------------
  // PRODUCTS CRUD HANDLERS (Create, Edit, Activate, Archive, Delete)
  // -------------------------------------------------------------
  const openCreateProductModal = () => {
    setIsEditingProduct(false);
    setCurrentProductForm({
      id: '',
      product_id: '',
      base_plan_id: 'p1m',
      offer_id: '',
      product_type: 'subs',
      title: '',
      description: '',
      reference_price: 'R$ 14,90/mês',
      status: 'active',
      entitlements: ['premium', 'ad_free'],
    });
    setShowProductModal(true);
  };

  const openEditProductModal = (prod: PremiumProductItem) => {
    setIsEditingProduct(true);
    setCurrentProductForm({
      id: prod.id,
      product_id: prod.product_id,
      base_plan_id: prod.base_plan_id || '',
      offer_id: prod.offer_id || '',
      product_type: prod.product_type,
      title: prod.title,
      description: prod.description || '',
      reference_price: prod.reference_price || '',
      status: prod.status,
      entitlements: prod.entitlements || [],
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProductForm.title.trim() || !currentProductForm.product_id.trim()) {
      showToast('Título e SKU / Product ID são obrigatórios.', 'error');
      return;
    }

    setSubmittingProduct(true);

    if (isEditingProduct) {
      // Edit product via PUT /admin/monetization/products/{id}
      const res = await api.put(`/admin/monetization/products/${currentProductForm.id}`, {
        title: currentProductForm.title,
        description: currentProductForm.description,
        reference_price: currentProductForm.reference_price,
        status: currentProductForm.status,
        entitlements: currentProductForm.entitlements,
        base_plan_id: currentProductForm.base_plan_id || null,
        offer_id: currentProductForm.offer_id || null,
        product_type: currentProductForm.product_type,
        product_id: currentProductForm.product_id,
      });

      setSubmittingProduct(false);
      if (res.success) {
        showToast(`Produto '${currentProductForm.title}' atualizado com sucesso!`, 'success');
        setShowProductModal(false);
        fetchHubData();
        fetchOverview();
      } else {
        showToast(res.error?.message || 'Falha ao atualizar produto.', 'error');
      }
    } else {
      // Create product via POST /admin/monetization/products
      const autoId = currentProductForm.id.trim()
        ? currentProductForm.id.trim()
        : currentProductForm.product_id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

      const res = await api.post('/admin/monetization/products', {
        id: autoId,
        app_id: currentAppId,
        product_id: currentProductForm.product_id.trim(),
        base_plan_id: currentProductForm.base_plan_id.trim() || null,
        offer_id: currentProductForm.offer_id.trim() || null,
        product_type: currentProductForm.product_type,
        title: currentProductForm.title.trim(),
        description: currentProductForm.description.trim(),
        reference_price: currentProductForm.reference_price.trim(),
        status: currentProductForm.status,
        entitlements: currentProductForm.entitlements,
      });

      setSubmittingProduct(false);
      if (res.success) {
        showToast('Novo produto Google Play cadastrado com sucesso!', 'success');
        setShowProductModal(false);
        fetchHubData();
        fetchOverview();
      } else {
        showToast(res.error?.message || 'Falha ao cadastrar produto.', 'error');
      }
    }
  };

  // Toggle active / inactive
  const handleToggleProductStatus = async (prod: PremiumProductItem) => {
    const nextStatus = prod.status === 'active' ? 'inactive' : 'active';
    const res = await api.post(`/admin/monetization/products/${prod.id}/status?status_val=${nextStatus}`);
    if (res.success) {
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, status: nextStatus } : p))
      );
      showToast(
        `Produto '${prod.title}' ${nextStatus === 'active' ? 'ativado' : 'desativado'}.`,
        'success'
      );
      fetchOverview();
    } else {
      showToast(res.error?.message || 'Falha ao alterar status do produto.', 'error');
    }
  };

  // Archive / Restore product
  const handleArchiveProduct = async (prod: PremiumProductItem) => {
    const nextStatus = prod.status === 'archived' ? 'active' : 'archived';
    const actionLabel = nextStatus === 'archived' ? 'arquivar' : 'desarquivar e ativar';

    if (
      !window.confirm(
        `Deseja realmente ${actionLabel} o produto "${prod.title}" (${prod.product_id})?`
      )
    ) {
      return;
    }

    const res = await api.post(`/admin/monetization/products/${prod.id}/status?status_val=${nextStatus}`);
    if (res.success) {
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, status: nextStatus } : p))
      );
      showToast(
        `Produto '${prod.title}' ${nextStatus === 'archived' ? 'arquivado' : 'reativado'}.`,
        'success'
      );
      fetchOverview();
    } else {
      showToast(res.error?.message || 'Falha ao arquivar produto.', 'error');
    }
  };

  // Delete product
  const handleDeleteProduct = async (prod: PremiumProductItem) => {
    if (
      !window.confirm(
        `Atenção: Deseja realmente excluir o produto "${prod.title}"? Esta ação removerá o mapeamento local.`
      )
    ) {
      return;
    }

    const res = await api.delete(`/admin/monetization/products/${prod.id}`);
    if (res.success) {
      setProducts((prev) => prev.filter((p) => p.id !== prod.id));
      showToast(`Produto '${prod.title}' excluído.`, 'success');
      fetchOverview();
    } else {
      showToast(res.error?.message || 'Falha ao excluir produto.', 'error');
    }
  };

  // Duplicate / Clone product
  const handleDuplicateProduct = (prod: PremiumProductItem) => {
    setIsEditingProduct(false);
    setCurrentProductForm({
      id: '',
      product_id: `${prod.product_id}_copy`,
      base_plan_id: prod.base_plan_id || '',
      offer_id: prod.offer_id || '',
      product_type: prod.product_type,
      title: `${prod.title} (Cópia)`,
      description: prod.description || '',
      reference_price: prod.reference_price || '',
      status: 'active',
      entitlements: [...(prod.entitlements || [])],
    });
    setShowProductModal(true);
    showToast(`Copiando dados de "${prod.title}". Ajuste o SKU e salve.`, 'info');
  };

  // Copy SKU to clipboard
  const handleCopySku = (sku: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(sku);
    }
    showToast(`SKU "${sku}" copiado para a área de transferência!`, 'success');
  };

  // Export Products Catalog (JSON / CSV)
  const handleExportProducts = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(products, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `google_play_products_${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.removeChild(downloadAnchor);
    } else {
      const headers = [
        'ID',
        'SKU',
        'Tipo',
        'Título',
        'Preço Referência',
        'Base Plan ID',
        'Offer ID',
        'Status',
        'Entitlements',
      ];
      const rows = products.map((p) => [
        p.id,
        p.product_id,
        p.product_type,
        `"${p.title.replace(/"/g, '""')}"`,
        `"${(p.reference_price || '').replace(/"/g, '""')}"`,
        p.base_plan_id || '',
        p.offer_id || '',
        p.status,
        `"${(p.entitlements || []).join(';')}"`,
      ]);
      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `google_play_products_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    showToast(`Catálogo de produtos exportado em ${format.toUpperCase()}!`, 'success');
  };

  // Add entitlement tag to form
  const handleAddEntitlement = () => {
    const val = newEntitlementInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (val && !currentProductForm.entitlements.includes(val)) {
      setCurrentProductForm({
        ...currentProductForm,
        entitlements: [...currentProductForm.entitlements, val],
      });
      setNewEntitlementInput('');
    }
  };

  const handleRemoveEntitlement = (tag: string) => {
    setCurrentProductForm({
      ...currentProductForm,
      entitlements: currentProductForm.entitlements.filter((e) => e !== tag),
    });
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesSearch =
        prod.title.toLowerCase().includes(productSearch.toLowerCase()) ||
        prod.product_id.toLowerCase().includes(productSearch.toLowerCase()) ||
        prod.id.toLowerCase().includes(productSearch.toLowerCase());

      const matchesStatus =
        productStatusFilter === 'all' || prod.status === productStatusFilter;

      const matchesType =
        productTypeFilter === 'all' || prod.product_type === productTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [products, productSearch, productStatusFilter, productTypeFilter]);

  // -------------------------------------------------------------
  // PLACEMENT & DIAGNOSTIC HANDLERS
  // -------------------------------------------------------------
  const handleTogglePlacement = async (placement: AdPlacementItem) => {
    const newStatus = !placement.enabled;
    const res = await api.put(`/admin/monetization/placements/${placement.id}`, {
      enabled: newStatus,
    });
    if (res.success) {
      setPlacements((prev) =>
        prev.map((p) => (p.id === placement.id ? { ...p, enabled: newStatus } : p))
      );
      showToast(
        `Posicionamento '${placement.name}' ${newStatus ? 'ativado' : 'pausado'}`,
        'success'
      );
      fetchOverview();
    } else {
      showToast(res.error?.message || 'Falha ao atualizar posicionamento', 'error');
    }
  };

  const handleDeletePlacement = async (placementId: string, name: string) => {
    if (!window.confirm(`Deseja realmente excluir o posicionamento "${name}"?`)) return;
    const res = await api.delete(`/admin/monetization/placements/${placementId}`);
    if (res.success) {
      setPlacements((prev) => prev.filter((p) => p.id !== placementId));
      showToast(`Posicionamento "${name}" excluído.`, 'success');
      fetchOverview();
    } else {
      showToast(res.error?.message || 'Falha ao excluir posicionamento', 'error');
    }
  };

  const handleCreatePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlacement.name.trim()) return;
    setSubmittingPlacement(true);
    const res = await api.post('/admin/monetization/placements', {
      ...newPlacement,
      app_id: currentAppId,
    });
    setSubmittingPlacement(false);
    if (res.success) {
      showToast('Novo posicionamento criado com sucesso!', 'success');
      setShowAddPlacementModal(false);
      setNewPlacement({
        name: '',
        provider: 'admob',
        platform: 'android',
        format: 'interstitial',
        ad_unit_id_masked: 'ca-app-pub-3940256099942544/1033173712',
        enabled: true,
        min_interval_seconds: 120,
        max_per_session: 3,
        free_only: true,
      });
      fetchHubData();
      fetchOverview();
    } else {
      showToast(res.error?.message || 'Falha ao criar posicionamento', 'error');
    }
  };

  const handleTestProvider = async (providerId: string) => {
    setTestingProvider(providerId);
    const res = await api.post<ProviderTestResult>(`/admin/health/test/${providerId}`);
    setTestingProvider(null);
    if (res.success && res.data) {
      setProviderTestResults((prev) => ({ ...prev, [providerId]: res.data }));
      showToast(`Diagnóstico com '${res.data.display_name}' atualizado!`, 'success');
    } else {
      showToast(`Falha ao testar conexão com ${providerId}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-8 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-medium animate-fade-in border ${
            toastType === 'success'
              ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
              : toastType === 'error'
              ? 'bg-rose-950 border-rose-800 text-rose-300'
              : 'bg-slate-900 border-slate-700 text-slate-200'
          }`}
        >
          {toastType === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : toastType === 'error' ? (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-brand-400 shrink-0" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-brand-400" />
            <span>Hub de Monetização & Receita</span>
          </h2>
          <p className="text-xs text-slate-400">
            Gestão integrada de Google Play Billing, AdMob, Simulador Financeiro e catálogo de produtos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchOverview();
              fetchHubData();
            }}
            disabled={loadingOverview || loading}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingOverview ? 'animate-spin text-brand-400' : ''}`} />
            <span>Atualizar Métricas</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'overview'
              ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Visão Geral & Faturamento</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'products'
              ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Produtos Google Play ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'simulator'
              ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Simulador Financeiro (12 Meses)</span>
        </button>

        <button
          onClick={() => setActiveTab('placements')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'placements'
              ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Posicionamentos AdMob</span>
        </button>

        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'subscriptions'
              ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Crown className="w-3.5 h-3.5" />
          <span>Assinaturas Ativas</span>
        </button>

        <button
          onClick={() => setActiveTab('diagnostic')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'diagnostic'
              ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Diagnóstico de Integrações</span>
        </button>
      </div>

      {/* ======================================================= */}
      {/* TAB: PRODUCTS CRUD (Google Play SKUs)                  */}
      {/* ======================================================= */}
      {activeTab === 'products' && (
        <div className="space-y-5 animate-fade-in">
          {/* Top Bar with Counters and Action */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 p-4 rounded-3xl shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-2xl text-brand-400">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Catálogo de Produtos Google Play
                </h3>
                <p className="text-xs text-slate-400">
                  Gerencie SKUs de Assinaturas e In-App cadastrados no Google Play Console
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportProducts('csv')}
                title="Exportar catálogo em CSV"
                className="inline-flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold px-3 py-2.5 rounded-xl text-xs border border-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-brand-400" />
                <span>Exportar CSV</span>
              </button>
              <button
                onClick={() => handleExportProducts('json')}
                title="Exportar catálogo em JSON"
                className="inline-flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold px-3 py-2.5 rounded-xl text-xs border border-slate-800 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                <span>JSON</span>
              </button>
              <button
                onClick={openCreateProductModal}
                className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-brand-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Produto Google Play</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por título, SKU ou ID..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
                <span className="text-slate-500 px-1.5 font-medium">Status:</span>
                <button
                  onClick={() => setProductStatusFilter('all')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                    productStatusFilter === 'all'
                      ? 'bg-brand-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({products.length})
                </button>
                <button
                  onClick={() => setProductStatusFilter('active')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                    productStatusFilter === 'active'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Ativos ({products.filter((p) => p.status === 'active').length})
                </button>
                <button
                  onClick={() => setProductStatusFilter('inactive')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                    productStatusFilter === 'inactive'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Inativos ({products.filter((p) => p.status === 'inactive').length})
                </button>
                <button
                  onClick={() => setProductStatusFilter('archived')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                    productStatusFilter === 'archived'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Arquivados ({products.filter((p) => p.status === 'archived').length})
                </button>
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
                <span className="text-slate-500 px-1.5 font-medium">Tipo:</span>
                <button
                  onClick={() => setProductTypeFilter('all')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                    productTypeFilter === 'all'
                      ? 'bg-brand-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setProductTypeFilter('subs')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                    productTypeFilter === 'subs'
                      ? 'bg-brand-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Assinaturas
                </button>
                <button
                  onClick={() => setProductTypeFilter('inapp')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                    productTypeFilter === 'inapp'
                      ? 'bg-brand-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  In-App
                </button>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <Package className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">Nenhum produto encontrado</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Não há produtos correspondentes aos filtros selecionados. Cadastre um novo produto ou ajuste a busca.
              </p>
              <button
                onClick={openCreateProductModal}
                className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-brand-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Primeiro Produto</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((prod) => {
                const isSubs = prod.product_type === 'subs';
                const isActive = prod.status === 'active';
                const isArchived = prod.status === 'archived';

                return (
                  <div
                    key={prod.id}
                    className={`bg-slate-900/80 border rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xl transition-all relative overflow-hidden group ${
                      isActive
                        ? 'border-slate-800 hover:border-slate-700'
                        : isArchived
                        ? 'border-slate-800/40 opacity-75'
                        : 'border-amber-900/30'
                    }`}
                  >
                    {/* Top status bar */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 ${
                        isActive
                          ? 'bg-emerald-500'
                          : isArchived
                          ? 'bg-slate-700'
                          : 'bg-amber-500'
                      }`}
                    />

                    <div>
                      {/* Badge Row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/30">
                          {isSubs ? 'Assinatura Google Play' : 'In-App Único'}
                        </span>

                        <div>
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>ATIVO</span>
                            </span>
                          ) : isArchived ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-slate-800 text-slate-300 border border-slate-700">
                              <Archive className="w-3 h-3 text-slate-400" />
                              <span>ARQUIVADO</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-amber-950 text-amber-300 border border-amber-800">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>INATIVO</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Price */}
                      <h4 className="text-base font-bold text-white mt-3 leading-snug">
                        {prod.title}
                      </h4>
                      <div className="text-xl font-extrabold text-brand-300 my-1 font-mono">
                        {prod.reference_price || 'Sob Consulta'}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {prod.description || 'Sem descrição cadastrada.'}
                      </p>

                      {/* Technical Info Google Play */}
                      <div className="mt-3 p-2.5 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-1 font-mono text-[11px]">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Google Play SKU:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-semibold">{prod.product_id}</span>
                            <button
                              onClick={() => handleCopySku(prod.product_id)}
                              title="Copiar SKU para transferência"
                              className="p-1 hover:text-brand-400 text-slate-500 rounded transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {isSubs && prod.base_plan_id && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Base Plan ID:</span>
                            <span className="text-slate-300">{prod.base_plan_id}</span>
                          </div>
                        )}
                        {prod.offer_id && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Offer ID:</span>
                            <span className="text-brand-400">{prod.offer_id}</span>
                          </div>
                        )}
                      </div>

                      {/* Entitlements */}
                      <div className="mt-3 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Direitos / Entitlements:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {prod.entitlements && prod.entitlements.length > 0 ? (
                            prod.entitlements.map((e) => (
                              <span
                                key={e}
                                className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60"
                              >
                                <Check className="w-2.5 h-2.5 text-brand-400" />
                                <span>{e}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-500">Nenhum entitlement associado</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons (Edit, Activate/Inactivate, Archive, Delete) */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {/* Edit button */}
                        <button
                          onClick={() => openEditProductModal(prod)}
                          title="Editar Produto"
                          className="p-2 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Duplicate / Clone button */}
                        <button
                          onClick={() => handleDuplicateProduct(prod)}
                          title="Clonar / Duplicar Produto"
                          className="p-2 text-slate-400 hover:text-brand-300 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Archive / Restore button */}
                        <button
                          onClick={() => handleArchiveProduct(prod)}
                          title={isArchived ? 'Desarquivar e Ativar Produto' : 'Arquivar Produto'}
                          className={`p-2 border rounded-xl transition-colors ${
                            isArchived
                              ? 'text-brand-400 bg-brand-500/10 border-brand-500/20 hover:bg-brand-500/20'
                              : 'text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 border-slate-800'
                          }`}
                        >
                          {isArchived ? (
                            <ArchiveRestore className="w-3.5 h-3.5" />
                          ) : (
                            <Archive className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteProduct(prod)}
                          title="Excluir Produto"
                          className="p-2 text-slate-500 hover:text-rose-400 bg-slate-950 hover:bg-rose-950/40 border border-slate-800 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Direct Activate / Inactivate Toggle */}
                      {!isArchived && (
                        <button
                          onClick={() => handleToggleProductStatus(prod)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-400" />
                              <span>Desativar</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                              <span>Ativar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================= */}
      {/* TAB: SIMULATOR FINANCEIRO (12 MESES & CÁLCULOS REAIS)   */}
      {/* ======================================================= */}
      {activeTab === 'simulator' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Banner with Disclaimer */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-brand-500/10 border border-brand-500/20 rounded-2xl text-brand-400 shrink-0">
                <Calculator className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    Simulador Financeiro de Monetização & Curva de 12 Meses
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    Cálculo Real
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Modelo preditivo dinâmico integrando receita mista de <strong>Google AdMob</strong> (impressões e eCPM) com <strong>Google Play Subscriptions</strong> (conversão, MRR, ARR e churn).
                </p>
                <span className="text-[11px] text-slate-500 block font-mono">
                  * Este simulador executa projeções matemáticas pelo endpoint FastAPI e não altera registros contábeis reais.
                </span>
              </div>
            </div>

            {/* Quick Presets & Export Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 bg-slate-950 p-2 rounded-2xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 px-2">
                Cenários:
              </span>
              <button
                onClick={() => applyScenarioPreset('conservative')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Conservador
              </button>
              <button
                onClick={() => applyScenarioPreset('balanced')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 transition-colors"
              >
                Equilibrado
              </button>
              <button
                onClick={() => applyScenarioPreset('aggressive')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-colors"
              >
                Agressivo
              </button>
              <button
                onClick={() => applyScenarioPreset('annual_focus')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 transition-colors"
              >
                Foco Anual
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

              <button
                onClick={handleExportProjectionsCsv}
                title="Exportar projeções de 12 meses para arquivo CSV"
                className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sliders Form (4 Cols) */}
            <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-400" />
                  <span>Parâmetros de Entrada</span>
                </h4>
                {simulating && (
                  <span className="text-[10px] font-mono text-brand-400 animate-pulse">
                    Calculando...
                  </span>
                )}
              </div>

              {/* MAU */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Usuários Ativos (MAU)</span>
                  <span className="font-mono font-bold text-white">{mau.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={5000}
                  max={500000}
                  step={5000}
                  value={mau}
                  onChange={(e) => setMau(Number(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              {/* Sessions per user day */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Sessões / Usuário / Dia</span>
                  <span className="font-mono font-bold text-white">{avgSessionsPerUserDay.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={6.0}
                  step={0.5}
                  value={avgSessionsPerUserDay}
                  onChange={(e) => setAvgSessionsPerUserDay(Number(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              {/* Ad Impressions per session */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Impressões Anúncio / Sessão</span>
                  <span className="font-mono font-bold text-white">{adImpressionsPerSession.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={6.0}
                  step={0.5}
                  value={adImpressionsPerSession}
                  onChange={(e) => setAdImpressionsPerSession(Number(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              {/* eCPM AdMob */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">eCPM Médio AdMob</span>
                  <span className="font-mono font-bold text-white">
                    R$ {ecpmReais.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={2.0}
                  max={30.0}
                  step={0.5}
                  value={ecpmReais}
                  onChange={(e) => setEcpmReais(Number(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              {/* Premium Conversion Rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Conversão Assinantes (%)</span>
                  <span className="font-mono font-bold text-emerald-400">{premiumConversionRate.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={8.0}
                  step={0.1}
                  value={premiumConversionRate}
                  onChange={(e) => setPremiumConversionRate(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Monthly Subscription Price */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Preço Assinatura Mensal</span>
                  <span className="font-mono font-bold text-white">R$ {monthlyPriceReais.toFixed(2)}/mês</span>
                </div>
                <input
                  type="range"
                  min={4.9}
                  max={39.9}
                  step={1.0}
                  value={monthlyPriceReais}
                  onChange={(e) => setMonthlyPriceReais(Number(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              {/* Annual Subscription Price */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Preço Assinatura Anual</span>
                  <span className="font-mono font-bold text-white">R$ {annualPriceReais.toFixed(2)}/ano</span>
                </div>
                <input
                  type="range"
                  min={29.9}
                  max={299.9}
                  step={5.0}
                  value={annualPriceReais}
                  onChange={(e) => setAnnualPriceReais(Number(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              {/* Annual Share Pct */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">% Assinam Plano Anual</span>
                  <span className="font-mono font-bold text-white">{annualSubscribersPct}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={annualSubscribersPct}
                  onChange={(e) => setAnnualSubscribersPct(Number(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              {/* Growth & Churn */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block font-medium">Crescimento MAU</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={1}
                      value={monthlyUserGrowthPct}
                      onChange={(e) => setMonthlyUserGrowthPct(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs text-white font-mono"
                    />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block font-medium">Churn Mensal</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      step={0.5}
                      value={monthlyChurnPct}
                      onChange={(e) => setMonthlyChurnPct(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs text-white font-mono"
                    />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                </div>
              </div>

              {/* Custos Operacionais, CAC & Break-even */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>Custos & Aquisição (Break-even)</span>
                </h5>

                {/* Monthly Fixed Costs */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Custos Fixos (Infra/Equipe)</span>
                    <span className="font-mono font-bold text-amber-300">
                      R$ {monthlyFixedCosts.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={25000}
                    step={500}
                    value={monthlyFixedCosts}
                    onChange={(e) => setMonthlyFixedCosts(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* CAC (Customer Acquisition Cost) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">CAC (Custo Aquisição/Assinante)</span>
                    <span className="font-mono font-bold text-purple-300">
                      R$ {cacReais.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2.0}
                    max={80.0}
                    step={1.0}
                    value={cacReais}
                    onChange={(e) => setCacReais(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Google Play Store Fee */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Taxa Google Play Store</span>
                    <span className="font-mono font-bold text-slate-300">
                      {googlePlayFeePct}% <span className="text-[10px] text-slate-500">(tier 15%)</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={30}
                    step={5}
                    value={googlePlayFeePct}
                    onChange={(e) => setGooglePlayFeePct(Number(e.target.value))}
                    className="w-full accent-slate-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Gerenciador de Cenários Salvos (Persistência no Backend) */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-brand-400" />
                    <span>Cenários Salvos ({savedScenarios.length})</span>
                  </h5>
                  <button
                    onClick={fetchSavedScenarios}
                    title="Atualizar lista de cenários"
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingScenarios ? 'animate-spin text-brand-400' : ''}`} />
                    <span>Atualizar</span>
                  </button>
                </div>

                {/* Form to Save Scenario */}
                <form onSubmit={handleSaveScenario} className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Nome do novo cenário..."
                      value={newScenarioName}
                      onChange={(e) => setNewScenarioName(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="submit"
                      disabled={savingScenario || !newScenarioName.trim()}
                      className="inline-flex items-center gap-1 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors shrink-0 shadow-md shadow-brand-500/20"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingScenario ? 'Salvando...' : 'Salvar'}</span>
                    </button>
                  </div>
                </form>

                {/* List of Saved Scenarios */}
                {loadingScenarios ? (
                  <div className="py-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-400" />
                    <span>Carregando cenários...</span>
                  </div>
                ) : savedScenarios.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic py-1">
                    Nenhum cenário salvo ainda. Ajuste os parâmetros acima e salve uma projeção.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {savedScenarios.map((sc) => (
                      <div
                        key={sc.id}
                        className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2 hover:border-slate-700 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-white truncate">
                            {sc.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            MAU: {(sc.params?.mau || 0).toLocaleString()} • Conv: {(sc.params?.premium_conversion_rate || 0)}% • Mensal: R$ {(sc.params?.monthly_price || 0).toFixed(2)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleLoadScenario(sc)}
                            title="Carregar parâmetros deste cenário"
                            className="px-2 py-1 bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-lg text-[10px] font-semibold transition-colors"
                          >
                            Carregar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteScenario(sc.id, sc.name)}
                            title="Excluir cenário salvo"
                            className="p-1 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Results & Visuals (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Break-even & Operational Profit Banner */}
              <div
                className={`p-4 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-xl ${
                  simulationResult?.is_currently_profitable
                    ? 'bg-emerald-950/40 border-emerald-800/60'
                    : 'bg-amber-950/30 border-amber-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-2xl ${
                      simulationResult?.is_currently_profitable
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {simulationResult?.is_currently_profitable ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider font-bold text-slate-300 flex items-center gap-2">
                      <span>Status do Ponto de Equilíbrio (Break-even):</span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                          simulationResult?.is_currently_profitable
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {simulationResult?.is_currently_profitable
                          ? 'Operação Superavitária'
                          : 'Fase de Investimento / Ponto de Equilíbrio Projetado'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {simulationResult?.is_currently_profitable
                        ? `A receita mensal cobre 100% dos custos fixos, taxa da Google Play e CAC com margem líquida positiva.`
                        : `São necessários ${simulationResult?.break_even_subscribers_needed || 0} assinantes para cobrir exclusivamente os custos operacionais.`}
                    </p>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="text-[11px] text-slate-400 block font-medium">Resultado Operacional Líquido</span>
                  <div
                    className={`text-xl font-extrabold font-mono ${
                      (simulationResult?.estimated_monthly_net_profit || 0) >= 0
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {(simulationResult?.estimated_monthly_net_profit || 0) >= 0 ? '+' : ''}
                    R${' '}
                    {(simulationResult?.estimated_monthly_net_profit || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                    <span className="text-xs text-slate-400 font-normal"> /mês</span>
                  </div>
                </div>
              </div>

              {/* Metric Cards Row 1: MRR, Receita & Custos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Monthly Estimated Revenue */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-brand-500" />
                  <span className="text-xs text-slate-400 font-semibold block">
                    Faturamento Bruto Mensal
                  </span>
                  <div className="text-2xl font-extrabold text-white mt-2 font-mono">
                    R$ {(simulationResult?.estimated_monthly_total_revenue || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Anúncios AdMob:</span>
                      <strong className="text-blue-400">
                        R$ {(simulationResult?.estimated_monthly_ads_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Assinaturas:</span>
                      <strong className="text-brand-400">
                        R$ {(simulationResult?.estimated_monthly_premium_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* MRR & ARR */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                  <span className="text-xs text-slate-400 font-semibold block flex items-center justify-between">
                    <span>MRR (Receita Recorrente)</span>
                    <Crown className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                  <div className="text-2xl font-extrabold text-emerald-400 mt-2 font-mono">
                    R$ {(simulationResult?.estimated_mrr || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2 space-y-0.5">
                    <div className="flex justify-between">
                      <span>ARR Estimado:</span>
                      <strong className="text-white">
                        R$ {(simulationResult?.estimated_arr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Assinantes Ativos:</span>
                      <strong className="text-white">
                        {(simulationResult?.estimated_paying_users || 0).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Custos Operacionais Totais */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                  <span className="text-xs text-slate-400 font-semibold block flex items-center justify-between">
                    <span>Custos Operacionais Totais</span>
                    <Wallet className="w-3.5 h-3.5 text-amber-400" />
                  </span>
                  <div className="text-2xl font-extrabold text-amber-300 mt-2 font-mono">
                    R$ {(simulationResult?.monthly_estimated_costs || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Fixos (Infra/Equipe):</span>
                      <strong className="text-slate-300">
                        R$ {(simulationResult?.monthly_fixed_costs || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Break-even Month:</span>
                      <strong className="text-emerald-400">
                        {simulationResult?.break_even_month
                          ? `Mês ${simulationResult.break_even_month}`
                          : simulationResult?.is_currently_profitable
                          ? 'Mês 1 (Atingido)'
                          : 'Projetando...'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metric Cards Row 2: LTV & Economia Unitária (LTV/CAC, Payback) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {/* LTV do Assinante */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 shadow-xl relative overflow-hidden">
                  <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
                    LTV do Assinante
                  </span>
                  <div className="text-xl font-extrabold text-brand-400 mt-1 font-mono">
                    R$ {(simulationResult?.estimated_ltv_subscriber || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Vida média: <strong className="text-white">{simulationResult?.subscriber_lifespan_months || 0} meses</strong>
                  </span>
                </div>

                {/* Razão LTV / CAC */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 shadow-xl relative overflow-hidden">
                  <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
                    Razão LTV / CAC
                  </span>
                  <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
                    {(simulationResult?.ltv_to_cac_ratio || 0).toFixed(1)}x
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {(simulationResult?.ltv_to_cac_ratio || 0) >= 3.0 ? (
                      <strong className="text-emerald-400">✓ Modelo Altamente Saudável</strong>
                    ) : (
                      <strong className="text-amber-400">⚠ Atenção ao CAC</strong>
                    )}
                  </span>
                </div>

                {/* CAC Payback */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 shadow-xl relative overflow-hidden">
                  <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
                    Payback do CAC
                  </span>
                  <div className="text-xl font-extrabold text-purple-300 mt-1 font-mono">
                    {simulationResult?.cac_payback_months || 0}
                    <span className="text-xs text-slate-400 font-normal"> meses</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    CAC configurado: <strong className="text-white">R$ {cacReais.toFixed(2)}</strong>
                  </span>
                </div>

                {/* Blended LTV / ARPU */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 shadow-xl relative overflow-hidden">
                  <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
                    LTV Médio (Blended)
                  </span>
                  <div className="text-xl font-extrabold text-indigo-300 mt-1 font-mono">
                    R$ {(simulationResult?.estimated_ltv_blended || 0).toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    ARPU: <strong className="text-white">R$ {(simulationResult?.estimated_arpu || 0).toFixed(2)}/user</strong>
                  </span>
                </div>
              </div>

              {/* 12 Months Projection Chart (Receita vs Custos vs Lucro) */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-brand-400" />
                      <span>Curva Financeira de 12 Meses: Projeção & Ponto de Equilíbrio</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Visualização de faturamento misto (AdMob + Play Billing) contra custos operacionais
                    </p>
                  </div>

                  {/* Chart View Switcher */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                    <button
                      onClick={() => setChartViewMode('monthly_bars')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                        chartViewMode === 'monthly_bars'
                          ? 'bg-brand-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <BarChart3 className="w-3 h-3" />
                      <span>Barras Mensais</span>
                    </button>
                    <button
                      onClick={() => setChartViewMode('cumulative_area')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                        chartViewMode === 'cumulative_area'
                          ? 'bg-brand-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <TrendingUp className="w-3 h-3" />
                      <span>Curva Acumulada</span>
                    </button>
                  </div>
                </div>

                <div className="h-72 w-full">
                  {simulationResult?.twelve_months_projection ? (
                    <ResponsiveContainer width="100%" height="100%">
                      {chartViewMode === 'monthly_bars' ? (
                        <BarChart data={simulationResult.twelve_months_projection}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis
                            dataKey="month"
                            stroke="#64748b"
                            tickFormatter={(m) => `Mês ${m}`}
                          />
                          <YAxis
                            stroke="#64748b"
                            tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#020617',
                              borderColor: '#1e293b',
                              borderRadius: '1rem',
                              fontSize: '12px',
                            }}
                            formatter={(val: any) => [
                              `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                            ]}
                            labelFormatter={(label) => `Projeção Mês ${label}`}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                          <Bar
                            dataKey="projected_ads_revenue"
                            name="Receita Anúncios (AdMob)"
                            fill="#3b82f6"
                            stackId="receita"
                            radius={[0, 0, 0, 0]}
                          />
                          <Bar
                            dataKey="projected_premium_revenue"
                            name="Receita Assinaturas (Play Billing)"
                            fill="#c29337"
                            stackId="receita"
                            radius={[6, 6, 0, 0]}
                          />
                          <Bar
                            dataKey="projected_costs"
                            name="Custos Operacionais Totais"
                            fill="#ef4444"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="projected_net_profit"
                            name="Resultado Operacional Líquido"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      ) : (
                        <AreaChart data={simulationResult.twelve_months_projection}>
                          <defs>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis
                            dataKey="month"
                            stroke="#64748b"
                            tickFormatter={(m) => `Mês ${m}`}
                          />
                          <YAxis
                            stroke="#64748b"
                            tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#020617',
                              borderColor: '#1e293b',
                              borderRadius: '1rem',
                              fontSize: '12px',
                            }}
                            formatter={(val: any) => [
                              `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                            ]}
                            labelFormatter={(label) => `Projeção Mês ${label}`}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                          <Area
                            type="monotone"
                            dataKey="projected_total_revenue"
                            name="Receita Total Mensal"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fillOpacity={0.1}
                            fill="#3b82f6"
                          />
                          <Area
                            type="monotone"
                            dataKey="projected_net_profit"
                            name="Lucro Líquido Mensal"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorProfit)"
                          />
                          <Area
                            type="monotone"
                            dataKey="projected_cumulative_profit"
                            name="Lucro Acumulado (Cashflow)"
                            stroke="#a855f7"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#colorCumulative)"
                          />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                      Gerando projeção dos 12 meses...
                    </div>
                  )}
                </div>
              </div>

              {/* 12 Months Projection Detailed Table */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-400" />
                      <span>Tabela Detalhada de Projeção Financeira Mês a Mês</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Break-even, Custos e Lucro Acumulado
                    </span>
                  </div>

                  <button
                    onClick={handleExportProjectionsCsv}
                    title="Exportar projeções de 12 meses para CSV"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-950 hover:bg-slate-800 text-brand-400 border border-slate-800 transition-colors self-start sm:self-auto"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Tabela (CSV)</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2.5">Mês</th>
                        <th className="px-3 py-2.5">MAU</th>
                        <th className="px-3 py-2.5 text-blue-400">Ads (AdMob)</th>
                        <th className="px-3 py-2.5 text-brand-400">Assinaturas</th>
                        <th className="px-3 py-2.5 text-white font-bold">Faturamento</th>
                        <th className="px-3 py-2.5 text-rose-400">Custos</th>
                        <th className="px-3 py-2.5 text-emerald-400">Lucro Líquido</th>
                        <th className="px-3 py-2.5 text-purple-300">Lucro Acumulado</th>
                        <th className="px-3 py-2.5 text-center">Break-even</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {simulationResult?.twelve_months_projection.map((m) => {
                        const isProfitable = (m.projected_net_profit ?? 0) >= 0;
                        return (
                          <tr key={m.month} className="hover:bg-slate-800/40">
                            <td className="px-3 py-2 font-bold text-white">Mês {m.month}</td>
                            <td className="px-3 py-2 text-slate-300">{m.projected_mau.toLocaleString()}</td>
                            <td className="px-3 py-2 text-blue-300">
                              R$ {m.projected_ads_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 text-brand-300">
                              R$ {m.projected_premium_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 text-white font-extrabold bg-slate-950/40">
                              R$ {m.projected_total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 text-rose-300">
                              R$ {(m.projected_costs || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td
                              className={`px-3 py-2 font-bold ${
                                isProfitable ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isProfitable ? '+' : ''}
                              R$ {(m.projected_net_profit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td
                              className={`px-3 py-2 font-bold ${
                                (m.projected_cumulative_profit || 0) >= 0
                                  ? 'text-purple-300'
                                  : 'text-amber-400'
                              }`}
                            >
                              {(m.projected_cumulative_profit || 0) >= 0 ? '+' : ''}
                              R$ {(m.projected_cumulative_profit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {m.is_breakeven_reached ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                                  <Check className="w-3 h-3" />
                                  <span>Superávit</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                                  <span>Déficit</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* TAB: OVERVIEW & REAL FINANCIAL DATA                   */}
      {/* ======================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Row Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Receita Real Registrada</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-2 font-mono">
                {overview?.real_revenue_formatted || 'R$ 0,00'}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Total de transações confirmadas
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Assinaturas Ativas</span>
                <Crown className="w-4 h-4 text-brand-400" />
              </div>
              <div className="text-2xl font-extrabold text-white mt-2 font-mono">
                {overview?.active_subscriptions_count || 0}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {overview?.premium_users_count || 0} usuários premium totais
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Produtos Google Play</span>
                <Package className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-extrabold text-white mt-2 font-mono">
                {overview?.active_products_count || 0} / {overview?.total_products_count || 0}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Produtos ativos no catálogo
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Posicionamentos AdMob</span>
                <Layers className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-extrabold text-white mt-2 font-mono">
                {overview?.active_placements_count || 0} / {overview?.total_placements_count || 0}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Espaços de anúncios ativados
              </span>
            </div>
          </div>

          {/* Quick Actions to Other Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Produtos Google Play</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Crie, edite e gerencie o status (Ativar, Desativar ou Arquivar) dos seus SKUs de assinatura.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('products')}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-brand-500/20"
              >
                Gerenciar Catálogo
              </button>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Simulador Financeiro</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Projete o faturamento nos próximos 12 meses ajustando MAU, conversão e eCPM do AdMob.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('simulator')}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20"
              >
                Abrir Simulador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* TAB: PLACEMENTS                                       */}
      {/* ======================================================= */}
      {activeTab === 'placements' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Posicionamentos de anúncio AdMob configurados no aplicativo Android.
            </p>
            <button
              onClick={() => setShowAddPlacementModal(true)}
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs transition-colors shadow-md shadow-brand-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Posicionamento</span>
            </button>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Nome / Local</th>
                  <th className="px-4 py-3">Formato</th>
                  <th className="px-4 py-3">Provedor</th>
                  <th className="px-4 py-3">Ad Unit ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {placements.map((pl) => (
                  <tr key={pl.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-white">{pl.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                        {pl.format}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize">{pl.provider}</td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                      {pl.ad_unit_id_masked || 'ca-app-pub-3940...'}
                    </td>
                    <td className="px-4 py-3">
                      {pl.enabled ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                          ATIVO
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                          PAUSADO
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleTogglePlacement(pl)}
                        className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
                      >
                        {pl.enabled ? 'Pausar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => handleDeletePlacement(pl.id, pl.name)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold ml-2"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* TAB: SUBSCRIPTIONS                                     */}
      {/* ======================================================= */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-xs text-slate-400">
            Registro de assinaturas contratadas via Google Play Billing.
          </p>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Início</th>
                  <th className="px-4 py-3">Renovação / Fim</th>
                  <th className="px-4 py-3">Auto-Renovação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-white">{s.user_email || s.user_id}</td>
                    <td className="px-4 py-3 text-brand-300 font-medium">{s.product_title || s.product_id}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {new Date(s.starts_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {s.renews_at
                        ? new Date(s.renews_at).toLocaleDateString('pt-BR')
                        : s.expires_at
                        ? new Date(s.expires_at).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {s.is_auto_renewing ? (
                        <span className="text-emerald-400">Sim</span>
                      ) : (
                        <span className="text-slate-500">Cancelada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* TAB: DIAGNOSTIC                                        */}
      {/* ======================================================= */}
      {activeTab === 'diagnostic' && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-xs text-slate-400">
            Status de prontidão técnica dos provedores de receita.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {diagnostics.map((d) => (
              <div
                key={d.provider}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">{d.category}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      d.status === 'configured'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {d.status === 'configured' ? 'Operacional' : 'Configuração Pendente'}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white">{d.provider}</h4>
                <p className="text-xs text-slate-300">{d.details}</p>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                  <strong className="text-slate-300 block mb-0.5">Recomendação:</strong>
                  {d.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: CREATE / EDIT PRODUCT GOOGLE PLAY                */}
      {/* ======================================================= */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-500/10 border border-brand-500/20 rounded-2xl text-brand-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isEditingProduct ? 'Editar Produto Google Play' : 'Novo Produto Google Play'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mapeamento com SKU e Base Plan ID do Google Play Console
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowProductModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Quick Preset Templates */}
              {!isEditingProduct && (
                <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                    <span>Templates Rápidos para Google Play Console:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentProductForm({
                          ...currentProductForm,
                          product_type: 'subs',
                          title: 'Assinatura Mensal Premium',
                          product_id: 'subs_monthly_premium',
                          base_plan_id: 'p1m',
                          offer_id: '',
                          reference_price: 'R$ 14,90/mês',
                          entitlements: ['premium', 'ad_free', 'exclusive_devotionals'],
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-[11px] font-medium transition-colors"
                    >
                      + Assinatura Mensal
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentProductForm({
                          ...currentProductForm,
                          product_type: 'subs',
                          title: 'Assinatura Anual Premium',
                          product_id: 'subs_annual_premium',
                          base_plan_id: 'p1y',
                          offer_id: 'free_trial_7d',
                          reference_price: 'R$ 99,90/ano',
                          entitlements: ['premium', 'ad_free', 'exclusive_devotionals', 'audio_bible'],
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-[11px] font-medium transition-colors"
                    >
                      + Assinatura Anual (Trial)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentProductForm({
                          ...currentProductForm,
                          product_type: 'inapp',
                          title: 'Pack Devocionais Completo',
                          product_id: 'inapp_devotional_pack_lifetime',
                          base_plan_id: '',
                          offer_id: '',
                          reference_price: 'R$ 49,90',
                          entitlements: ['devotionals_lifetime'],
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-[11px] font-medium transition-colors"
                    >
                      + In-App Vitalício
                    </button>
                  </div>
                </div>
              )}

              {/* Product Type & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Tipo de Produto *</label>
                  <select
                    value={currentProductForm.product_type}
                    onChange={(e) =>
                      setCurrentProductForm({
                        ...currentProductForm,
                        product_type: e.target.value as 'subs' | 'inapp',
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="subs">Assinatura Google Play (subs)</option>
                    <option value="inapp">Produto In-App Único (inapp)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Status Inicial</label>
                  <select
                    value={currentProductForm.status}
                    onChange={(e) =>
                      setCurrentProductForm({
                        ...currentProductForm,
                        status: e.target.value as 'active' | 'inactive' | 'archived',
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="active">Ativo (visível e vendável)</option>
                    <option value="inactive">Inativo (pausado)</option>
                    <option value="archived">Arquivado</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Título Comercial *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Assinatura Mensal Premium"
                  value={currentProductForm.title}
                  onChange={(e) =>
                    setCurrentProductForm({ ...currentProductForm, title: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Product SKU & Reference Price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Google Play SKU / Product ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: premium_sub_monthly"
                    value={currentProductForm.product_id}
                    onChange={(e) =>
                      setCurrentProductForm({ ...currentProductForm, product_id: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Preço de Referência</label>
                  <input
                    type="text"
                    placeholder="Ex: R$ 14,90/mês"
                    value={currentProductForm.reference_price}
                    onChange={(e) =>
                      setCurrentProductForm({ ...currentProductForm, reference_price: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Base Plan ID & Offer ID (for Subs) */}
              {currentProductForm.product_type === 'subs' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-medium">Base Plan ID</label>
                    <input
                      type="text"
                      placeholder="Ex: p1m, p1y"
                      value={currentProductForm.base_plan_id}
                      onChange={(e) =>
                        setCurrentProductForm({
                          ...currentProductForm,
                          base_plan_id: e.target.value,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 font-medium">Offer ID (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: free-trial-7d"
                      value={currentProductForm.offer_id}
                      onChange={(e) =>
                        setCurrentProductForm({
                          ...currentProductForm,
                          offer_id: e.target.value,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Descrição dos Benefícios</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Acesso total a todos os devocionais, áudio ilimitado e sem anúncios."
                  value={currentProductForm.description}
                  onChange={(e) =>
                    setCurrentProductForm({ ...currentProductForm, description: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Entitlements Tags Management */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium block">
                  Direitos / Entitlements Concedidos
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Adicionar entitlement (ex: ad_free, premium, audio)"
                    value={newEntitlementInput}
                    onChange={(e) => setNewEntitlementInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEntitlement();
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddEntitlement}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold shrink-0"
                  >
                    Adicionar
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentProductForm.entitlements.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-xl bg-brand-500/10 text-brand-300 border border-brand-500/20"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEntitlement(tag)}
                        className="hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingProduct}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold rounded-xl disabled:opacity-50 transition-all shadow-md shadow-brand-500/20"
                >
                  {submittingProduct
                    ? 'Salvando...'
                    : isEditingProduct
                    ? 'Salvar Alterações'
                    : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: CREATE PLACEMENT                                */}
      {/* ======================================================= */}
      {showAddPlacementModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Novo Posicionamento de Anúncio</h3>
              <button
                onClick={() => setShowAddPlacementModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlacement} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Nome Identificador *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: interstitial_after_reading"
                  value={newPlacement.name}
                  onChange={(e) => setNewPlacement({ ...newPlacement, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Provedor</label>
                  <select
                    value={newPlacement.provider}
                    onChange={(e) => setNewPlacement({ ...newPlacement, provider: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="admob">Google AdMob</option>
                    <option value="custom">Custom Network</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Formato</label>
                  <select
                    value={newPlacement.format}
                    onChange={(e) => setNewPlacement({ ...newPlacement, format: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="interstitial">Intersticial (Tela Cheia)</option>
                    <option value="banner">Banner Adaptativo</option>
                    <option value="rewarded">Vídeo Recompensado</option>
                    <option value="native">Nativo Avançado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Ad Unit ID Mascarado / Referência</label>
                <input
                  type="text"
                  value={newPlacement.ad_unit_id_masked}
                  onChange={(e) =>
                    setNewPlacement({ ...newPlacement, ad_unit_id_masked: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Intervalo Mínimo (segundos)</label>
                  <input
                    type="number"
                    min={0}
                    value={newPlacement.min_interval_seconds}
                    onChange={(e) =>
                      setNewPlacement({
                        ...newPlacement,
                        min_interval_seconds: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Máximo por Sessão</label>
                  <input
                    type="number"
                    min={1}
                    value={newPlacement.max_per_session}
                    onChange={(e) =>
                      setNewPlacement({
                        ...newPlacement,
                        max_per_session: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="free_only"
                  checked={newPlacement.free_only}
                  onChange={(e) =>
                    setNewPlacement({ ...newPlacement, free_only: e.target.checked })
                  }
                  className="accent-brand-500 rounded"
                />
                <label htmlFor="free_only" className="text-slate-300 cursor-pointer">
                  Exibir apenas para usuários gratuitos (Bloquear para Premium)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPlacementModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPlacement}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold rounded-xl disabled:opacity-50"
                >
                  {submittingPlacement ? 'Cadastrando...' : 'Cadastrar Posicionamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonetizationHub;
