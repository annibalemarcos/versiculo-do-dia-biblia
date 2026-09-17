from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import generate_uuid, utc_now, TimestampMixin

class SupportTicket(Base, TimestampMixin):
    __tablename__ = "support_tickets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_number = Column(String(20), unique=True, index=True, nullable=False)  # e.g., "TKT-000001"
    app_id = Column(String(50), ForeignKey("apps.id", ondelete="CASCADE"), default="verse_daily", nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    guest_email = Column(String(255), nullable=True, index=True)
    guest_name = Column(String(150), nullable=True)
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), default="OTHER", nullable=False, index=True)  # TECHNICAL, ACCOUNT, PREMIUM_PAYMENT, ADS, CONTENT, SUGGESTION, OTHER
    priority = Column(String(20), default="NORMAL", nullable=False, index=True)  # LOW, NORMAL, HIGH, URGENT
    status = Column(String(30), default="OPEN", nullable=False, index=True)  # OPEN, IN_PROGRESS, WAITING_USER, RESOLVED, CLOSED
    assigned_admin_id = Column(String(36), ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True, index=True)
    first_response_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    # Relationships
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketMessage.created_at")
    attachments = relationship("TicketAttachment", back_populates="ticket", cascade="all, delete-orphan")
    history = relationship("TicketHistory", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketHistory.created_at")
    participants = relationship("TicketParticipant", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketParticipant.created_at")
    user = relationship("User", foreign_keys=[user_id])
    assigned_admin = relationship("AdminUser", foreign_keys=[assigned_admin_id])
    app = relationship("App")

class TicketMessage(Base, TimestampMixin):
    __tablename__ = "ticket_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id = Column(String(36), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_type = Column(String(20), nullable=False, index=True)  # USER, ADMIN, SYSTEM
    sender_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    sender_admin_id = Column(String(36), ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True)
    sender_name = Column(String(150), nullable=True)
    message = Column(Text, nullable=False)
    is_internal_note = Column(Boolean, default=False, nullable=False, index=True)

    # Relationships
    ticket = relationship("SupportTicket", back_populates="messages")
    attachments = relationship("TicketAttachment", back_populates="message")

class TicketAttachment(Base):
    __tablename__ = "ticket_attachments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id = Column(String(36), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    message_id = Column(String(36), ForeignKey("ticket_messages.id", ondelete="SET NULL"), nullable=True, index=True)
    file_name = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)  # in bytes
    storage_reference = Column(Text, nullable=False)  # URL or relative path/blob key
    uploaded_by = Column(String(50), default="USER", nullable=False)  # USER, ADMIN
    created_at = Column(DateTime, default=utc_now, nullable=False)

    ticket = relationship("SupportTicket", back_populates="attachments")
    message = relationship("TicketMessage", back_populates="attachments")

class TicketHistory(Base):
    __tablename__ = "ticket_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id = Column(String(36), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(100), nullable=False)  # e.g., "created", "status_changed", "assigned", "priority_changed", "resolved", "closed"
    previous_value = Column(String(255), nullable=True)
    new_value = Column(String(255), nullable=True)
    admin_id = Column(String(36), ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    ticket = relationship("SupportTicket", back_populates="history")

class TicketParticipant(Base):
    __tablename__ = "ticket_participants"
    __table_args__ = (
        UniqueConstraint("ticket_id", "admin_id", name="uq_ticket_participant"),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id = Column(String(36), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    admin_id = Column(String(36), ForeignKey("admin_users.id", ondelete="CASCADE"), nullable=False, index=True)
    added_by_admin_id = Column(String(36), ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    ticket = relationship("SupportTicket", back_populates="participants")
    admin = relationship("AdminUser", foreign_keys=[admin_id])
    added_by_admin = relationship("AdminUser", foreign_keys=[added_by_admin_id])
