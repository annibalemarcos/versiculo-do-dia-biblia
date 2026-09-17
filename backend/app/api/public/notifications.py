from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from datetime import datetime, timezone
from typing import Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user_required, get_current_user_optional, get_current_app_id
from app.core.errors import NotFoundException
from app.models.user import User
from app.models.notification import UserNotification

router = APIRouter(prefix="/me/notifications", tags=["Public User Notifications"])

@router.get("")
def list_user_notifications(
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Returns user notifications (including broadcast notifications for this app)
    """
    notifs = db.query(UserNotification).filter(
        or_(
            UserNotification.user_id == user.id,
            UserNotification.user_id.is_(None)
        ),
        UserNotification.app_id == user.app_id
    ).order_by(desc(UserNotification.created_at)).limit(limit).all()

    items = [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "deep_link": n.deep_link,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else datetime.now(timezone.utc).isoformat(),
            "read_at": n.read_at.isoformat() if n.read_at else None
        }
        for n in notifs
    ]

    return {
        "success": True,
        "data": items
    }

@router.get("/unread-count")
def get_unread_notification_count(
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    count = db.query(UserNotification).filter(
        or_(
            UserNotification.user_id == user.id,
            UserNotification.user_id.is_(None)
        ),
        UserNotification.app_id == user.app_id,
        UserNotification.is_read == False
    ).count()

    return {
        "success": True,
        "data": {
            "unread_count": count
        }
    }

@router.patch("/{notification_id}/read")
@router.post("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: str,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    notif = db.query(UserNotification).filter(
        UserNotification.id == notification_id,
        or_(
            UserNotification.user_id == user.id,
            UserNotification.user_id.is_(None)
        )
    ).first()

    if not notif:
        raise NotFoundException("Notificação não encontrada")

    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "success": True,
        "message": "Notificação marcada como lida",
        "data": {"id": notif.id, "is_read": True}
    }

@router.post("/read-all")
def mark_all_notifications_as_read(
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    db.query(UserNotification).filter(
        or_(
            UserNotification.user_id == user.id,
            UserNotification.user_id.is_(None)
        ),
        UserNotification.app_id == user.app_id,
        UserNotification.is_read == False
    ).update({"is_read": True, "read_at": now}, synchronize_session=False)
    db.commit()

    return {
        "success": True,
        "message": "Todas as notificações foram marcadas como lidas"
    }

from pydantic import BaseModel

class DeviceRegisterRequest(BaseModel):
    token: str
    platform: str = "android"
    device_name: Optional[str] = None
    app_version: Optional[str] = None

# --- Push Device Registration ---

device_router = APIRouter(prefix="/me/devices", tags=["User Devices"])

@device_router.post("")
def register_user_device(
    payload: DeviceRegisterRequest,
    user: Optional[User] = Depends(get_current_user_optional),
    app_id: str = Depends(get_current_app_id),
    db: Session = Depends(get_db)
):
    from app.models.notification import UserPushDevice
    effective_app_id = user.app_id if user else (app_id or "verse_daily")
    now = datetime.now(timezone.utc)

    existing = db.query(UserPushDevice).filter(UserPushDevice.token == payload.token).first()
    if existing:
        if user:
            existing.user_id = user.id
        existing.app_id = effective_app_id
        existing.platform = payload.platform
        existing.device_name = payload.device_name
        existing.app_version = payload.app_version
        existing.active = True
        existing.last_seen_at = now
    else:
        dev = UserPushDevice(
            user_id=user.id if user else None,
            app_id=effective_app_id,
            token=payload.token,
            platform=payload.platform,
            device_name=payload.device_name,
            app_version=payload.app_version,
            active=True,
            last_seen_at=now
        )
        db.add(dev)
    
    db.commit()
    return {"success": True, "message": "Dispositivo registrado com sucesso para notificações push"}

@device_router.delete("/{token}")
def unregister_user_device(
    token: str,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    from app.models.notification import UserPushDevice
    query = db.query(UserPushDevice).filter(UserPushDevice.token == token)
    if user:
        query = query.filter(or_(UserPushDevice.user_id == user.id, UserPushDevice.user_id.is_(None)))
    dev = query.first()
    if dev:
        dev.active = False
        db.commit()
    return {"success": True, "message": "Dispositivo desativado das notificações"}

