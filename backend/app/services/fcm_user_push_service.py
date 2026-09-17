import os
import json
import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone, timedelta
import urllib.request
import urllib.error
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.core.config import settings
from app.models.base import utc_now
from app.models.notification import (
    NotificationCampaign,
    NotificationDelivery,
    UserNotification,
    UserPushDevice
)
from app.models.monetization import UserSubscription

logger = logging.getLogger("fcm_push_service")
logging.basicConfig(level=logging.INFO)

# Global holder for Firebase App
_firebase_app = None
_firebase_init_attempted = False

def mask_token(token: str) -> str:
    """Safely masks device token for logging and diagnostic telemetry."""
    if not token:
        return ""
    if len(token) <= 12:
        return token[:3] + "..." + token[-3:]
    return token[:6] + "..." + token[-6:]

def get_firebase_app():
    """
    Initializes and returns the Firebase Admin App singleton if credentials are provided.
    Supports:
    1. Direct credentials JSON string via settings.FCM_CREDENTIALS_JSON or env var
    2. Service account JSON file path via settings.FCM_SERVICE_ACCOUNT_PATH or env var
    3. Google Application Default Credentials (ADC)
    """
    global _firebase_app, _firebase_init_attempted
    if _firebase_app is not None:
        return _firebase_app
    if _firebase_init_attempted:
        return None

    _firebase_init_attempted = True
    try:
        import firebase_admin
        from firebase_admin import credentials

        # Check if already initialized in the runtime
        if firebase_admin._apps:
            _firebase_app = firebase_admin.get_app()
            logger.info("[FCM] Attached to existing Firebase Admin App instance")
            return _firebase_app

        cred = None
        # 1. Inline JSON credentials
        raw_json = settings.FCM_CREDENTIALS_JSON or os.getenv("FCM_CREDENTIALS_JSON", "")
        if raw_json and raw_json.strip():
            try:
                cert_dict = json.loads(raw_json)
                cred = credentials.Certificate(cert_dict)
                logger.info("[FCM] Initializing Firebase Admin SDK via FCM_CREDENTIALS_JSON")
            except Exception as json_err:
                logger.warning(f"[FCM] Failed to parse FCM_CREDENTIALS_JSON: {json_err}")

        # 2. File path to service account
        if cred is None:
            cred_path = settings.FCM_SERVICE_ACCOUNT_PATH or os.getenv("FCM_SERVICE_ACCOUNT_PATH", "")
            if cred_path and os.path.exists(cred_path):
                try:
                    cred = credentials.Certificate(cred_path)
                    logger.info(f"[FCM] Initializing Firebase Admin SDK via service account file at {cred_path}")
                except Exception as path_err:
                    logger.warning(f"[FCM] Failed to load service account file from {cred_path}: {path_err}")

        # 3. Google Application Default Credentials
        if cred is None:
            try:
                cred = credentials.ApplicationDefault()
                logger.info("[FCM] Initializing Firebase Admin SDK via Application Default Credentials (ADC)")
            except Exception:
                cred = None

        if cred is not None:
            init_options = {}
            project_id = settings.FCM_PROJECT_ID or os.getenv("FCM_PROJECT_ID", "")
            if project_id:
                init_options["projectId"] = project_id
            _firebase_app = firebase_admin.initialize_app(cred, options=init_options if init_options else None)
            logger.info("[FCM] Firebase Admin SDK successfully initialized")
            return _firebase_app
        else:
            logger.info("[FCM] No Firebase service account credentials found. Checking fallback providers (FCM Server Key / Simulation)")

    except ImportError:
        logger.info("[FCM] firebase-admin package not loaded in this environment. Using HTTP v1 / REST fallback")
    except Exception as e:
        logger.warning(f"[FCM] Firebase Admin SDK initialization failed: {e}")

    return None

