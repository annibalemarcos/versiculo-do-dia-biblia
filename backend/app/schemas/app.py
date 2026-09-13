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
    maintenance_message: Optional[str] = None
    minimum_supported_version: Optional[int] = None
    latest_version: Optional[int] = None
    force_update: Optional[bool] = None
    store_url: Optional[str] = None
    app_mode: Optional[str] = None
    custom_settings: Optional[Dict[str, Any]] = None

class AppConfigResponse(BaseModel):
    app_id: str
    maintenance_mode: bool
    maintenance_message: str
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
