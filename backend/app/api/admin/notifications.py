from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.errors import NotFoundException, ConflictException
from app.models.notification import NotificationTemplate, NotificationCampaign, UserPushDevice
from app.schemas.notification import TemplateCreate, TemplateUpdate, CampaignCreate, UserTestPushRequest
from app.services.audit_service import log_admin_action
from app.services.fcm_user_push_service import (
    dispatch_campaign,
    process_due_scheduled_campaigns,
    get_fcm_service_status,
    send_fcm_multicast,
    mask_token as mask_fcm_token
)

router = APIRouter(prefix="/notifications", tags=["Admin Push Notifications Hub"])

# Templates
@router.get("/templates")
def list_templates(
    admin = Depends(require_permission("notifications.read")),
    db: Session = Depends(get_db)
):
    templates = db.query(NotificationTemplate).all()
    return {
        "success": True,
        "data": [
            {
                "id": t.id,
                "name": t.name,
                "title_template": t.title_template,
                "body_template": t.body_template,
                "deep_link": t.deep_link,
                "language": t.language,
                "category": t.category,
                "updated_at": t.updated_at.isoformat()
            }
            for t in templates
        ]
    }

@router.post("/templates", status_code=status.HTTP_201_CREATED)
def create_template(
    body: TemplateCreate,
    request: Request,
    admin = Depends(require_permission("notifications.write")),
    db: Session = Depends(get_db)
):
    existing = db.query(NotificationTemplate).filter(NotificationTemplate.id == body.id).first()
    if existing:
        raise ConflictException(f"Template '{body.id}' já existe")

    tmpl = NotificationTemplate(
        id=body.id,
        name=body.name,
        title_template=body.title_template,
        body_template=body.body_template,
        deep_link=body.deep_link,
        language=body.language,
        category=body.category
    )
    db.add(tmpl)
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="notification_template_created",
        resource_type="notification_template",
        resource_id=tmpl.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"name": tmpl.name}
    )

    return {"success": True, "data": {"id": tmpl.id, "name": tmpl.name}}

# Campaigns
@router.get("/campaigns")
def list_campaigns(
    app_id: str = "verse_daily",
    admin = Depends(require_permission("notifications.read")),
    db: Session = Depends(get_db)
):
    campaigns = db.query(NotificationCampaign).filter(NotificationCampaign.app_id == app_id).order_by(NotificationCampaign.created_at.desc()).all()
    return {
        "success": True,
        "data": [
            {
                "id": c.id,
                "app_id": c.app_id,
                "title": c.title,
                "message": c.message,
                "deep_link": c.deep_link,
                "target_audience": c.target_audience,
                "language": c.language,
                "status": c.status,
                "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
                "sent_at": c.sent_at.isoformat() if c.sent_at else None,
                "target_count": c.target_count,
                "success_count": c.success_count,
                "failure_count": c.failure_count,
                "error_summary": c.error_summary,
                "created_at": c.created_at.isoformat()
            }
            for c in campaigns
        ]
    }

@router.post("/campaigns", status_code=status.HTTP_201_CREATED)
def create_campaign(
    body: CampaignCreate,
    request: Request,
    admin = Depends(require_permission("notifications.send")),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    is_scheduled = body.scheduled_at is not None and body.scheduled_at > now

    # Estimate targeted device audience count
    active_devices_count = db.query(UserPushDevice).filter(
        UserPushDevice.app_id == body.app_id,
        UserPushDevice.active == True
    ).count()

    camp = NotificationCampaign(
        app_id=body.app_id,
        title=body.title,
        message=body.message,
        deep_link=body.deep_link or "daily_verse",
        target_audience=body.target_audience,
        language=body.language,
        status="scheduled" if is_scheduled else "sending",
        scheduled_at=body.scheduled_at,
        target_count=active_devices_count,
        success_count=0,
        failure_count=0
    )
    db.add(camp)
    db.commit()
    db.refresh(camp)

    if not is_scheduled:
        # Dispatch immediately via Firebase Cloud Messaging
        dispatch_result = dispatch_campaign(db=db, campaign=camp)
        db.refresh(camp)

    log_admin_action(
        db=db,
        admin=admin,
        action="notification_campaign_scheduled" if is_scheduled else "notification_campaign_dispatched",
        resource_type="notification_campaign",
        resource_id=camp.id,
        ip_address=request.client.host if request.client else None,
        meta_data={
            "title": camp.title,
            "audience": camp.target_audience,
            "scheduled_at": camp.scheduled_at.isoformat() if camp.scheduled_at else None,
            "status": camp.status
        }
    )

    return {
        "success": True,
        "data": {
            "id": camp.id,
            "title": camp.title,
            "status": camp.status,
            "scheduled_at": camp.scheduled_at.isoformat() if camp.scheduled_at else None,
            "target_count": camp.target_count,
            "success_count": camp.success_count,
            "failure_count": camp.failure_count
        }
    }

@router.post("/campaigns/{campaign_id}/send-now")
def send_campaign_now(
    campaign_id: str,
    request: Request,
    admin = Depends(require_permission("notifications.send")),
    db: Session = Depends(get_db)
):
    """
    Forces immediate FCM dispatch of a scheduled or draft campaign.
    """
    camp = db.query(NotificationCampaign).filter(NotificationCampaign.id == campaign_id).first()
    if not camp:
        raise NotFoundException("Campanha não encontrada")
    if camp.status == "sent":
        return {"success": True, "message": "Campanha já foi enviada anteriormente", "data": {"id": camp.id, "status": camp.status}}

    result = dispatch_campaign(db=db, campaign=camp)
    db.refresh(camp)

    log_admin_action(
        db=db,
        admin=admin,
        action="notification_campaign_force_dispatched",
        resource_type="notification_campaign",
        resource_id=camp.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"title": camp.title, "success_count": camp.success_count}
    )

    return {"success": True, "message": "Campanha disparada com sucesso via FCM", "data": result}