def get_fcm_delivery_mode() -> str:
    """
    Returns active FCM delivery mode:
    - 'firebase_admin_v1': Google Firebase Admin SDK with Service Account
    - 'legacy_server_key': Direct FCM REST API with Server Key
    - 'simulation': Safe local development simulation
    """
    if get_firebase_app() is not None:
        return "firebase_admin_v1"
    server_key = settings.FCM_SERVER_KEY or os.getenv("FCM_SERVER_KEY", "")
    if server_key and server_key.strip():
        return "legacy_server_key"
    return "simulation"

def send_fcm_multicast(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None,
    deep_link: Optional[str] = None
) -> Dict[str, Any]:
    """
    Multicast FCM push dispatcher.
    Chunks tokens into batches of 500 (standard Firebase limit).
    Returns dictionary with:
      - success_count (int)
      - failure_count (int)
      - successful_tokens (list)
      - failed_tokens (list)
      - invalid_tokens (list) - tokens to deactivate in DB
      - mode (str)
    """
    if not tokens:
        return {
            "success_count": 0,
            "failure_count": 0,
            "successful_tokens": [],
            "failed_tokens": [],
            "invalid_tokens": [],
            "mode": get_fcm_delivery_mode()
        }

    payload_data = {
        "title": title,
        "message": body,
        "body": body,
        "deep_link": deep_link or "daily_verse",
        "sent_at": utc_now().isoformat()
    }
    if data:
        for k, v in data.items():
            payload_data[str(k)] = str(v)

    mode = get_fcm_delivery_mode()
    total_successful: List[str] = []
    total_failed: List[str] = []
    invalid_tokens: List[str] = []

    # Process in chunks of 500
    chunk_size = 500
    for i in range(0, len(tokens), chunk_size):
        chunk = tokens[i:i + chunk_size]

        if mode == "firebase_admin_v1":
            try:
                from firebase_admin import messaging
                message = messaging.MulticastMessage(
                    notification=messaging.Notification(
                        title=title,
                        body=body
                    ),
                    data=payload_data,
                    tokens=chunk,
                    android=messaging.AndroidConfig(
                        priority="high",
                        notification=messaging.AndroidNotification(
                            channel_id="daily_verse_channel",
                            icon="ic_notification",
                            sound="default"
                        )
                    )
                )
                response = messaging.send_each_for_multicast(message)
                for idx, resp in enumerate(response.responses):
                    token = chunk[idx]
                    if resp.success:
                        total_successful.append(token)
                    else:
                        total_failed.append(token)
                        err_code = resp.exception.code if resp.exception else ""
                        err_msg = str(resp.exception) if resp.exception else ""
                        if any(inv in err_code.lower() or inv in err_msg.lower() for inv in [
                            "notregistered", "invalidregistration", "registration-token-not-registered",
                            "invalid-registration-token", "mismatchsenderid"
                        ]):
                            invalid_tokens.append(token)
                logger.info(f"[FCM] Firebase Admin multicast sent: {response.success_count} success, {response.failure_count} failure")

            except Exception as fb_err:
                logger.error(f"[FCM] Error during Firebase Admin multicast: {fb_err}", exc_info=True)
                total_failed.extend(chunk)

        elif mode == "legacy_server_key":
            server_key = settings.FCM_SERVER_KEY or os.getenv("FCM_SERVER_KEY", "")
            fcm_url = "https://fcm.googleapis.com/fcm/send"
            headers = {
                "Authorization": f"key={server_key}",
                "Content-Type": "application/json"
            }
            body_payload = {
                "registration_ids": chunk,
                "notification": {
                    "title": title,
                    "body": body,
                    "sound": "default",
                    "click_action": deep_link or "FLUTTER_NOTIFICATION_CLICK"
                },
                "data": payload_data,
                "priority": "high"
            }
            try:
                post_bytes = json.dumps(body_payload).encode("utf-8")
                req = urllib.request.Request(fcm_url, data=post_bytes, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=10.0) as resp:
                    resp_body = resp.read().decode("utf-8")
                    resp_json = json.loads(resp_body)
                    results = resp_json.get("results", [])
                    for idx, res in enumerate(results):
                        token = chunk[idx]
                        if "message_id" in res:
                            total_successful.append(token)
                        else:
                            total_failed.append(token)
                            err = res.get("error", "")
                            if err in ["NotRegistered", "InvalidRegistration", "MismatchSenderId"]:
                                invalid_tokens.append(token)
            except urllib.error.HTTPError as http_err:
                logger.warning(f"[FCM] Legacy FCM endpoint HTTP {http_err.code}: {http_err.read().decode('utf-8', errors='ignore')}")
                total_failed.extend(chunk)
            except Exception as net_err:
                logger.error(f"[FCM] Error during FCM HTTP call: {net_err}")
                total_failed.extend(chunk)

        else:
            # Simulation / Development fallback
            logger.info(f"[FCM - SIMULATION] Dispatched push '{title}' to {len(chunk)} mock device tokens")
            total_successful.extend(chunk)

    return {
        "success_count": len(total_successful),
        "failure_count": len(total_failed),
        "successful_tokens": total_successful,
        "failed_tokens": total_failed,
        "invalid_tokens": invalid_tokens,
        "mode": mode
    }

