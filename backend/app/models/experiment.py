from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Text, JSON, Float
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import generate_uuid, utc_now, TimestampMixin

class Experiment(Base, TimestampMixin):
    __tablename__ = "experiments"

    id = Column(String(50), primary_key=True)  # e.g., "paywall_headline_test", "onboarding_flow_v2"
    app_id = Column(String(50), default="verse_daily", nullable=False, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="draft", nullable=False, index=True)  # "draft", "running", "paused", "concluded"
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    target_metric = Column(String(100), default="purchase_completed", nullable=False)

    variants = relationship("ExperimentVariant", back_populates="experiment", cascade="all, delete-orphan")

class ExperimentVariant(Base, TimestampMixin):
    __tablename__ = "experiment_variants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    experiment_id = Column(String(50), ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False, index=True)
    key = Column(String(50), nullable=False)  # "variant_a", "variant_b"
    name = Column(String(100), nullable=False)
    traffic_percentage = Column(Integer, default=50, nullable=False)
    config_json = Column(JSON, default=dict, nullable=False)  # e.g., {"headline": "...", "cta": "..."}
    impressions_count = Column(Integer, default=0, nullable=False)
    conversions_count = Column(Integer, default=0, nullable=False)

    experiment = relationship("Experiment", back_populates="variants")

class ExperimentAssignment(Base):
    __tablename__ = "experiment_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    experiment_id = Column(String(50), ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), nullable=True, index=True)
    anonymous_id = Column(String(100), nullable=False, index=True)
    variant_key = Column(String(50), nullable=False)
    assigned_at = Column(DateTime, default=utc_now, nullable=False)

class SystemHealthEvent(Base):
    __tablename__ = "system_health_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    component = Column(String(50), nullable=False, index=True)  # "api", "database", "billing", "rtdn", "admob", "ump", "push", "jobs"
    status = Column(String(20), nullable=False, index=True)  # "healthy", "degraded", "unavailable", "not_configured"
    response_time_ms = Column(Integer, nullable=True)
    message = Column(String(255), nullable=True)
    details = Column(JSON, nullable=True)
    checked_at = Column(DateTime, default=utc_now, nullable=False, index=True)