@router.post("/campaigns/{campaign_id}/cancel")
def cancel_campaign(
    campaign_id: str,
    request: Request,
    admin = Depends(require_permission("notifications.send")),
    db: Session = Depends(get_db)
):
    """
    Cancels a scheduled campaign.
    """
    camp = db.query(NotificationCampaign).filter(NotificationCampaign.id == campaign_id).first()
    if not camp:
        raise NotFoundException("Campanha não encontrada")
    if camp.status == "sent":
        return {"success": False, "message": "Campanhas já enviadas não podem ser canceladas"}

    camp.status = "cancelled"
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="notification_campaign_cancelled",
        resource_type="notification_campaign",
        resource_id=camp.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"title": camp.title}
    )

    return {"success": True, "message": "Campanha cancelada com sucesso", "data": {"id": camp.id, "status": camp.status}}

@router.post("/process-scheduled")
def trigger_process_scheduled_campaigns(
    admin = Depends(require_permission("notifications.send")),
    db: Session = Depends(get_db)
):
    """
    Manual / Cron trigger to process and dispatch all due scheduled notification campaigns.
    """
    result = process_due_scheduled_campaigns(db=db)
    return result

@router.post("/test-user-push")
def send_test_user_fcm_push(
    body: UserTestPushRequest,
    admin = Depends(require_permission("notifications.send")),
    db: Session = Depends(get_db)
):
    """
    Dispatches a real-time test push notification via Firebase Cloud Messaging.
    Can target:
    1. A specific device token
    2. A specific user_id's active devices
    3. All active devices registered for the app
    """
    title = body.title or "🔔 Teste de Notificação Push"
    message = body.message or "Teste de conexão FCM realizado com sucesso!"
    app_id = body.app_id or "verse_daily"
    deep_link = body.deep_link or "daily_verse"

    tokens: list[str] = []
    if body.token:
        tokens = [body.token]
    elif body.user_id:
        user_devices = db.query(UserPushDevice).filter(
            UserPushDevice.user_id == body.user_id,
            UserPushDevice.active == True
        ).all()
        tokens = [d.token for d in user_devices if d.token]
    else:
        app_devices = db.query(UserPushDevice).filter(
            UserPushDevice.app_id == app_id,
            UserPushDevice.active == True
        ).limit(100).all()
        tokens = [d.token for d in app_devices if d.token]

    if not tokens:
        return {
            "success": True,
            "message": "Nenhum token ou dispositivo ativo encontrado para este envio de teste.",
            "data": {
                "targeted_tokens": 0,
                "delivery_mode": get_fcm_service_status(db, app_id)["delivery_mode"]
            }
        }

    res = send_fcm_multicast(
        tokens=tokens,
        title=title,
        body=message,
        data={"type": "test_push", "deep_link": deep_link, "app_id": app_id},
        deep_link=deep_link
    )

    return {
        "success": True,
        "message": f"Push de teste enviado: {res['success_count']} sucessos, {res['failure_count']} falhas.",
        "data": {
            "mode": res["mode"],
            "targeted_count": len(tokens),
            "success_count": res["success_count"],
            "failure_count": res["failure_count"],
            "invalid_tokens_count": len(res["invalid_tokens"])
        }
    }

@router.get("/fcm-status")
def get_fcm_status(
    app_id: str = "verse_daily",
    admin = Depends(require_permission("notifications.read")),
    db: Session = Depends(get_db)
):
    """
    Telemetry and health diagnostics for Firebase Cloud Messaging.
    """
    status_data = get_fcm_service_status(db=db, app_id=app_id)
    return {
        "success": True,
        "data": status_data
    }

# --- Staff Notifications Inbox (Team Alerts & Bell Center) ---
from app.core.dependencies import get_current_admin
from app.models.auth import AdminUser
from app.services.staff_notification_service import (
    list_staff_notifications, get_unread_notifications_count,
    mark_notification_as_read, mark_all_notifications_as_read,
    create_staff_notification
)
from app.schemas.notification import (
    TemplateCreate, TemplateUpdate, CampaignCreate,
    StaffDeviceRegisterRequest, TestPushRequest
)
from app.services.push_notification_service import (
    register_or_update_staff_device, deactivate_staff_device,
    get_admin_push_devices, get_push_diagnostics_data,
    send_staff_push, mask_token
)