def update_device_statuses_after_push(
    db: Session,
    successful_tokens: List[str],
    failed_tokens: List[str],
    invalid_tokens: List[str],
    error_summary: Optional[str] = None
):
    """
    Updates UserPushDevice records after a push dispatch:
    - Sets last_success_at and clears failure count for successful tokens
    - Deactivates invalid/unregistered tokens (active = False)
    - Records failure telemetry for failed tokens
    """
    now = utc_now()

    if successful_tokens:
        db.query(UserPushDevice).filter(
            UserPushDevice.token.in_(successful_tokens)
        ).update({
            "last_seen_at": now,
            "last_success_at": now,
            "failure_count": 0,
            "last_error": None
        }, synchronize_session=False)

    if invalid_tokens:
        db.query(UserPushDevice).filter(
            UserPushDevice.token.in_(invalid_tokens)
        ).update({
            "active": False,
            "last_failure_at": now,
            "failure_count": UserPushDevice.failure_count + 1,
            "last_error": "Token desativado: Não registrado no Firebase (NotRegistered)"
        }, synchronize_session=False)
        logger.info(f"[FCM] Deactivated {len(invalid_tokens)} invalid/unregistered push tokens")

    if failed_tokens:
        remaining_failed = [t for t in failed_tokens if t not in invalid_tokens]
        if remaining_failed:
            db.query(UserPushDevice).filter(
                UserPushDevice.token.in_(remaining_failed)
            ).update({
                "last_failure_at": now,
                "failure_count": UserPushDevice.failure_count + 1,
                "last_error": error_summary or "FCM delivery failed"
            }, synchronize_session=False)

    db.flush()

def get_target_device_tokens(
    db: Session,
    app_id: str,
    target_audience: str = "all"
) -> Tuple[List[str], List[Optional[str]]]:
    """
    Fetches active device tokens and corresponding user_ids filtered by target audience:
    - 'all': All active devices for this app_id
    - 'free_users': Devices belonging to users without active premium subscriptions
    - 'premium_users': Devices belonging to users with active subscriptions
    - 'inactive_7d': Devices with last_seen_at older than 7 days
    """
    query = db.query(UserPushDevice).filter(
        UserPushDevice.app_id == app_id,
        UserPushDevice.active == True
    )

    now = utc_now()

    if target_audience == "premium_users":
        active_sub_user_ids = db.query(UserSubscription.user_id).filter(
            UserSubscription.status == "active",
            or_(UserSubscription.expires_at == None, UserSubscription.expires_at > now)
        ).subquery()
        query = query.filter(UserPushDevice.user_id.in_(active_sub_user_ids))

    elif target_audience == "free_users":
        active_sub_user_ids = db.query(UserSubscription.user_id).filter(
            UserSubscription.status == "active",
            or_(UserSubscription.expires_at == None, UserSubscription.expires_at > now)
        ).subquery()
        query = query.filter(or_(
            UserPushDevice.user_id == None,
            ~UserPushDevice.user_id.in_(active_sub_user_ids)
        ))

    elif target_audience == "inactive_7d":
        seven_days_ago = now - timedelta(days=7)
        query = query.filter(UserPushDevice.last_seen_at < seven_days_ago)

    devices = query.all()
    tokens = [d.token for d in devices if d.token]
    user_ids = [d.user_id for d in devices]
    return tokens, user_ids

