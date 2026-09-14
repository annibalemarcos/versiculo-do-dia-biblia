import math
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.errors import NotFoundException
from app.models.user import User, Favorite, ReadingHistory, UserPreference
from app.models.monetization import Subscription
from app.models.ticket import SupportTicket
from app.services.audit_service import log_admin_action

router = APIRouter(prefix="/users", tags=["Admin User Management"])

@router.get("")
def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    is_premium: Optional[bool] = Query(None),
    plan: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    is_deleted: Optional[bool] = Query(None),
    status: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    app_id: Optional[str] = Query(None),
    admin = Depends(require_permission("users.read")),
    db: Session = Depends(get_db)
):
    query = db.query(User)

    if app_id:
        query = query.filter(User.app_id == app_id)
    if is_premium is not None:
        query = query.filter(User.is_premium == is_premium)
    if plan:
        p_upper = plan.upper().strip()
        if p_upper == "PREMIUM":
            query = query.filter(User.is_premium == True)
        elif p_upper in ("FREE", "GRATUITO"):
            query = query.filter(User.is_premium == False)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if is_deleted is not None:
        query = query.filter(User.is_deleted == is_deleted)
    if status:
        s_lower = status.lower().strip()
        if s_lower == "active":
            query = query.filter(User.is_active == True, User.is_deleted == False)
        elif s_lower == "blocked":
            query = query.filter(User.is_active == False, User.is_deleted == False)
        elif s_lower == "deleted":
            query = query.filter(User.is_deleted == True)
    if platform:
        query = query.filter(User.platform == platform)
    
    search_term = (search or q or "").strip()
    if search_term:
        query = query.filter(
            or_(
                User.email.ilike(f"%{search_term}%"),
                User.name.ilike(f"%{search_term}%"),
                User.id.ilike(f"%{search_term}%")
            )
        )

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit
    users = query.order_by(desc(User.created_at)).offset(offset).limit(limit).all()

    items = []
    from app.models.bible import DevotionalProgress
    from app.models.notification import UserNotification, UserPushDevice
    for u in users:
        fav_count = db.query(func.count(Favorite.id)).filter(Favorite.user_id == u.id).scalar() or 0
        hist_count = db.query(func.count(ReadingHistory.id)).filter(ReadingHistory.user_id == u.id).scalar() or 0
        tickets_count = db.query(func.count(SupportTicket.id)).filter(SupportTicket.user_id == u.id).scalar() or 0
        dev_count = db.query(func.count(DevotionalProgress.id)).filter(DevotionalProgress.user_id == u.id).scalar() or 0
        unread_notifs = db.query(func.count(UserNotification.id)).filter(
            or_(UserNotification.user_id == u.id, UserNotification.user_id == None),
            UserNotification.is_read == False
        ).scalar() or 0
        latest_device = db.query(UserPushDevice).filter(UserPushDevice.user_id == u.id).order_by(desc(UserPushDevice.last_seen_at)).first()

        items.append({
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "platform": u.platform,
            "language": u.language,
            "app_id": u.app_id,
            "is_anonymous": u.is_anonymous,
            "is_active": u.is_active,
            "is_deleted": getattr(u, "is_deleted", False) or False,
            "deleted_at": u.deleted_at.isoformat() if getattr(u, "deleted_at", None) else None,
            "is_premium": u.is_premium,
            "premium_expires_at": u.premium_expires_at.isoformat() if u.premium_expires_at else None,
            "last_seen_at": u.last_seen_at.isoformat() if u.last_seen_at else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "favorites_count": fav_count,
            "history_count": hist_count,
            "tickets_count": tickets_count,
            "devotionals_count": dev_count,
            "unread_notifications_count": unread_notifs,
            "app_version": latest_device.app_version if latest_device else None,
            "device_name": latest_device.device_name if latest_device else u.device_id
        })

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