@router.get("/inbox")
def get_staff_inbox(
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    items = list_staff_notifications(
        db=db,
        admin_id=current_admin.id,
        unread_only=unread_only,
        limit=limit,
        offset=offset
    )
    unread_count = get_unread_notifications_count(db=db, admin_id=current_admin.id)
    return {
        "success": True,
        "data": {
            "unread_count": unread_count,
            "items": [
                {
                    "id": n.id,
                    "type": n.type,
                    "title": n.title,
                    "message": n.message,
                    "target_type": n.target_type,
                    "target_id": n.target_id,
                    "action_url": n.action_url,
                    "is_read": n.is_read,
                    "read_at": n.read_at.isoformat() if n.read_at else None,
                    "created_at": n.created_at.isoformat()
                }
                for n in items
            ]
        }
    }

@router.get("/unread-count")
def get_unread_count(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    count = get_unread_notifications_count(db=db, admin_id=current_admin.id)
    return {
        "success": True,
        "data": {
            "unread_count": count
        }
    }

@router.patch("/inbox/{notification_id}/read")
def mark_read(
    notification_id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    notif = mark_notification_as_read(db=db, notification_id=notification_id, admin_id=current_admin.id)
    if not notif:
        raise NotFoundException("Notificação não encontrada")
    db.commit()
    return {"success": True, "message": "Notificação marcada como lida"}

@router.post("/inbox/read-all")
def mark_all_read(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    count = mark_all_notifications_as_read(db=db, admin_id=current_admin.id)
    db.commit()
    return {"success": True, "data": {"marked_count": count}}

# --- Push Devices & Diagnostics Endpoints ---

@router.post("/devices", status_code=status.HTTP_200_OK)
def register_device(
    body: StaffDeviceRegisterRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Registers or updates the push notification token for the authenticated Admin.
    Security: Uses current_admin.id from JWT identity only.
    """
    device = register_or_update_staff_device(
        db=db,
        admin_id=current_admin.id,
        token=body.token,
        provider=body.provider,
        platform=body.platform,
        browser=body.browser,
        device_name=body.device_name,
        endpoint=body.endpoint,
        p256dh=body.p256dh,
        auth=body.auth
    )
    db.commit()
    return {
        "success": True,
        "data": {
            "id": device.id,
            "admin_id": device.admin_id,
            "token_masked": mask_token(device.token),
            "provider": device.provider,
            "platform": device.platform,
            "browser": device.browser,
            "active": device.active,
            "last_seen_at": device.last_seen_at.isoformat()
        }
    }

@router.get("/devices")
def list_my_devices(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Lists all push notification devices registered for the authenticated admin.
    """
    devices = get_admin_push_devices(db=db, admin_id=current_admin.id)
    return {
        "success": True,
        "data": [
            {
                "id": d.id,
                "token_masked": mask_token(d.token),
                "provider": d.provider,
                "platform": d.platform,
                "browser": d.browser,
                "device_name": d.device_name,
                "active": d.active,
                "last_seen_at": d.last_seen_at.isoformat(),
                "last_success_at": d.last_success_at.isoformat() if d.last_success_at else None,
                "last_failure_at": d.last_failure_at.isoformat() if d.last_failure_at else None,
                "failure_count": d.failure_count,
                "created_at": d.created_at.isoformat()
            }
            for d in devices
        ]
    }

@router.delete("/devices/{device_id}")
def unregister_device(
    device_id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Deactivates a device belonging to the authenticated admin.
    """
    success = deactivate_staff_device(db=db, device_id=device_id, admin_id=current_admin.id)
    if not success:
        raise NotFoundException("Dispositivo não encontrado ou não pertence a este administrador")
    db.commit()
    return {"success": True, "message": "Dispositivo desativado com sucesso"}

@router.post("/test-push")
def send_test_push_notification(
    body: Optional[TestPushRequest] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Sends a test push notification to the active devices of the authenticated admin.
    Also creates an internal notification item in the staff inbox as a record.
    """
    title = body.title if body and body.title else "🔔 Teste de Notificação Staff"
    message = body.message if body and body.message else "Suas notificações push estão ativas e funcionando perfeitamente!"
    action_url = body.action_url if body and body.action_url else "/notifications"

    notif = create_staff_notification(
        db=db,
        recipient_admin_id=current_admin.id,
        type="TEST_PUSH",
        title=title,
        message=message,
        target_type="system",
        target_id="test",
        action_url=action_url
    )
    db.commit()

    return {
        "success": True,
        "message": "Notificação de teste enviada com sucesso!",
        "data": {
            "notification_id": notif.id,
            "recipient_admin_id": current_admin.id,
            "title": title,
            "message": message,
            "action_url": action_url
        }
    }

@router.get("/push-diagnostics")
def get_push_diagnostics(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Returns diagnostic telemetry for the push notification system without exposing private keys.
    """
    diagnostics = get_push_diagnostics_data(db=db, admin_id=current_admin.id)
    return {
        "success": True,
        "data": diagnostics
    }


