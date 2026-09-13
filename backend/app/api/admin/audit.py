import math
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models.auth import AdminAuditLog

router = APIRouter(prefix="/audit", tags=["Admin Audit Logs"])

@router.get("")
@router.get("/logs")
def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    admin_email: Optional[str] = Query(None),
    admin = Depends(require_permission("audit.read")),
    db: Session = Depends(get_db)
):
    query = db.query(AdminAuditLog)

    if action:
        query = query.filter(AdminAuditLog.action.ilike(f"%{action}%"))
    target_res = resource_type or entity_type
    if target_res:
        query = query.filter(AdminAuditLog.resource_type == target_res)
    if admin_email:
        query = query.filter(AdminAuditLog.admin_email.ilike(f"%{admin_email}%"))

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit
    logs = query.order_by(desc(AdminAuditLog.created_at)).offset(offset).limit(limit).all()

    items = [
        {
            "id": l.id,
            "admin_id": l.admin_id,
            "admin_email": l.admin_email,
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "ip_address": l.ip_address,
            "meta_data": l.meta_data,
            "created_at": l.created_at.isoformat()
        }
        for l in logs
    ]

    return {
        "success": True,
        "data": {
            "items": items,
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "pages": pages,
                "has_next": page < pages,
                "has_prev": page > 1
            }
        }
    }