@router.get("/{user_id}")
def get_user_detail(
    user_id: str,
    admin = Depends(require_permission("users.read")),
    db: Session = Depends(get_db)
):
    from app.models.bible import DevotionalProgress
    from app.models.notification import UserNotification, UserPushDevice
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise NotFoundException("Usuário não encontrado")

    pref = db.query(UserPreference).filter(UserPreference.user_id == u.id).first()
    subs = db.query(Subscription).filter(Subscription.user_id == u.id).order_by(desc(Subscription.created_at)).all()
    fav_count = db.query(func.count(Favorite.id)).filter(Favorite.user_id == u.id).scalar() or 0
    hist_count = db.query(func.count(ReadingHistory.id)).filter(ReadingHistory.user_id == u.id).scalar() or 0
    tickets_count = db.query(func.count(SupportTicket.id)).filter(SupportTicket.user_id == u.id).scalar() or 0
    dev_count = db.query(func.count(DevotionalProgress.id)).filter(DevotionalProgress.user_id == u.id).scalar() or 0
    unread_notifs = db.query(func.count(UserNotification.id)).filter(
        or_(UserNotification.user_id == u.id, UserNotification.user_id == None),
        UserNotification.is_read == False
    ).scalar() or 0
    latest_device = db.query(UserPushDevice).filter(UserPushDevice.user_id == u.id).order_by(desc(UserPushDevice.last_seen_at)).first()

    return {
        "success": True,
        "data": {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "platform": u.platform,
            "language": u.language,
            "app_id": u.app_id,
            "is_anonymous": u.is_anonymous,
            "is_active": u.is_active,
            "is_deleted": getattr(u, "is_deleted", False) or False,
            "deleted_at": u.deleted_at.isoformat() if getattr(u, "deleted_at", None) else None,
            "is_premium": u.is_premium,
            "premium_expires_at": u.premium_expires_at.isoformat() if u.premium_expires_at else None,
            "last_seen_at": u.last_seen_at.isoformat() if u.last_seen_at else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "favorites_count": fav_count,
            "history_count": hist_count,
            "tickets_count": tickets_count,
            "devotionals_count": dev_count,
            "unread_notifications_count": unread_notifs,
            "device_id": u.device_id,
            "device_name": latest_device.device_name if latest_device else u.device_id,
            "app_version": latest_device.app_version if latest_device else "1.0.0",
            "preferences": {
                "theme_mode": pref.theme_mode if pref else "SYSTEM",
                "text_scale": pref.text_scale if pref else "NORMAL",
                "preferred_translation": pref.preferred_translation if pref else "NVI",
                "notifications_enabled": pref.notifications_enabled if pref else True,
                "notification_hour": pref.notification_hour if pref else 8,
                "notification_minute": pref.notification_minute if pref else 0,
                "custom_prefs": pref.custom_prefs if pref else {}
            },
            "subscriptions": [
                {
                    "id": s.id,
                    "product_id": s.product_id,
                    "provider": s.provider,
                    "status": s.status,
                    "order_id": s.order_id,
                    "purchase_token_masked": s.purchase_token_masked,
                    "starts_at": s.starts_at.isoformat() if s.starts_at else None,
                    "expires_at": s.expires_at.isoformat() if s.expires_at else None,
                    "is_auto_renewing": s.is_auto_renewing
                }
                for s in subs
            ]
        }
    }

@router.put("/{user_id}/status")
def toggle_user_active_status(
    user_id: str,
    is_active: bool,
    request: Request,
    admin = Depends(require_permission("users.block")),
    db: Session = Depends(get_db)
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise NotFoundException("Usuário não encontrado")

    u.is_active = is_active
    db.commit()

    action = "user_unblocked" if is_active else "user_blocked"
    log_admin_action(
        db=db,
        admin=admin,
        action=action,
        resource_type="user",
        resource_id=u.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"email": u.email, "is_active": is_active}
    )

    return {"success": True, "message": f"Status do usuário alterado para {'Ativo' if is_active else 'Bloqueado'}"}

