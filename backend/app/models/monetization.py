from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Text, JSON, Numeric, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import generate_uuid, utc_now, TimestampMixin

class Entitlement(Base, TimestampMixin):
    __tablename__ = "entitlements"

    id = Column(String(50), primary_key=True)  # e.g., "premium", "ad_free", "offline_full", "unlimited_favorites", "premium_themes", "premium_devotionals", "exclusive_content"
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)

class PremiumProduct(Base, TimestampMixin):
    __tablename__ = "premium_products"

    id = Column(String(50), primary_key=True)  # e.g., "premium_monthly", "premium_yearly", "premium_lifetime"
    app_id = Column(String(50), ForeignKey("apps.id", ondelete="CASCADE"), default="verse_daily", nullable=False, index=True)
    product_id = Column(String(100), nullable=False)  # Google Play product ID
    base_plan_id = Column(String(100), nullable=True)  # Google Play base plan ID (e.g. "monthly-plan")
    offer_id = Column(String(100), nullable=True)
    product_type = Column(String(20), default="subs", nullable=False)  # "subs", "inapp"
    title = Column(String(150), nullable=False)
    description = Column(String(255), nullable=True)
    reference_price = Column(String(50), nullable=True)  # Informational reference price string e.g. "R$ 14,90/mês"
    status = Column(String(20), default="active", nullable=False)  # "active", "inactive", "archived"
    entitlements = Column(JSON, default=list, nullable=False)  # list of entitlement IDs

class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(50), ForeignKey("premium_products.id", ondelete="RESTRICT"), nullable=False, index=True)
    provider = Column(String(50), default="google_play", nullable=False)  # "google_play"
    status = Column(String(50), default="active", nullable=False, index=True)  # "pending", "active", "grace_period", "account_hold", "paused", "canceled", "expired", "revoked"
    order_id = Column(String(150), nullable=True, index=True)
    purchase_token_masked = Column(String(30), nullable=False)  # e.g., "...abcd" - never store/expose full raw token in clear
    starts_at = Column(DateTime, default=utc_now, nullable=False)
    renews_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True, index=True)
    is_auto_renewing = Column(Boolean, default=True, nullable=False)
    cancel_reason = Column(String(100), nullable=True)

    user = relationship("User", back_populates="subscriptions")
    product = relationship("PremiumProduct")

class Purchase(Base, TimestampMixin):
    __tablename__ = "purchases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(50), ForeignKey("premium_products.id", ondelete="RESTRICT"), nullable=False, index=True)
    provider = Column(String(50), default="google_play", nullable=False)
    order_id = Column(String(150), nullable=True, index=True)
    purchase_token_masked = Column(String(30), nullable=False)
    amount_cents = Column(Integer, nullable=True)  # e.g., 1490 for R$ 14,90
    currency = Column(String(10), default="BRL", nullable=True)
    status = Column(String(50), default="completed", nullable=False)  # "pending", "completed", "refunded", "failed"
    purchased_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    user = relationship("User", back_populates="purchases")
    product = relationship("PremiumProduct")

class BillingEvent(Base):
    __tablename__ = "billing_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=True, index=True)
    provider = Column(String(50), default="google_play", nullable=False)
    event_type = Column(String(100), nullable=False, index=True)  # e.g., "SUBSCRIPTION_PURCHASED", "SUBSCRIPTION_RENEWED", "SUBSCRIPTION_CANCELED", "RTDN_RECEIVED"
    payload_masked = Column(JSON, nullable=True)  # Sanitized payload without secrets
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

class AdPlacement(Base, TimestampMixin):
    __tablename__ = "ad_placements"
    __table_args__ = (UniqueConstraint('app_id', 'name', 'platform', name='uq_app_placement_platform'),)

    id = Column(String(36), primary_key=True, default=generate_uuid)
    app_id = Column(String(50), ForeignKey("apps.id", ondelete="CASCADE"), default="verse_daily", nullable=False, index=True)
    name = Column(String(100), nullable=False)  # e.g., "home_after_daily_verse", "explore_between_sections", "verse_bottom", "devotional_end"
    provider = Column(String(50), default="admob", nullable=False)  # "admob" (Android), "adsense" (Web)
    platform = Column(String(50), default="android", nullable=False)  # "android", "web", "all"
    ad_unit_id_masked = Column(String(100), nullable=True)  # e.g., "ca-app-pub-3940.../1234"
    format = Column(String(50), default="banner", nullable=False)  # "banner", "interstitial", "rewarded", "native"
    enabled = Column(Boolean, default=True, nullable=False)
    min_interval_seconds = Column(Integer, default=60, nullable=False)
    max_per_session = Column(Integer, default=5, nullable=False)
    free_only = Column(Boolean, default=True, nullable=False)  # Only shown to free users

class AdConfig(Base, TimestampMixin):
    __tablename__ = "ad_configs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    app_id = Column(String(50), ForeignKey("apps.id", ondelete="CASCADE"), default="verse_daily", unique=True, nullable=False, index=True)
    ads_global_enabled = Column(Boolean, default=True, nullable=False)
    admob_app_id_masked = Column(String(100), nullable=True)
    adsense_client_id_masked = Column(String(100), nullable=True)
    ump_consent_required = Column(Boolean, default=True, nullable=False)
    test_mode = Column(Boolean, default=False, nullable=False)

class AdminEntitlementGrant(Base, TimestampMixin):
    __tablename__ = "admin_entitlement_grants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    admin_id = Column(String(36), ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True, index=True)
    entitlement_id = Column(String(50), ForeignKey("entitlements.id", ondelete="RESTRICT"), nullable=False, index=True)
    reason = Column(String(255), nullable=False)  # e.g., "Suporte VIP", "Cortesia beta tester", "Resolução de chamado TKT-001"
    starts_at = Column(DateTime, default=utc_now, nullable=False)
    expires_at = Column(DateTime, nullable=True, index=True)  # None = permanente
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    revoked_at = Column(DateTime, nullable=True)
    revoked_reason = Column(String(255), nullable=True)
    revoked_by_admin_id = Column(String(36), ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User")
    admin = relationship("AdminUser", foreign_keys=[admin_id])
    revoked_by = relationship("AdminUser", foreign_keys=[revoked_by_admin_id])
    entitlement = relationship("Entitlement")

class FinancialScenario(Base, TimestampMixin):
    __tablename__ = "financial_scenarios"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    app_id = Column(String(50), ForeignKey("apps.id", ondelete="CASCADE"), default="verse_daily", nullable=False, index=True)
    name = Column(String(150), nullable=False)
    description = Column(String(255), nullable=True)
    created_by_admin_id = Column(String(36), ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True)
    parameters = Column(JSON, default=dict, nullable=False)
    projection_summary = Column(JSON, default=dict, nullable=False)

