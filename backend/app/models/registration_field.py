from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import generate_uuid, TimestampMixin

class RegistrationFieldDefinition(Base, TimestampMixin):
    __tablename__ = "registration_field_definitions"
    __table_args__ = (
        UniqueConstraint("app_id", "field_key", name="uq_app_registration_field_key"),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    app_id = Column(String(50), ForeignKey("apps.id", ondelete="CASCADE"), nullable=False, index=True, default="verse_daily")
    field_key = Column(String(50), nullable=False, index=True)
    label = Column(String(150), nullable=False)
    placeholder = Column(String(200), nullable=True)
    help_text = Column(String(255), nullable=True)
    field_type = Column(String(30), default="text", nullable=False)  # "text", "number", "phone", "date", "select", "multiselect", "boolean", "textarea"
    options = Column(JSON, nullable=True)  # List of allowed options or {value, label} for select/multiselect
    is_required = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    min_length = Column(Integer, nullable=True)
    max_length = Column(Integer, nullable=True)
    regex_pattern = Column(String(255), nullable=True)
    error_message = Column(String(255), nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    show_in_profile = Column(Boolean, default=True, nullable=False)
    show_in_export = Column(Boolean, default=True, nullable=False)

    app = relationship("App")