def dispatch_campaign(
    db: Session,
    campaign: NotificationCampaign
) -> Dict[str, Any]:
    """
    Dispatches a NotificationCampaign immediately via FCM:
    1. Locks campaign by setting status = 'sending'
    2. Identifies targeted user push devices
    3. Broadcasts in-app UserNotification record
    4. Transmits FCM multicast payload to devices
    5. Updates UserPushDevice health and deactivates dead tokens
    6. Records NotificationDelivery entries
    7. Updates campaign statistics: target_count, success_count, failure_count, status = 'sent'
    """
    if campaign.status in ["sent", "cancelled"]:
        return {
            "success": True,
            "campaign_id": campaign.id,
            "status": campaign.status,
            "message": f"Campanha já finalizada com status '{campaign.status}'"
        }

    now = utc_now()
    campaign.status = "sending"
    db.flush()

    tokens, user_ids = get_target_device_tokens(
        db=db,
        app_id=campaign.app_id,
        target_audience=campaign.target_audience
    )

    # In-app notification creation so users also see it in their notification bell center
    broadcast_notif = UserNotification(
        user_id=None,  # Null = Broadcast to all users of this app
        app_id=campaign.app_id,
        title=campaign.title,
        message=campaign.message,
        type="campaign",
        deep_link=campaign.deep_link or "daily_verse",
        is_read=False
    )
    db.add(broadcast_notif)

    if not tokens:
        logger.info(f"[FCM] Campaign {campaign.id} ('{campaign.title}'): No active devices registered for audience '{campaign.target_audience}'")
        campaign.status = "sent"
        campaign.sent_at = now
        campaign.target_count = 0
        campaign.success_count = 0
        campaign.failure_count = 0
        campaign.error_summary = "Nenhum dispositivo push ativo registrado para o público-alvo selecionado."
        db.commit()
        return {
            "success": True,
            "campaign_id": campaign.id,
            "status": "sent",
            "target_count": 0,
            "success_count": 0,
            "failure_count": 0
        }

    # Execute FCM push
    fcm_result = send_fcm_multicast(
        tokens=tokens,
        title=campaign.title,
        body=campaign.message,
        data={
            "campaign_id": campaign.id,
            "deep_link": campaign.deep_link or "daily_verse",
            "app_id": campaign.app_id,
            "type": "campaign"
        },
        deep_link=campaign.deep_link
    )

    # Sync device records
    update_device_statuses_after_push(
        db=db,
        successful_tokens=fcm_result["successful_tokens"],
        failed_tokens=fcm_result["failed_tokens"],
        invalid_tokens=fcm_result["invalid_tokens"],
        error_summary=f"FCM failure ({fcm_result['mode']})"
    )

    # Record delivery tracking for distinct targeted users
    unique_users = set(u for u in user_ids if u)
    for u_id in list(unique_users)[:500]:  # Cap records per campaign to protect DB performance
        delivery = NotificationDelivery(
            campaign_id=campaign.id,
            user_id=u_id,
            status="sent",
            delivered_at=now
        )
        db.add(delivery)

    success_cnt = fcm_result["success_count"]
    failure_cnt = fcm_result["failure_count"]

    campaign.target_count = len(tokens)
    campaign.success_count = success_cnt
    campaign.failure_count = failure_cnt
    campaign.sent_at = now
    campaign.status = "sent" if success_cnt > 0 or len(tokens) == 0 else "failed"
    if failure_cnt > 0:
        campaign.error_summary = f"{failure_cnt} envios falharam. Modo FCM: {fcm_result['mode']}."
    else:
        campaign.error_summary = None

    db.commit()
    logger.info(f"[FCM] Campaign {campaign.id} completed. Sent: {success_cnt}/{len(tokens)}, Failed: {failure_cnt}")

    return {
        "success": True,
        "campaign_id": campaign.id,
        "title": campaign.title,
        "status": campaign.status,
        "target_count": len(tokens),
        "success_count": success_cnt,
        "failure_count": failure_cnt,
        "delivery_mode": fcm_result["mode"]
    }

