from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class BannerBase(BaseModel):
    title: str = Field(..., max_length=200)
    subtitle: Optional[str] = Field(None, max_length=300)
    description: Optional[str] = None
    image_url: Optional[str] = Field(None, max_length=500)
    badge_text: Optional[str] = Field(None, max_length=50)
    placement: str = Field("home_top", max_length=100)
    target_audience: str = Field("all", max_length=50)
    action_type: str = Field("open_url", max_length=50)
    action_url: Optional[str] = Field(None, max_length=500)
    action_label: Optional[str] = Field("Saiba Mais", max_length=100)
    secondary_action_label: Optional[str] = Field(None, max_length=100)
    priority: int = Field(10, ge=1, le=1000)
    is_active: bool = True
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    dismissible: bool = True
    bg_color: Optional[str] = Field(None, max_length=50)
    text_color: Optional[str] = Field(None, max_length=50)
    max_impressions: Optional[int] = None

class BannerCreate(BannerBase):
    app_id: str = "verse_daily"

class BannerUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    subtitle: Optional[str] = Field(None, max_length=300)
    description: Optional[str] = None
    image_url: Optional[str] = Field(None, max_length=500)
    badge_text: Optional[str] = Field(None, max_length=50)
    placement: Optional[str] = Field(None, max_length=100)
    target_audience: Optional[str] = Field(None, max_length=50)
    action_type: Optional[str] = Field(None, max_length=50)
    action_url: Optional[str] = Field(None, max_length=500)
    action_label: Optional[str] = Field(None, max_length=100)
    secondary_action_label: Optional[str] = Field(None, max_length=100)
    priority: Optional[int] = Field(None, ge=1, le=1000)
    is_active: Optional[bool] = None
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    dismissible: Optional[bool] = None
    bg_color: Optional[str] = Field(None, max_length=50)
    text_color: Optional[str] = Field(None, max_length=50)
    max_impressions: Optional[int] = None

class BannerResponse(BannerBase):
    id: str
    app_id: str
    impression_count: int
    click_count: int
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BannerPublicItem(BaseModel):
    id: str
    app_id: str
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    badge_text: Optional[str] = None
    placement: str
    action_type: str
    action_url: Optional[str] = None
    action_label: Optional[str] = "Saiba Mais"
    secondary_action_label: Optional[str] = None
    priority: int
    dismissible: bool
    bg_color: Optional[str] = None
    text_color: Optional[str] = None

    class Config:
        from_attributes = True
