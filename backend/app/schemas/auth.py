from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in_seconds: int
    user: "AdminUserSummary"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class PermissionSummary(BaseModel):
    id: str
    name: str
    module: str
    description: Optional[str] = None

class RoleSummary(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_system: bool = False
    department: str = "general"
    hierarchy_level: int = 1
    is_department_master: bool = False
    can_manage_staff: bool = False
    requires_master_approval: bool = False
    parent_role_id: Optional[str] = None
    permissions: List[str] = []

class AdminUserSummary(BaseModel):
    id: str
    email: str
    name: str
    is_active: bool
    is_super_admin: bool
    department: str = "general"
    approval_status: str = "APPROVED"
    roles: List[str] = []
    role_ids: List[str] = []
    permissions: List[str] = []
    last_login_at: Optional[datetime] = None

class AdminUserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    roles: List[str]
    department: Optional[str] = "general"
    is_active: bool = True
    reason: Optional[str] = None  # Needed if created as a request by department master

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    roles: Optional[List[str]] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None

class RoleCreate(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    department: str = "general"
    hierarchy_level: int = 1
    is_department_master: bool = False
    can_manage_staff: bool = False
    requires_master_approval: bool = False
    parent_role_id: Optional[str] = None
    permissions: List[str] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    hierarchy_level: Optional[int] = None
    is_department_master: Optional[bool] = None
    can_manage_staff: Optional[bool] = None
    requires_master_approval: Optional[bool] = None
    parent_role_id: Optional[str] = None
    permissions: Optional[List[str]] = None

class StaffChangeRequestCreate(BaseModel):
    request_type: str  # CREATE_STAFF, CHANGE_ROLE, PROMOTE, DEMOTE, CHANGE_DEPARTMENT, MAKE_DEPARTMENT_MASTER
    target_user_id: Optional[str] = None
    target_user_email: Optional[str] = None
    target_user_name: Optional[str] = None
    target_password: Optional[str] = None
    requested_role_id: Optional[str] = None
    requested_department: Optional[str] = None
    requested_permissions: Optional[List[str]] = None
    reason: str

class StaffChangeRequestReview(BaseModel):
    review_notes: Optional[str] = None

class StaffChangeRequestResponse(BaseModel):
    id: str
    request_type: str
    target_user_id: Optional[str] = None
    target_user_email: Optional[str] = None
    target_user_name: Optional[str] = None
    requested_role_id: Optional[str] = None
    requested_role_name: Optional[str] = None
    previous_role_id: Optional[str] = None
    previous_role_name: Optional[str] = None
    requested_department: Optional[str] = None
    requested_permissions: Optional[List[str]] = None
    requested_by_admin_id: Optional[str] = None
    requested_by_name: Optional[str] = None
    requested_by_email: Optional[str] = None
    reason: str
    status: str
    reviewed_by_admin_id: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    review_notes: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None

