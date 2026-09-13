from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import generate_uuid, utc_now, TimestampMixin

class NotificationTemplate(Base, TimestampMixin):
    __tablename__ = "notification_templates"

    id = Column(String(50), primary_key=True)  # e.g., "daily_verse_morning", "devotional_reminder"
    name = Column(String(150), nullable=False)
    title_template = Column(String(200), nullable=False)  # e.g., "Versículo do Dia: {{reference}}"
    body_template = Column(Text, nullable=False)  # e.g., "{{text}}"
    deep_link = Column(String(255), nullable=True)  # e.g., "app://verse/daily"
    language = Column(String(10), default="pt-BR", nullable=False)
    category = Column(String(50), default="daily", nullable=False)

class NotificationCampaign(Base, TimestampMixin):
    __tablename__ = "notification_campaigns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    app_id = Column(String(50), default="verse_daily", nullable=False, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    deep_link = Column(String(255), nullable=True)
    target_audience = Column(String(50), default="all", nullable=False)  # "all", "free_users", "premium_users", "inactive_7d"
    language = Column(String(10), default="pt-BR", nullable=False)
    status = Column(String(20), default="draft", nullable=False, index=True)  # "draft", "scheduled", "sending", "sent", "failed"
    scheduled_at = Column(DateTime, nullable=True, index=True)
    sent_at = Column(DateTime, nullable=True)
    target_count = Column(Integer, default=0, nullable=False)
    success_count = Column(Integer, default=0, nullable=False)
    failure_count = Column(Integer, default=0, nullable=False)
    error_summary = Column(Text, nullable=True)

class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    campaign_id = Column(String(36), ForeignKey("notification_campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), nullable=True, index=True)
    status = Column(String(20), default="sent", nullable=False)  # "sent", "delivered", "opened", "failed"
    delivered_at = Column(DateTime, default=utc_now, nullable=False)

class StaffNotification(Base):
    __tablename__ = "staff_notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recipient_admin_id = Column(String(36), ForeignKey("admin_users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)  # TICKET_ASSIGNED, TICKET_PARTICIPANT_ADDED, TICKET_NEW_MESSAGE, STAFF_REQUEST_CREATED, STAFF_REQUEST_APPROVED, STAFF_REQUEST_REJECTED, ROLE_CHANGE_APPROVED, ROLE_CHANGE_REJECTED, SYSTEM
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    target_type = Column(String(50), nullable=True)  # ticket, staff_request, admin_user
    target_id = Column(String(100), nullable=True)
    action_url = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    recipient = relationship("AdminUser", back_populates="notifications")

class StaffPushDevice(Base, TimestampMixin):
    __tablename__ = "staff_push_devices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    admin_id = Column(String(36), ForeignKey("admin_users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(Text, nullable=False, unique=True, index=True)
    provider = Column(String(50), default="webpush", nullable=False)  # "webpush", "fcm", "browser_native"
    platform = Column(String(50), default="web_desktop", nullable=False)  # "web_desktop", "web_mobile", "android", "ios"
    browser = Column(String(100), nullable=True)
    device_name = Column(String(150), nullable=True)
    endpoint = Column(Text, nullable=True)
    p256dh = Column(String(255), nullable=True)
    auth = Column(String(255), nullable=True)
    active = Column(Boolean, default=True, nullable=False, index=True)
    last_seen_at = Column(DateTime, default=utc_now, nullable=False)
    last_success_at = Column(DateTime, nullable=True)
    last_failure_at = Column(DateTime, nullable=True)
    failure_count = Column(Integer, default=0, nullable=False)
    last_error = Column(Text, nullable=True)

    admin = relationship("AdminUser", back_populates="push_devices")

class UserNotification(Base, TimestampMixin):
    __tablename__ = "user_notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)  # Null = Broadcast to all users
    app_id = Column(String(50), default="verse_daily", nullable=False, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="verse", nullable=False)  # "verse", "devotional", "reminder", "system"
    deep_link = Column(String(255), nullable=True)  # "daily_verse", "devotional", "explore"
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime, nullable=True)

class UserPushDevice(Base, TimestampMixin):
    __tablename__ = "user_push_devices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    app_id = Column(String(50), default="verse_daily", nullable=False, index=True)
    token = Column(Text, nullable=False, unique=True, index=True)
    platform = Column(String(50), default="android", nullable=False)  # "android", "ios", "web"
    device_name = Column(String(150), nullable=True)
    app_version = Column(String(50), nullable=True)
    active = Column(Boolean, default=True, nullable=False, index=True)
    last_seen_at = Column(DateTime, default=utc_now, nullable=False)
    last_success_at = Column(DateTime, nullable=True)
    last_failure_at = Column(DateTime, nullable=True)
    failure_count = Column(Integer, default=0, nullable=False)
    last_error = Column(Text, nullable=True)

    user = relationship("User")


