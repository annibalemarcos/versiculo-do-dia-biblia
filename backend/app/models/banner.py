from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey
from app.core.database import Base
from app.models.base import generate_uuid, utc_now, TimestampMixin

class Banner(Base, TimestampMixin):
    __tablename__ = "banners"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    app_id = Column(String(50), ForeignKey("apps.id", ondelete="CASCADE"), default="verse_daily", nullable=False, index=True)
    title = Column(String(200), nullable=False)
    subtitle = Column(String(300), nullable=True)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    badge_text = Column(String(50), nullable=True)  # e.g., "NOVO", "DESTAQUE", "OFERTA", "AVISO"
    
    # Placements: home_top, home_middle, home_bottom, reading_screen, daily_verse, modal_announcement, profile_screen, custom
    placement = Column(String(100), default="home_top", nullable=False, index=True)
    
    # Target audience: all, free_only, premium_only, anonymous_only, registered_only
    target_audience = Column(String(50), default="all", nullable=False, index=True)
    
    # Action type: open_url, internal_route, show_modal, dismiss, copy_text
    action_type = Column(String(50), default="open_url", nullable=False)
    action_url = Column(String(500), nullable=True)
    action_label = Column(String(100), default="Saiba Mais", nullable=True)
    secondary_action_label = Column(String(100), nullable=True)
    
    # Precedence & Status
    priority = Column(Integer, default=10, nullable=False, index=True)  # Higher number = higher priority
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # Scheduling
    starts_at = Column(DateTime, nullable=True, index=True)
    expires_at = Column(DateTime, nullable=True, index=True)
    
    # Display configuration
    dismissible = Column(Boolean, default=True, nullable=False)
    bg_color = Column(String(50), nullable=True)  # Optional custom hex or gradient preset
    text_color = Column(String(50), nullable=True)
    
    # Metrics
    max_impressions = Column(Integer, nullable=True)  # null = unlimited
    impression_count = Column(Integer, default=0, nullable=False)
    click_count = Column(Integer, default=0, nullable=False)
    
    created_by = Column(String(100), nullable=True)
