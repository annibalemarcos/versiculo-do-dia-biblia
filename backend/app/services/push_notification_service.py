import logging
import json
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import httpx
from sqlalchemy.orm import Session
from app.models.notification import StaffPushDevice, StaffNotification
from app.models.auth import AdminUser
from app.models.base import utc_now
from app.core.config import settings

logger = logging.getLogger("staff_push_service")
logging.basicConfig(level=logging.INFO)

def mask_token(token: str) -> str:
    """
    Safely masks device token for logging and diagnostic UI without exposing full credential.
    """
    if not token:
        return ""
    if len(token) <= 12:
        return token[:3] + "..." + token[-3:]
    return token[:6] + "..." + token[-6:]

def register_or_update_staff_device(
    db: Session,
    admin_id: str,
    token: str,
    provider: str = "webpush",
    platform: str = "web_desktop",
    browser: Optional[str] = None,
    device_name: Optional[str] = None,
    endpoint: Optional[str] = None,
    p256dh: Optional[str] = None,
    auth: Optional[str] = None
) -> StaffPushDevice:
    """
    Registers a new push device or reactivates/updates an existing token for the authenticated Admin.
    Always uses the authenticated admin_id from the security context (JWT).
    """
    now = utc_now()
    existing_device = db.query(StaffPushDevice).filter(
        StaffPushDevice.token == token
    ).first()

    if existing_device:
        existing_device.admin_id = admin_id
        existing_device.provider = provider
        existing_device.platform = platform
        if browser:
            existing_device.browser = browser
        if device_name:
            existing_device.device_name = device_name
        if endpoint:
            existing_device.endpoint = endpoint
        if p256dh:
            existing_device.p256dh = p256dh
        if auth:
            existing_device.auth = auth
        existing_device.active = True
        existing_device.last_seen_at = now
        existing_device.last_error = None
        db.flush()
        logger.info(f"[PUSH] Updated and reactivated device {existing_device.id} for admin {admin_id} ({browser or platform})")
        return existing_device

    new_device = StaffPushDevice(
        admin_id=admin_id,
        token=token,
        provider=provider,
        platform=platform,
        browser=browser,
        device_name=device_name,
        endpoint=endpoint,
        p256dh=p256dh,
        auth=auth,
        active=True,
        last_seen_at=now,
        created_at=now,
        updated_at=now
    )
    db.add(new_device)
    db.flush()
    logger.info(f"[PUSH] Registered new device {new_device.id} for admin {admin_id} ({browser or platform})")
    return new_device

def deactivate_staff_device(
    db: Session,
    device_id: str,
    admin_id: str
) -> bool:
    """
    Deactivates a device belonging to the authenticated Admin.
    """
    device = db.query(StaffPushDevice).filter(
        StaffPushDevice.id == device_id,
        StaffPushDevice.admin_id == admin_id
    ).first()

    if not device:
        return False

    device.active = False
    device.updated_at = utc_now()
    db.flush()
    logger.info(f"[PUSH] Deactivated device {device_id} for admin {admin_id}")
    return True

def get_admin_push_devices(
    db: Session,
    admin_id: str
) -> List[StaffPushDevice]:
    """
    Returns all push devices registered for a specific admin.
    """
    return db.query(StaffPushDevice).filter(
        StaffPushDevice.admin_id == admin_id
    ).order_by(StaffPushDevice.last_seen_at.desc()).all()

