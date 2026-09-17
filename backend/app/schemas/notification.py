from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class TemplateCreate(BaseModel):
    id: str
    name: str
    title_template: str
    body_template: str
    deep_link: Optional[str] = None
    language: str = "pt-BR"
    category: str = "daily"

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    title_template: Optional[str] = None
    body_template: Optional[str] = None
    deep_link: Optional[str] = None
    language: Optional[str] = None
    category: Optional[str] = None

class TemplateResponse(BaseModel):
    id: str
    name: str
    title_template: str
    body_template: str
    deep_link: Optional[str] = None
    language: str
    category: str
    created_at: datetime
    updated_at: datetime

class CampaignCreate(BaseModel):
    app_id: str = "verse_daily"
    title: str
    message: str
    deep_link: Optional[str] = None
    target_audience: str = "all"
    language: str = "pt-BR"
    scheduled_at: Optional[datetime] = None

class CampaignResponse(BaseModel):
    id: str
    app_id: str
    title: str
    message: str
    deep_link: Optional[str] = None
    target_audience: str
    language: str
    status: str
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    target_count: int
    success_count: int
    failure_count: int
    error_summary: Optional[str] = None
    created_at: datetime

class StaffNotificationItem(BaseModel):
    id: str
    recipient_admin_id: str
    type: str
    title: str
    message: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    action_url: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class StaffNotificationUnreadCount(BaseModel):
    unread_count: int

class StaffDeviceRegisterRequest(BaseModel):
    token: str
    provider: str = "webpush"  # "webpush", "fcm", "browser_native"
    platform: str = "web_desktop"  # "web_desktop", "web_mobile", "android"
    browser: Optional[str] = None
    device_name: Optional[str] = None
    endpoint: Optional[str] = None
    p256dh: Optional[str] = None
    auth: Optional[str] = None

class StaffDeviceResponse(BaseModel):
    id: str
    admin_id: str
    token_masked: str
    provider: str
    platform: str
    browser: Optional[str] = None
    device_name: Optional[str] = None
    active: bool
    last_seen_at: datetime
    last_success_at: Optional[datetime] = None
    last_failure_at: Optional[datetime] = None
    failure_count: int
    last_error: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TestPushRequest(BaseModel):
    title: Optional[str] = "Teste de Notificação Push"
    message: Optional[str] = "As notificações deste navegador estão funcionando perfeitamente! 🔔"
    action_url: Optional[str] = "/notifications"

class PushDiagnosticsResponse(BaseModel):
    provider: str
    is_configured: bool
    service_worker_ready: bool
    registered_devices_count: int
    active_devices_count: int
    devices: List[StaffDeviceResponse]
    last_push_type: Optional[str] = None
    last_push_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    last_error: Optional[str] = None
    fcm_configured: bool

class UserTestPushRequest(BaseModel):
    title: Optional[str] = "🔔 Versículo do Dia - Mensagem Especial"
    message: Optional[str] = "O Senhor é o meu pastor; de nada terei falta. (Salmos 23:1)"
    deep_link: Optional[str] = "daily_verse"
    token: Optional[str] = None
    user_id: Optional[str] = None
    app_id: Optional[str] = "verse_daily"

class ScheduledProcessResponse(BaseModel):
    success: bool
    processed_count: int
    message: Optional[str] = None


