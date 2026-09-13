from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import generate_uuid, utc_now, TimestampMixin

class App(Base, TimestampMixin):
    __tablename__ = "apps"

    id = Column(String(50), primary_key=True)  # e.g., "verse_daily", "daily_devotional", "kids_bible"
    name = Column(String(150), nullable=False)
    package_id = Column(String(150), unique=True, nullable=False)  # e.g., "com.aistudio.biblia.qxudqu"
    platform = Column(String(50), default="android", nullable=False)  # "android", "ios", "web"
    status = Column(String(20), default="active", nullable=False)  # "active", "maintenance", "archived"
    default_language = Column(String(10), default="pt-BR", nullable=False)
    description = Column(String(255), nullable=True)

    configs = relationship("AppConfig", back_populates="app", cascade="all, delete-orphan")
    feature_flags = relationship("FeatureFlag", back_populates="app", cascade="all, delete-orphan")

class AppConfig(Base, TimestampMixin):
    __tablename__ = "app_configs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    app_id = Column(String(50), ForeignKey("apps.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    maintenance_mode = Column(Boolean, default=False, nullable=False)
    maintenance_message = Column(String(255), default="Estamos em manutenção para melhorias. Voltamos em breve.", nullable=False)
    minimum_supported_version = Column(Integer, default=1, nullable=False)
    latest_version = Column(Integer, default=1, nullable=False)
    force_update = Column(Boolean, default=False, nullable=False)
    store_url = Column(String(255), nullable=True)
    app_mode = Column(String(20), default="TEST", nullable=False)
    custom_settings = Column(JSON, default=dict, nullable=False)

    app = relationship("App", back_populates="configs")

class FeatureFlag(Base, TimestampMixin):
    __tablename__ = "feature_flags"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    app_id = Column(String(50), ForeignKey("apps.id", ondelete="CASCADE"), nullable=False, index=True)
    key = Column(String(100), nullable=False, index=True)  # e.g., "ads_global", "admob", "premium_paywall"
    enabled = Column(Boolean, default=True, nullable=False)
    platform = Column(String(50), default="all", nullable=False)  # "all", "android", "ios", "web"
    description = Column(String(255), nullable=True)
    rules = Column(JSON, default=dict, nullable=True)

    app = relationship("App", back_populates="feature_flags")
