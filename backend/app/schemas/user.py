from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, EmailStr

class UserSummary(BaseModel):
    id: str
    email: Optional[str] = None
    name: Optional[str] = None
    platform: str
    language: str
    app_id: str
    is_anonymous: bool
    is_active: bool
    is_premium: bool
    premium_expires_at: Optional[datetime] = None
    last_seen_at: datetime
    created_at: datetime
    favorites_count: int = 0
    history_count: int = 0

class UserDetail(UserSummary):
    preferences: Optional[Dict[str, Any]] = None
    subscription_status: Optional[str] = None
    active_entitlements: List[str] = []

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    platform: str = "android"
    app_id: str = "verse_daily"

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in_seconds: int
    user: UserSummary

class FavoriteDto(BaseModel):
    verse_id: str
    reference: str
    text: str
    translation: str = "NVI"
    reflection: Optional[str] = None
    theme: Optional[str] = None
    saved_at: Optional[datetime] = None

class ReadingHistoryDto(BaseModel):
    verse_id: Optional[str] = None
    reference: str
    text: str
    translation: str = "NVI"
    read_at: Optional[datetime] = None

class PreferenceDto(BaseModel):
    theme_mode: str = "SYSTEM"  # LIGHT, DARK, SYSTEM
    text_scale: str = "NORMAL"  # SMALL, NORMAL, LARGE, EXTRA_LARGE
    preferred_translation: str = "NVI"
    notifications_enabled: bool = True
    notification_hour: int = 8
    notification_minute: int = 0
    custom_prefs: Dict[str, Any] = {}
