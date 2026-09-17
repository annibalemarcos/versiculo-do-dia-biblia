from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import generate_uuid, utc_now, TimestampMixin

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=True)
    username = Column(String(100), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=True)
    name = Column(String(150), nullable=True)
    platform = Column(String(50), default="android", nullable=False)  # "android", "ios", "web"
    language = Column(String(10), default="pt-BR", nullable=False)
    app_id = Column(String(50), default="verse_daily", nullable=False, index=True)
    is_anonymous = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    is_premium = Column(Boolean, default=False, nullable=False)
    premium_expires_at = Column(DateTime, nullable=True)
    last_seen_at = Column(DateTime, default=utc_now, nullable=False)
    device_id = Column(String(150), nullable=True, index=True)
    fcm_token = Column(String(255), nullable=True)
    custom_fields = Column(JSON, default=dict, nullable=False)

    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    reading_history = relationship("ReadingHistory", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    purchases = relationship("Purchase", back_populates="user", cascade="all, delete-orphan")

class Favorite(Base, TimestampMixin):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint('user_id', 'verse_id', name='uq_user_verse_favorite'),)

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    verse_id = Column(String(100), nullable=False, index=True)
    reference = Column(String(100), nullable=False)
    text = Column(Text, nullable=False)
    translation = Column(String(20), default="NVI", nullable=False)
    reflection = Column(Text, nullable=True)
    theme = Column(String(100), nullable=True)
    saved_at = Column(DateTime, default=utc_now, nullable=False)

    user = relationship("User", back_populates="favorites")

class ReadingHistory(Base):
    __tablename__ = "reading_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    verse_id = Column(String(100), nullable=True, index=True)
    reference = Column(String(100), nullable=False)
    text = Column(Text, nullable=False)
    translation = Column(String(20), default="NVI", nullable=False)
    read_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    user = relationship("User", back_populates="reading_history")

class UserPreference(Base, TimestampMixin):
    __tablename__ = "user_preferences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    theme_mode = Column(String(20), default="SYSTEM", nullable=False)  # "LIGHT", "DARK", "SYSTEM"
    text_scale = Column(String(20), default="NORMAL", nullable=False)  # "SMALL", "NORMAL", "LARGE", "EXTRA_LARGE"
    preferred_translation = Column(String(20), default="NVI", nullable=False)
    notifications_enabled = Column(Boolean, default=True, nullable=False)
    notification_hour = Column(Integer, default=8, nullable=False)
    notification_minute = Column(Integer, default=0, nullable=False)
    custom_prefs = Column(JSON, default=dict, nullable=False)

    user = relationship("User", back_populates="preferences")