@router.put("/{user_id}/premium")
def modify_user_premium_status(
    user_id: str,
    is_premium: bool,
    request: Request,
    admin = Depends(require_permission("users.premium_override")),
    db: Session = Depends(get_db)
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise NotFoundException("Usuário não encontrado")

    u.is_premium = is_premium
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="user_premium_overridden",
        resource_type="user",
        resource_id=u.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"email": u.email, "is_premium": is_premium}
    )

    return {"success": True, "message": f"Status Premium do usuário atualizado para {is_premium}"}

# --- Sub-resource endpoints for 360 User Inspection ---

@router.get("/{user_id}/favorites")
def get_user_favorites(
    user_id: str,
    admin = Depends(require_permission("users.read")),
    db: Session = Depends(get_db)
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise NotFoundException("Usuário não encontrado")
    
    favs = db.query(Favorite).filter(Favorite.user_id == user_id).order_by(desc(Favorite.created_at)).all()
    return {
        "success": True,
        "data": [
            {
                "id": f.id,
                "verse_id": f.verse_id,
                "reference": f.reference,
                "text": f.text,
                "translation": f.translation,
                "created_at": f.created_at.isoformat()
            }
            for f in favs
        ]
    }

@router.get("/{user_id}/devotionals")
def get_user_devotionals(
    user_id: str,
    admin = Depends(require_permission("users.read")),
    db: Session = Depends(get_db)
):
    from app.models.bible import DevotionalProgress, Devotional
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise NotFoundException("Usuário não encontrado")

    progresses = db.query(DevotionalProgress).filter(DevotionalProgress.user_id == user_id).all()
    results = []
    for p in progresses:
        devotional = db.query(Devotional).filter(Devotional.id == p.devotional_id).first()
        total_days = devotional.total_days if devotional else 7
        completed_count = len(p.completed_days) if isinstance(p.completed_days, list) else 0
        percent = min(100, round((completed_count / total_days) * 100)) if total_days > 0 else 0
        results.append({
            "id": p.id,
            "devotional_id": p.devotional_id,
            "title": devotional.title if devotional else p.devotional_id,
            "cover_image_url": devotional.cover_image_url if devotional else None,
            "is_premium": devotional.is_premium if devotional else False,
            "current_day": p.current_day,
            "total_days": total_days,
            "completed_days_count": completed_count,
            "completed_days": p.completed_days or [],
            "progress_percent": percent,
            "is_completed": p.is_completed,
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
            "updated_at": p.updated_at.isoformat() if hasattr(p, "updated_at") and p.updated_at else p.created_at.isoformat()
        })

    return {
        "success": True,
        "data": results
    }

@router.get("/{user_id}/activity")
def get_user_activity_timeline(
    user_id: str,
    limit: int = Query(60, ge=1, le=150),
    admin = Depends(require_permission("users.read")),
    db: Session = Depends(get_db)
):
    from app.models.bible import DevotionalProgress, Devotional
    from app.models.analytics import AnalyticsEvent
    from app.models.monetization import Subscription, AdminEntitlementGrant

    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise NotFoundException("Usuário não encontrado")

    timeline = []

    # 1. Account Creation
    timeline.append({
        "id": f"reg_{u.id}",
        "type": "account_created",
        "title": "Conta criada",
        "description": f"Usuário registrado na plataforma ({u.platform.capitalize()}, idioma {u.language})",
        "timestamp": u.created_at.isoformat(),
        "badge_color": "blue"
    })

    # 2. Account Deletion (if applicable)
    if getattr(u, "is_deleted", False) and u.deleted_at:
        timeline.append({
            "id": f"del_{u.id}",
            "type": "account_deleted",
            "title": "Conta excluída",
            "description": "Usuário solicitou exclusão de conta e anonimização de dados",
            "timestamp": u.deleted_at.isoformat(),
            "badge_color": "red"
        })

    # 3. Analytics events (real tracked interactions)
    events = db.query(AnalyticsEvent).filter(AnalyticsEvent.user_id == user_id).order_by(desc(AnalyticsEvent.created_at)).limit(30).all()
    for ev in events:
        timeline.append({
            "id": ev.id,
            "type": "analytics_event",
            "title": ev.event_name.replace("_", " ").capitalize(),
            "description": f"Dispositivo {ev.platform} • Propriedades: {', '.join([f'{k}: {v}' for k, v in (ev.properties or {}).items()][:2]) or 'Nenhuma'}",
            "timestamp": ev.created_at.isoformat(),
            "badge_color": "purple"
        })

    # 4. Recent Favorites
    favs = db.query(Favorite).filter(Favorite.user_id == user_id).order_by(desc(Favorite.created_at)).limit(20).all()
    for f in favs:
        timeline.append({
            "id": f"fav_{f.id}",
            "type": "favorite_added",
            "title": f"Versículo Favoritado: {f.reference}",
            "description": f'"{f.text[:80]}..." ({f.translation})',
            "timestamp": f.created_at.isoformat(),
            "badge_color": "amber"
        })

    # 5. Recent Reading History
    readings = db.query(ReadingHistory).filter(ReadingHistory.user_id == user_id).order_by(desc(ReadingHistory.read_at)).limit(20).all()
    for r in readings:
        timeline.append({
            "id": f"read_{r.id}",
            "type": "reading_done",
            "title": f"Leitura Bíblica: {r.reference}",
            "description": f'"{r.text[:80]}..." ({r.translation})',
            "timestamp": r.read_at.isoformat(),
            "badge_color": "emerald"
        })

    # 6. Devotionals Progress
    devs = db.query(DevotionalProgress).filter(DevotionalProgress.user_id == user_id).all()
    for dp in devs:
        dev_info = db.query(Devotional).filter(Devotional.id == dp.devotional_id).first()
        dev_title = dev_info.title if dev_info else dp.devotional_id
        timeline.append({
            "id": f"dev_start_{dp.id}",
            "type": "devotional_started",
            "title": f"Devocional Iniciado: {dev_title}",
            "description": f"Progresso atual: Dia {dp.current_day} de {dev_info.total_days if dev_info else '?'}",
            "timestamp": dp.created_at.isoformat(),
            "badge_color": "indigo"
        })
        if dp.is_completed and dp.completed_at:
            timeline.append({
                "id": f"dev_comp_{dp.id}",
                "type": "devotional_completed",
                "title": f"Devocional Concluído: {dev_title}",
                "description": f"Todos os dias concluídos com sucesso!",
                "timestamp": dp.completed_at.isoformat(),
                "badge_color": "emerald"
            })

    # 7. Support Tickets
    tickets = db.query(SupportTicket).filter(SupportTicket.user_id == user_id).order_by(desc(SupportTicket.created_at)).all()
    for t in tickets:
        timeline.append({
            "id": f"tkt_{t.id}",
            "type": "ticket_created",
            "title": f"Chamado de Suporte: {t.ticket_number}",
            "description": f"{t.subject} (Status: {t.status})",
            "timestamp": t.created_at.isoformat(),
            "badge_color": "rose"
        })

    # 8. Subscriptions & Grants
    subs = db.query(Subscription).filter(Subscription.user_id == user_id).all()
    for s in subs:
        timeline.append({
            "id": f"sub_{s.id}",
            "type": "subscription_started",
            "title": f"Assinatura Google Play: {s.product_id}",
            "description": f"Status: {s.status} • Pedido: {s.order_id or 'In-App'}",
            "timestamp": s.starts_at.isoformat(),
            "badge_color": "amber"
        })

    grants = db.query(AdminEntitlementGrant).filter(AdminEntitlementGrant.user_id == user_id).all()
    for g in grants:
        timeline.append({
            "id": f"grant_{g.id}",
            "type": "grant_awarded",
            "title": f"Benefício Administrativo: {g.entitlement_id}",
            "description": f"Motivo: {g.reason} (Ativo: {g.is_active})",
            "timestamp": g.starts_at.isoformat(),
            "badge_color": "teal"
        })

    # Sort all descending by timestamp
    timeline.sort(key=lambda x: x["timestamp"], reverse=True)

    return {
        "success": True,
        "data": timeline[:limit]
    }

@router.get("/{user_id}/history")
def get_user_history(
    user_id: str,
    limit: int = Query(50, ge=1, le=200),
    admin = Depends(require_permission("users.read")),
    db: Session = Depends(get_db)
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise NotFoundException("Usuário não encontrado")
    
    hist = db.query(ReadingHistory).filter(ReadingHistory.user_id == user_id).order_by(desc(ReadingHistory.read_at)).limit(limit).all()
    return {
        "success": True,
        "data": [
            {
                "id": h.id,
                "verse_id": h.verse_id,
                "reference": h.reference,
                "text": h.text,
                "translation": h.translation,
                "read_at": h.read_at.isoformat()
            }
            for h in hist
        ]
    }

@router.get("/{user_id}/tickets")
def get_user_tickets(
    user_id: str,
    admin = Depends(require_permission("tickets.read")),
    db: Session = Depends(get_db)
):
    tickets = db.query(SupportTicket).filter(SupportTicket.user_id == user_id).order_by(desc(SupportTicket.updated_at)).all()
    return {
        "success": True,
        "data": [
            {
                "id": t.id,
                "ticket_number": t.ticket_number,
                "subject": t.subject,
                "category": t.category,
                "priority": t.priority,
                "status": t.status,
                "created_at": t.created_at.isoformat(),
                "updated_at": t.updated_at.isoformat()
            }
            for t in tickets
        ]
    }

@router.get("/{user_id}/notifications")
def get_user_notifications(
    user_id: str,
    limit: int = Query(50, ge=1, le=100),
    admin = Depends(require_permission("notifications.read")),
    db: Session = Depends(get_db)
):
    from app.models.notification import UserNotification
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise NotFoundException("Usuário não encontrado")

    notifs = db.query(UserNotification).filter(
        UserNotification.user_id == user_id
    ).order_by(desc(UserNotification.created_at)).limit(limit).all()
    return {
        "success": True,
        "data": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "deep_link": n.deep_link,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat()
            }
            for n in notifs
        ]
    }

