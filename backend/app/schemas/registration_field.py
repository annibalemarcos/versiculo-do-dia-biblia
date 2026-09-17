from typing import Optional, List, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field

class RegistrationFieldPublicDto(BaseModel):
    id: str
    field_key: str
    label: str
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    field_type: str  # "text", "number", "phone", "date", "select", "multiselect", "boolean", "textarea"
    options: Optional[List[Any]] = None
    is_required: bool
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    regex_pattern: Optional[str] = None
    error_message: Optional[str] = None
    display_order: int = 0
    show_in_profile: bool = True

    class Config:
        from_attributes = True

class RegistrationFieldAdminDto(RegistrationFieldPublicDto):
    app_id: str
    is_active: bool
    show_in_export: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RegistrationFieldCreatePayload(BaseModel):
    app_id: str = "verse_daily"
    field_key: str = Field(..., min_length=2, max_length=50)
    label: str = Field(..., min_length=1, max_length=150)
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    field_type: str = "text"
    options: Optional[List[Any]] = None
    is_required: bool = False
    is_active: bool = True
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    regex_pattern: Optional[str] = None
    error_message: Optional[str] = None
    display_order: int = 0
    show_in_profile: bool = True
    show_in_export: bool = True

class RegistrationFieldUpdatePayload(BaseModel):
    label: Optional[str] = None
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    field_type: Optional[str] = None
    options: Optional[List[Any]] = None
    is_required: Optional[bool] = None
    is_active: Optional[bool] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    regex_pattern: Optional[str] = None
    error_message: Optional[str] = None
    display_order: Optional[int] = None
    show_in_profile: Optional[bool] = None
    show_in_export: Optional[bool] = None

class RegistrationFieldOrderItem(BaseModel):
    id: str
    display_order: int

class RegistrationFieldReorderPayload(BaseModel):
    items: List[RegistrationFieldOrderItem]
