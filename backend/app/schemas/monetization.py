from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class EntitlementResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None

class PremiumProductCreate(BaseModel):
    id: str
    app_id: str = "verse_daily"
    product_id: str
    base_plan_id: Optional[str] = None
    offer_id: Optional[str] = None
    product_type: str = "subs"  # "subs", "inapp"
    title: str
    description: Optional[str] = None
    reference_price: Optional[str] = None
    status: str = "active"
    entitlements: List[str] = ["premium", "ad_free"]

class PremiumProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    reference_price: Optional[str] = None
    status: Optional[str] = None
    entitlements: Optional[List[str]] = None
    base_plan_id: Optional[str] = None
    offer_id: Optional[str] = None
    product_type: Optional[str] = None
    product_id: Optional[str] = None

class PremiumProductResponse(BaseModel):
    id: str
    app_id: str
    product_id: str
    base_plan_id: Optional[str] = None
    offer_id: Optional[str] = None
    product_type: str
    title: str
    description: Optional[str] = None
    reference_price: Optional[str] = None
    status: str
    entitlements: List[str]
    created_at: datetime
    updated_at: datetime

class AdPlacementCreate(BaseModel):
    app_id: str = "verse_daily"
    name: str
    provider: str = "admob"
    platform: str = "android"
    ad_unit_id_masked: Optional[str] = None
    format: str = "banner"
    enabled: bool = True
    min_interval_seconds: int = 60
    max_per_session: int = 5
    free_only: bool = True

class AdPlacementUpdate(BaseModel):
    provider: Optional[str] = None
    platform: Optional[str] = None
    ad_unit_id_masked: Optional[str] = None
    format: Optional[str] = None
    enabled: Optional[bool] = None
    min_interval_seconds: Optional[int] = None
    max_per_session: Optional[int] = None
    free_only: Optional[bool] = None

class AdPlacementResponse(BaseModel):
    id: str
    app_id: str
    name: str
    provider: str
    platform: str
    ad_unit_id_masked: Optional[str] = None
    format: str
    enabled: bool
    min_interval_seconds: int
    max_per_session: int
    free_only: bool
    created_at: datetime
    updated_at: datetime

class SubscriptionResponse(BaseModel):
    id: str
    user_id: str
    user_email: Optional[str] = None
    product_id: str
    product_title: Optional[str] = None
    provider: str
    status: str
    order_id: Optional[str] = None
    purchase_token_masked: str
    starts_at: datetime
    renews_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_auto_renewing: bool
    cancel_reason: Optional[str] = None

class TransactionResponse(BaseModel):
    id: str
    user_id: str
    user_email: Optional[str] = None
    product_id: str
    product_title: Optional[str] = None
    provider: str
    order_id: Optional[str] = None
    amount_cents: Optional[int] = None
    currency: Optional[str] = "BRL"
    status: str
    purchased_at: datetime

class SimulatorInput(BaseModel):
    dau: int = 15000
    mau: int = 45000
    avg_sessions_per_user_day: float = 2.5
    ad_impressions_per_session: float = 3.0
    ecpm_reais: float = 7.50
    premium_conversion_rate_pct: float = 2.2
    monthly_price_reais: float = 14.90
    annual_price_reais: float = 99.90
    annual_subscribers_pct: float = 40.0
    monthly_churn_pct: float = 5.0
    monthly_user_growth_pct: float = 10.0
    monthly_fixed_costs_reais: float = 3500.0  # Custos de infra, servidores, APIs e suporte
    customer_acquisition_cost_reais: float = 15.0  # CAC por assinante adquirido
    google_play_fee_pct: float = 15.0  # Taxa Google Play (15% tier desenvolvedores)

class MonthProjection(BaseModel):
    month: int
    projected_mau: int
    projected_ads_revenue: float
    projected_premium_revenue: float
    projected_total_revenue: float
    projected_mrr: float
    projected_costs: float = 0.0
    projected_net_profit: float = 0.0
    projected_cumulative_profit: float = 0.0
    is_breakeven_reached: bool = False

class SimulatorOutput(BaseModel):
    is_simulation: bool = True
    label: str = "SIMULAÇÃO / PROJEÇÃO (NÃO SÃO DADOS REAIS)"
    estimated_monthly_ad_impressions: int
    estimated_monthly_ads_revenue: float
    estimated_paying_users: int
    estimated_mrr: float
    estimated_arr: float
    estimated_monthly_premium_revenue: float
    estimated_monthly_total_revenue: float
    estimated_arpu: float
    estimated_arppu: float
    # Cálculos avançados de LTV
    subscriber_lifespan_months: float
    estimated_ltv_subscriber: float
    estimated_ltv_blended: float
    ltv_to_cac_ratio: float
    cac_payback_months: float
    # Cálculos de Break-even & Custos
    monthly_fixed_costs: float
    monthly_estimated_costs: float
    break_even_subscribers_needed: int
    break_even_revenue_needed: float
    estimated_monthly_net_profit: float
    break_even_month: Optional[int] = None
    is_currently_profitable: bool = False
    twelve_months_projection: List[MonthProjection]

class DiagnosticItem(BaseModel):
    category: str
    provider: str
    status: str  # "configured", "external_config_required", "disabled"
    details: str
    recommendation: str

class MonetizationDiagnosticResponse(BaseModel):
    overall_status: str
    items: List[DiagnosticItem]

class ScenarioCreate(BaseModel):
    name: str
    description: Optional[str] = None
    parameters: Dict[str, Any] = {}
    projection_summary: Dict[str, Any] = {}
    app_id: str = "verse_daily"
