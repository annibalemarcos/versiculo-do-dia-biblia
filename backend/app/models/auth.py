from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, JSON, Table, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import generate_uuid, utc_now, TimestampMixin

class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id = Column(String(50), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id = Column(String(100), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

class AdminUserRole(Base):
    __tablename__ = "admin_user_roles"

    admin_user_id = Column(String(36), ForeignKey("admin_users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(String(50), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String(100), primary_key=True)  # e.g., "content.write", "users.read"
    name = Column(String(150), nullable=False)
    module = Column(String(50), nullable=False)  # e.g., "content", "users", "monetization"
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    roles = relationship("Role", secondary="role_permissions", back_populates="permissions")

class Role(Base, TimestampMixin):
    __tablename__ = "roles"

    id = Column(String(50), primary_key=True)  # e.g., "super_admin", "admin", "editor", "analyst", "support"
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    is_system = Column(Boolean, default=False, nullable=False)
    department = Column(String(50), default="general", nullable=False, index=True)  # content, monetization, support, management, general
    hierarchy_level = Column(Integer, default=1, nullable=False, index=True)  # 1=Staff, 2=Department Master, 3=Admin Master
    is_department_master = Column(Boolean, default=False, nullable=False)
    can_manage_staff = Column(Boolean, default=False, nullable=False)
    requires_master_approval = Column(Boolean, default=False, nullable=False)
    parent_role_id = Column(String(50), ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)

    permissions = relationship("Permission", secondary="role_permissions", back_populates="roles")
    admin_users = relationship("AdminUser", secondary="admin_user_roles", back_populates="roles")

class AdminUser(Base, TimestampMixin):
    __tablename__ = "admin_users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_super_admin = Column(Boolean, default=False, nullable=False)
    department = Column(String(50), default="general", nullable=False, index=True)
    approval_status = Column(String(20), default="APPROVED", nullable=False, index=True)  # APPROVED, PENDING, REJECTED
    last_login_at = Column(DateTime, nullable=True)

    roles = relationship("Role", secondary="admin_user_roles", back_populates="admin_users")
    audit_logs = relationship("AdminAuditLog", back_populates="admin_user")
    notifications = relationship("StaffNotification", back_populates="recipient", cascade="all, delete-orphan")
    push_devices = relationship("StaffPushDevice", back_populates="admin", cascade="all, delete-orphan")

class StaffChangeRequest(Base, TimestampMixin):
    __tablename__ = "staff_change_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    request_type = Column(String(50), nullable=False, index=True)  # CREATE_STAFF, CHANGE_ROLE, PROMOTE, DEMOTE, CHANGE_DEPARTMENT, MAKE_DEPARTMENT_MASTER
    target_user_id = Column(String(36), ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True, index=True)
    target_user_email = Column(String(255), nullable=True)
    target_user_name = Column(String(150), nullable=True)
    target_password_hash = Column(String(255), nullable=True)
    requested_role_id = Column(String(50), ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)
    previous_role_id = Column(String(50), ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)
    requested_department = Column(String(50), nullable=True)
    requested_permissions = Column(JSON, nullable=True)
    requested_by_admin_id = Column(String(36), ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True, index=True)
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="PENDING", nullable=False, index=True)  # PENDING, APPROVED, REJECTED, CANCELLED
    reviewed_by_admin_id = Column(String(36), ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True)
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    target_user = relationship("AdminUser", foreign_keys=[target_user_id])
    requested_by_admin = relationship("AdminUser", foreign_keys=[requested_by_admin_id])
    reviewed_by_admin = relationship("AdminUser", foreign_keys=[reviewed_by_admin_id])
    requested_role = relationship("Role", foreign_keys=[requested_role_id])
    previous_role = relationship("Role", foreign_keys=[previous_role_id])

class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    admin_id = Column(String(36), ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True, index=True)
    admin_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., "verse_created", "app_config_changed"
    resource_type = Column(String(100), nullable=False, index=True)  # e.g., "verse", "feature_flag"
    resource_id = Column(String(100), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    meta_data = Column(JSON, nullable=True)  # Sanitized JSON details (no secrets/passwords)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    admin_user = relationship("AdminUser", back_populates="audit_logs")