def process_due_scheduled_campaigns(db: Session) -> Dict[str, Any]:
    """
    Cron / background task executor:
    Scans for campaigns where status == 'scheduled' and scheduled_at <= utc_now(),
    and triggers immediate dispatch for each due campaign.
    """
    now = utc_now()
    due_campaigns = db.query(NotificationCampaign).filter(
        NotificationCampaign.status == "scheduled",
        NotificationCampaign.scheduled_at <= now
    ).order_by(NotificationCampaign.scheduled_at.asc()).all()

    if not due_campaigns:
        return {
            "success": True,
            "processed_count": 0,
            "message": "Nenhuma notificação agendada pendente para envio."
        }

    logger.info(f"[FCM SCHEDULER] Found {len(due_campaigns)} scheduled campaigns ready for dispatch")
    results = []
    for campaign in due_campaigns:
        try:
            res = dispatch_campaign(db=db, campaign=campaign)
            results.append(res)
        except Exception as camp_err:
            logger.error(f"[FCM SCHEDULER] Failed to dispatch scheduled campaign {campaign.id}: {camp_err}", exc_info=True)
            campaign.status = "failed"
            campaign.error_summary = f"Erro no agendador: {str(camp_err)}"
            db.commit()
            results.append({
                "success": False,
                "campaign_id": campaign.id,
                "error": str(camp_err)
            })

    return {
        "success": True,
        "processed_count": len(due_campaigns),
        "results": results
    }

def get_fcm_service_status(db: Session, app_id: str = "verse_daily") -> Dict[str, Any]:
    """
    Returns non-sensitive health and configuration telemetry for FCM user push notifications.
    """
    mode = get_fcm_delivery_mode()
    has_credentials = mode in ["firebase_admin_v1", "legacy_server_key"]

    total_active_devices = db.query(UserPushDevice).filter(
        UserPushDevice.app_id == app_id,
        UserPushDevice.active == True
    ).count()

    android_devices = db.query(UserPushDevice).filter(
        UserPushDevice.app_id == app_id,
        UserPushDevice.active == True,
        UserPushDevice.platform == "android"
    ).count()

    ios_devices = db.query(UserPushDevice).filter(
        UserPushDevice.app_id == app_id,
        UserPushDevice.active == True,
        UserPushDevice.platform == "ios"
    ).count()

    scheduled_pending = db.query(NotificationCampaign).filter(
        NotificationCampaign.app_id == app_id,
        NotificationCampaign.status == "scheduled"
    ).count()

    last_campaign = db.query(NotificationCampaign).filter(
        NotificationCampaign.app_id == app_id,
        NotificationCampaign.status.in_(["sent", "failed"])
    ).order_by(desc(NotificationCampaign.sent_at)).first()

    return {
        "delivery_mode": mode,
        "is_configured": has_credentials,
        "provider_description": (
            "Google Firebase Cloud Messaging (HTTP v1 / Admin SDK)"
            if mode == "firebase_admin_v1"
            else "Firebase Cloud Messaging (Legacy Server Key)"
            if mode == "legacy_server_key"
            else "Modo de Simulação / Teste Local (Pronto para Chave FCM de Produção)"
        ),
        "registered_active_devices": total_active_devices,
        "android_devices_count": android_devices,
        "ios_devices_count": ios_devices,
        "scheduled_campaigns_pending": scheduled_pending,
        "last_dispatch_at": last_campaign.sent_at.isoformat() if last_campaign and last_campaign.sent_at else None,
        "last_dispatch_status": last_campaign.status if last_campaign else None,
        "last_dispatch_title": last_campaign.title if last_campaign else None
    }