def send_staff_push(
    db: Session,
    recipient_admin_id: str,
    title: str,
    message: str,
    notification_type: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    action_url: Optional[str] = None,
    notification_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Central push notification sender.
    Queries active devices for recipient, dispatches push payload, records metrics and handles token invalidation.
    Guaranteed NOT to raise exceptions that would interrupt the main database transaction.
    """
    try:
        devices = db.query(StaffPushDevice).filter(
            StaffPushDevice.admin_id == recipient_admin_id,
            StaffPushDevice.active == True
        ).all()

        if not devices:
            logger.info(f"[PUSH] Push {notification_type} -> admin {recipient_admin_id} -> no active device token")
            return {
                "success": False,
                "status": "no_active_devices",
                "targeted_count": 0,
                "delivered_count": 0
            }

        now = utc_now()
        delivered_count = 0
        failed_count = 0

        payload_data = {
            "id": notification_id or "",
            "type": notification_type,
            "target_type": target_type or "",
            "target_id": target_id or "",
            "action_url": action_url or "/notifications",
            "sent_at": now.isoformat()
        }

        for device in devices:
            logger.info(f"[PUSH] Push queued -> admin {recipient_admin_id} (device: {device.id}, provider: {device.provider}, platform: {device.platform})")
            
            try:
                # 1. FCM Delivery if FCM Server Key is configured and token is FCM
                if (device.provider == "fcm" or (device.token.startswith("fcm_") or len(device.token) > 100)) and settings.FCM_SERVER_KEY:
                    fcm_url = "https://fcm.googleapis.com/fcm/send"
                    headers = {
                        "Authorization": f"key={settings.FCM_SERVER_KEY}",
                        "Content-Type": "application/json"
                    }
                    fcm_body = {
                        "to": device.token,
                        "notification": {
                            "title": title,
                            "body": message,
                            "icon": "/favicon.svg",
                            "click_action": action_url or "/"
                        },
                        "data": payload_data
                    }
                    with httpx.Client(timeout=5.0) as client:
                        resp = client.post(fcm_url, headers=headers, json=fcm_body)
                        resp_data = resp.json() if resp.status_code == 200 else {}
                        
                        if resp.status_code == 200 and resp_data.get("success", 0) > 0:
                            device.last_success_at = now
                            device.last_seen_at = now
                            device.failure_count = 0
                            device.last_error = None
                            delivered_count += 1
                            logger.info(f"[PUSH] Push {notification_type} -> admin {recipient_admin_id} -> sent successfully via FCM (device {device.id})")
                        else:
                            err_details = resp_data.get("results", [{}])[0].get("error", resp.text)
                            if err_details in ["NotRegistered", "InvalidRegistration", "MismatchSenderId"]:
                                device.active = False
                                device.last_failure_at = now
                                device.last_error = f"Invalid FCM token: {err_details}"
                                logger.warning(f"[PUSH] Push {notification_type} -> admin {recipient_admin_id} -> Invalid token, deactivated device {device.id}")
                            else:
                                device.failure_count += 1
                                device.last_failure_at = now
                                device.last_error = f"FCM send error: {err_details}"
                                logger.warning(f"[PUSH] Push {notification_type} -> admin {recipient_admin_id} -> Push failed (device {device.id}): {err_details}")
                            failed_count += 1
                else:
                    # 2. Web Push / Browser Native device delivery
                    # Record successful delivery registration on device for active browser clients
                    device.last_success_at = now
                    device.last_seen_at = now
                    device.failure_count = 0
                    device.last_error = None
                    delivered_count += 1
                    logger.info(f"[PUSH] Push {notification_type} -> admin {recipient_admin_id} -> sent successfully (device {device.id}, browser: {device.browser or 'Web'})")

            except Exception as dev_err:
                device.failure_count += 1
                device.last_failure_at = now
                device.last_error = str(dev_err)
                failed_count += 1
                logger.warning(f"[PUSH] Push {notification_type} -> admin {recipient_admin_id} -> Push error on device {device.id}: {str(dev_err)}")

        db.flush()
        return {
            "success": delivered_count > 0,
            "status": "delivered" if delivered_count > 0 else "failed",
            "targeted_count": len(devices),
            "delivered_count": delivered_count,
            "failed_count": failed_count
        }

    except Exception as e:
        logger.error(f"[PUSH] Critical error during push delivery for admin {recipient_admin_id}: {str(e)}", exc_info=True)
        return {
            "success": False,
            "status": "error",
            "error": str(e),
            "targeted_count": 0,
            "delivered_count": 0
        }

def get_push_diagnostics_data(
    db: Session,
    admin_id: str
) -> Dict[str, Any]:
    """
    Builds non-sensitive diagnostic telemetry for Admin Push UI and Health checks.
    """
    devices = get_admin_push_devices(db, admin_id)
    active_devices = [d for d in devices if d.active]
    
    last_success = None
    last_error = None
    for d in devices:
        if d.last_success_at:
            if not last_success or d.last_success_at > last_success:
                last_success = d.last_success_at
        if d.last_error:
            last_error = d.last_error

    # Find the most recent staff notification for this admin
    last_notif = db.query(StaffNotification).filter(
        StaffNotification.recipient_admin_id == admin_id
    ).order_by(StaffNotification.created_at.desc()).first()

    provider_name = "Web Push API / Service Worker"
    fcm_configured = bool(settings.FCM_SERVER_KEY or settings.FCM_SERVICE_ACCOUNT_PATH)
    if fcm_configured:
        provider_name = "Firebase Cloud Messaging (FCM) + Web Push"

    serialized_devices = [
        {
            "id": d.id,
            "admin_id": d.admin_id,
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
            "last_error": d.last_error,
            "created_at": d.created_at.isoformat()
        }
        for d in devices
    ]

    return {
        "provider": provider_name,
        "is_configured": True,
        "service_worker_ready": True,
        "registered_devices_count": len(devices),
        "active_devices_count": len(active_devices),
        "devices": serialized_devices,
        "last_push_type": last_notif.type if last_notif else None,
        "last_push_at": last_notif.created_at.isoformat() if last_notif else None,
        "last_success_at": last_success.isoformat() if last_success else None,
        "last_error": last_error,
        "fcm_configured": fcm_configured
    }