@router.get("/{user_id}/devices")
def get_user_devices(
    user_id: str,
    admin = Depends(require_permission("users.read")),
    db: Session = Depends(get_db)
):
    from app.models.notification import UserPushDevice
    devices = db.query(UserPushDevice).filter(UserPushDevice.user_id == user_id).order_by(desc(UserPushDevice.last_seen_at)).all()
    
    def mask_token(tok: Optional[str]) -> str:
        if not tok:
            return "Não configurado"
        clean = tok.strip()
        if len(clean) <= 12:
            return "fcm_...****"
        return f"{clean[:8]}...{clean[-5:]}"

    return {
        "success": True,
        "data": [
            {
                "id": d.id,
                "platform": d.platform,
                "device_name": d.device_name or f"Dispositivo {d.platform.upper()}",
                "app_version": d.app_version or "1.0.0",
                "active": d.active,
                "token_masked": mask_token(d.token),
                "last_seen_at": d.last_seen_at.isoformat(),
                "last_success_at": d.last_success_at.isoformat() if d.last_success_at else None,
                "last_failure_at": d.last_failure_at.isoformat() if d.last_failure_at else None,
                "failure_count": d.failure_count,
                "last_error": d.last_error
            }
            for d in devices
        ]
    }

@router.get("/{user_id}/entitlements")
def get_user_entitlements(
    user_id: str,
    admin = Depends(require_permission("monetization.read")),
    db: Session = Depends(get_db)
):
    from app.models.monetization import AdminEntitlementGrant
    grants = db.query(AdminEntitlementGrant).filter(AdminEntitlementGrant.user_id == user_id).order_by(desc(AdminEntitlementGrant.created_at)).all()
    subs = db.query(Subscription).filter(Subscription.user_id == user_id).order_by(desc(Subscription.created_at)).all()
    return {
        "success": True,
        "data": {
            "grants": [
                {
                    "id": g.id,
                    "entitlement_id": g.entitlement_id,
                    "reason": g.reason,
                    "starts_at": g.starts_at.isoformat(),
                    "expires_at": g.expires_at.isoformat() if g.expires_at else None,
                    "is_active": g.is_active,
                    "revoked_at": g.revoked_at.isoformat() if g.revoked_at else None,
                    "revoked_reason": g.revoked_reason
                }
                for g in grants
            ],
            "subscriptions": [
                {
                    "id": s.id,
                    "product_id": s.product_id,
                    "status": s.status,
                    "order_id": s.order_id,
                    "starts_at": s.starts_at.isoformat(),
                    "expires_at": s.expires_at.isoformat() if s.expires_at else None
                }
                for s in subs
            ]
        }
    }

