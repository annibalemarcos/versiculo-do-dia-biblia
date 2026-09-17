from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel

class AppCreate(BaseModel):
    id: str
    name: str
    package_id: str
    platform: str = "android"
    status: str = "active"
    default_language: str = "pt-BR"
    description: Optional[str] = None

class AppUpdate(BaseModel):
    name: Optional[str] = None
    package_id: Optional[str] = None
    platform: Optional[str] = None
    status: Optional[str] = None
    default_language: Optional[str] = None
    description: Optional[str] = None

class AppResponse(BaseModel):
    id: str
    name: str
    package_id: str
    platform: str
    status: str
    default_language: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class AppConfigUpdate(BaseModel):
    maintenance_mode: Optional[bool] = None
    maintenance_level: Optional[str] = None
    maintenance_title: Optional[str] = None
    maintenance_message: Optional[str] = None
    maintenance_estimated_end: Optional[datetime] = None
    registration_enabled: Optional[bool] = None
    authentication_system_enabled: Optional[bool] = None
    login_enabled: Optional[bool] = None
    local_auth_enabled: Optional[bool] = None
    google_auth_enabled: Optional[bool] = None
    google_auth_status: Optional[str] = None
    logout_enabled: Optional[bool] = None
    purchases_enabled: Optional[bool] = None
    premium_enabled: Optional[bool] = None
    notifications_enabled: Optional[bool] = None
    support_enabled: Optional[bool] = None
    cloud_sync_enabled: Optional[bool] = None
    devotionals_enabled: Optional[bool] = None
    search_enabled: Optional[bool] = None
    sharing_enabled: Optional[bool] = None
    offline_download_enabled: Optional[bool] = None
    google_login_enabled: Optional[bool] = None
    minimum_supported_version: Optional[int] = None
    latest_version: Optional[int] = None
    force_update: Optional[bool] = None
    store_url: Optional[str] = None
    app_mode: Optional[str] = None
    custom_settings: Optional[Dict[str, Any]] = None

class AppConfigResponse(BaseModel):
    app_id: str
    maintenance_mode: bool
    maintenance_level: str = "informational"
    maintenance_title: Optional[str] = None
    maintenance_message: str
    maintenance_estimated_end: Optional[datetime] = None
    registration_enabled: bool = True
    authentication_system_enabled: bool = True
    login_enabled: bool = True
    local_auth_enabled: bool = True
    google_auth_enabled: bool = False
    google_auth_status: str = "coming_soon"
    logout_enabled: bool = True
    purchases_enabled: bool = True
    premium_enabled: bool = True
    notifications_enabled: bool = True
    support_enabled: bool = True
    cloud_sync_enabled: bool = True
    devotionals_enabled: bool = True
    search_enabled: bool = True
    sharing_enabled: bool = True
    offline_download_enabled: bool = True
    google_login_enabled: bool = False
    updated_by: Optional[str] = None
    minimum_supported_version: int
    latest_version: int
    force_update: bool
    store_url: Optional[str] = None
    app_mode: str = "TEST"
    custom_settings: Dict[str, Any] = {}
    updated_at: datetime

class FeatureFlagCreate(BaseModel):
    app_id: str
    key: str
    enabled: bool = True
    platform: str = "all"
    description: Optional[str] = None
    rules: Optional[Dict[str, Any]] = None

class FeatureFlagUpdate(BaseModel):
    enabled: Optional[bool] = None
    platform: Optional[str] = None
    description: Optional[str] = None
    rules: Optional[Dict[str, Any]] = None

class FeatureFlagResponse(BaseModel):
    id: str
    app_id: str
    key: str
    enabled: bool
    platform: str
    description: Optional[str] = None
    rules: Optional[Dict[str, Any]] = None
    updated_at: datetime
