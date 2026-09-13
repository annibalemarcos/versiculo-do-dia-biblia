from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.auth import AdminAuditLog, AdminUser

def sanitize_metadata(meta: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not meta:
        return {}
    sanitized = {}
    sensitive_keys = {
        "password", "hashed_password", "token", "jwt", "access_token",
        "refresh_token", "secret", "secret_key", "purchasetoken", "purchase_token",
        "authorization", "bearer"
    }
    for k, v in meta.items():
        if any(s in k.lower() for s in sensitive_keys):
            sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = sanitize_metadata(v)
        else:
            sanitized[k] = v
    return sanitized

def log_admin_action(
    db: Session,
    admin: Optional[AdminUser],
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    meta_data: Optional[Dict[str, Any]] = None
) -> AdminAuditLog:
    entry = AdminAuditLog(
        admin_id=admin.id if admin else None,
        admin_email=admin.email if admin else "system/anonymous",
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent[:250] if user_agent else None,
        meta_data=sanitize_metadata(meta_data)
    )
    db.add(entry)
    db.commit()
    return entry