@router.post("/{user_id}/entitlements")
def grant_user_entitlement(
    user_id: str,
    entitlement_id: str,
    reason: str,
    days: Optional[int] = None,
    request: Request = None,
    admin = Depends(require_permission("users.premium_override")),
    db: Session = Depends(get_db)
):
    from datetime import datetime, timedelta
    from app.models.monetization import AdminEntitlementGrant
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise NotFoundException("Usuário não encontrado")
    
    expires_at = datetime.utcnow() + timedelta(days=days) if days else None
    grant = AdminEntitlementGrant(
        user_id=user_id,
        admin_id=admin.id,
        entitlement_id=entitlement_id,
        reason=reason,
        expires_at=expires_at,
        is_active=True
    )
    db.add(grant)
    u.is_premium = True
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="admin_entitlement_granted",
        resource_type="user",
        resource_id=u.id,
        ip_address=request.client.host if request and request.client else None,
        meta_data={"entitlement_id": entitlement_id, "reason": reason, "days": days}
    )

    return {"success": True, "message": "Entitlement concedido com sucesso", "data": {"grant_id": grant.id}}

@router.delete("/{user_id}/entitlements/{grant_id}")
def revoke_user_entitlement(
    user_id: str,
    grant_id: str,
    reason: str = "Revogado pelo administrador",
    request: Request = None,
    admin = Depends(require_permission("users.premium_override")),
    db: Session = Depends(get_db)
):
    from datetime import datetime
    from app.models.monetization import AdminEntitlementGrant
    grant = db.query(AdminEntitlementGrant).filter(AdminEntitlementGrant.id == grant_id, AdminEntitlementGrant.user_id == user_id).first()
    if not grant:
        raise NotFoundException("Concessão não encontrada")
    
    grant.is_active = False
    grant.revoked_at = datetime.utcnow()
    grant.revoked_reason = reason
    grant.revoked_by_admin_id = admin.id
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="admin_entitlement_revoked",
        resource_type="user",
        resource_id=user_id,
        ip_address=request.client.host if request and request.client else None,
        meta_data={"grant_id": grant_id, "reason": reason}
    )

    return {"success": True, "message": "Concessão revogada com sucesso"}

@router.get("/{user_id}/audit")
def get_user_audit_logs(
    user_id: str,
    limit: int = Query(50, ge=1, le=100),
    admin = Depends(require_permission("audit.read")),
    db: Session = Depends(get_db)
):
    from app.models.auth import AdminAuditLog
    logs = db.query(AdminAuditLog).filter(
        AdminAuditLog.resource_type == "user",
        AdminAuditLog.resource_id == user_id
    ).order_by(desc(AdminAuditLog.created_at)).limit(limit).all()

    return {
        "success": True,
        "data": [
            {
                "id": l.id,
                "admin_name": l.admin_name,
                "action": l.action,
                "ip_address": l.ip_address,
                "meta_data": l.meta_data,
                "created_at": l.created_at.isoformat()
            }
            for l in logs
        ]
    }

