from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Text, JSON, Date, BigInteger, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import generate_uuid, utc_now, TimestampMixin

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_name = Column(String(100), nullable=False, index=True)  # "app_open", "verse_view", "daily_verse_view", "search", "favorite_add", etc.
    app_id = Column(String(50), default="verse_daily", nullable=False, index=True)
    platform = Column(String(50), default="android", nullable=False, index=True)
    user_id = Column(String(36), nullable=True, index=True)
    anonymous_session_id = Column(String(100), nullable=True, index=True)
    properties = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

class AnalyticsDailyAggregate(Base, TimestampMixin):
    __tablename__ = "analytics_daily_aggregates"
    __table_args__ = (UniqueConstraint('date', 'app_id', 'platform', name='uq_daily_aggregate_date_app_platform'),)

    id = Column(String(36), primary_key=True, default=generate_uuid)
    date = Column(Date, nullable=False, index=True)
    app_id = Column(String(50), default="verse_daily", nullable=False, index=True)
    platform = Column(String(50), default="android", nullable=False, index=True)

    # User Metrics
    dau = Column(Integer, default=0, nullable=False)
    wau = Column(Integer, default=0, nullable=False)
    mau = Column(Integer, default=0, nullable=False)
    new_users = Column(Integer, default=0, nullable=False)
    active_users = Column(Integer, default=0, nullable=False)
    total_users = Column(Integer, default=0, nullable=False)
    sessions_count = Column(Integer, default=0, nullable=False)

    # Content Engagement
    verse_views = Column(Integer, default=0, nullable=False)
    daily_verse_views = Column(Integer, default=0, nullable=False)
    favorites_added = Column(Integer, default=0, nullable=False)
    favorites_removed = Column(Integer, default=0, nullable=False)
    shares_count = Column(Integer, default=0, nullable=False)
    searches_count = Column(Integer, default=0, nullable=False)
    devotionals_started = Column(Integer, default=0, nullable=False)
    devotionals_completed = Column(Integer, default=0, nullable=False)

    # Monetization Metrics
    active_subscribers = Column(Integer, default=0, nullable=False)
    new_subscriptions = Column(Integer, default=0, nullable=False)
    canceled_subscriptions = Column(Integer, default=0, nullable=False)
    ad_requests = Column(Integer, default=0, nullable=False)
    ad_impressions = Column(Integer, default=0, nullable=False)
    ad_failures = Column(Integer, default=0, nullable=False)
    revenue_ads_cents = Column(BigInteger, default=0, nullable=False)
    revenue_premium_cents = Column(BigInteger, default=0, nullable=False)
    revenue_total_cents = Column(BigInteger, default=0, nullable=False)
    mrr_cents = Column(BigInteger, default=0, nullable=False)
    arr_cents = Column(BigInteger, default=0, nullable=False)

    # Top Content JSON summaries
    top_themes_json = Column(JSON, default=list, nullable=False)
    aggregated_emotions_json = Column(JSON, default=list, nullable=False)
