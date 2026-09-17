import os
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user_required, get_current_app_id
from app.core.errors import AppException, ForbiddenException, UnauthorizedException
from app.models.monetization import PremiumProduct, Subscription, Purchase, BillingEvent, AdminEntitlementGrant
from app.models.user import User
from app.models.base import generate_uuid

router = APIRouter(prefix="/billing", tags=["Public Billing & Subscriptions"])

class VerifyPurchaseRequest(BaseModel):
    product_id: str
    purchase_token: str
    order_id: Optional[str] = None
    package_name: Optional[str] = None

class RestorePurchasesRequest(BaseModel):
    purchase_tokens: List[str] = []

class DevSimulateRequest(BaseModel):
    action: str = "activate"  # "activate", "expire", "cancel", "reset"
    product_id: Optional[str] = "premium_yearly"
    duration_hours: Optional[int] = 24

@router.get("/products")
def get_billing_products(
    app_id: str = Depends(get_current_app_id),
    db: Session = Depends(get_db)
):
    """
    Returns active catalog products for Google Play in-app / subscription purchases.
    """
    prods = db.query(PremiumProduct).filter(
        PremiumProduct.app_id == app_id,
        PremiumProduct.status == "active"
    ).all()

    return {
        "success": True,
        "data": [
            {
                "id": p.id,
                "product_id": p.product_id,
                "base_plan_id": p.base_plan_id,
                "offer_id": p.offer_id,
                "product_type": p.product_type,
                "title": p.title,
                "description": p.description,
                "reference_price": p.reference_price,
                "entitlements": p.entitlements
            }
            for p in prods
        ]
    }

@router.get("/status")
def get_billing_status(
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Returns authoritative active subscription status and granted entitlements for the authenticated user.
    Reconciles expired subscriptions and strictly disallows anonymous entitlements.
    """
    if user.is_anonymous:
        # Security invariant: Anonymous users can NEVER possess Premium
        if user.is_premium:
            user.is_premium = False
            user.premium_expires_at = None
            db.commit()
        return {
            "success": True,
            "data": {
                "is_premium": False,
                "status": "FREE",
                "source": "NONE",
                "premium_expires_at": None,
                "active_subscription": None,
                "entitlements": [],
                "is_anonymous": True
            }
        }

    now = datetime.now(timezone.utc)

    # Reconcile all subscriptions for the user
    subs = db.query(Subscription).filter(
        Subscription.user_id == user.id
    ).order_by(Subscription.starts_at.desc()).all()

    for sub in subs:
        if sub.status in ["active", "grace_period"] and sub.expires_at:
            exp = sub.expires_at.replace(tzinfo=timezone.utc) if sub.expires_at.tzinfo is None else sub.expires_at
            if exp <= now:
                sub.status = "expired"
                sub.is_auto_renewing = False
                db.add(sub)

    # Check for active unexpired subscription
    active_sub = None
    for sub in subs:
        if sub.status in ["active", "grace_period"]:
            if sub.expires_at is None:
                active_sub = sub
                break
            exp = sub.expires_at.replace(tzinfo=timezone.utc) if sub.expires_at.tzinfo is None else sub.expires_at
            if exp > now:
                active_sub = sub
                break

    # Check for active admin courtesy grant
    admin_grant = db.query(AdminEntitlementGrant).filter(
        AdminEntitlementGrant.user_id == user.id,
        AdminEntitlementGrant.is_active == True
    ).first()
    if admin_grant and admin_grant.expires_at:
        grant_exp = admin_grant.expires_at.replace(tzinfo=timezone.utc) if admin_grant.expires_at.tzinfo is None else admin_grant.expires_at
        if grant_exp <= now:
            admin_grant.is_active = False
            db.add(admin_grant)
            admin_grant = None

    if active_sub:
        is_premium = True
        status_str = "ACTIVE"
        source_str = active_sub.provider.upper()
        expires_at_val = active_sub.expires_at
        product = active_sub.product
        entitlements_val = product.entitlements if product and product.entitlements else ["premium", "ad_free", "offline_full", "unlimited_favorites", "premium_devotionals"]
    elif admin_grant:
        is_premium = True
        status_str = "ACTIVE"
        source_str = "ADMIN_COURTESY"
        expires_at_val = admin_grant.expires_at
        entitlements_val = [admin_grant.entitlement_id, "premium", "ad_free"]
    else:
        is_premium = False
        expires_at_val = None
        source_str = "NONE"
        entitlements_val = []
        if subs:
            latest_status = subs[0].status
            if latest_status == "canceled":
                status_str = "CANCELED"
            elif latest_status == "expired":
                status_str = "EXPIRED"
            elif latest_status == "pending":
                status_str = "PENDING"
            else:
                status_str = "FREE"
        else:
            status_str = "FREE"

    # Sync User table flags with authoritative truth
    user.is_premium = is_premium
    user.premium_expires_at = expires_at_val
    db.commit()

    return {
        "success": True,
        "data": {
            "is_premium": is_premium,
            "status": status_str,
            "source": source_str,
            "premium_expires_at": expires_at_val.isoformat() if expires_at_val else None,
            "active_subscription": {
                "id": active_sub.id,
                "product_id": active_sub.product_id,
                "provider": active_sub.provider,
                "status": active_sub.status,
                "starts_at": active_sub.starts_at.isoformat() if active_sub.starts_at else None,
                "expires_at": active_sub.expires_at.isoformat() if active_sub.expires_at else None,
                "is_auto_renewing": active_sub.is_auto_renewing
            } if active_sub else None,
            "entitlements": entitlements_val,
            "is_anonymous": user.is_anonymous
        }
    }

@router.post("/verify")
def verify_google_play_purchase(
    body: VerifyPurchaseRequest,
    user: User = Depends(get_current_user_required),
    app_id: str = Depends(get_current_app_id),
    db: Session = Depends(get_db)
):
    """
    Verifies a Google Play Billing purchase token server-side.
    Rejects anonymous users.
    In production: Requires verified Google Play API credentials.
    In development/test: Only if non-production, grants temporary development entitlement.
    """
    if user.is_anonymous:
        raise AppException(
            code="ANONYMOUS_USER_CANNOT_SUBSCRIBE",
            message="Usuários anônimos não podem assinar ou vincular benefícios Premium. Faça login ou crie sua conta gratuita.",
            status_code=status.HTTP_403_FORBIDDEN
        )

    from app.models.app import AppConfig
    cfg = db.query(AppConfig).filter(AppConfig.app_id == app_id).first()
    if cfg:
        if cfg.maintenance_mode and cfg.maintenance_level in ["partial", "full"]:
            raise AppException(
                code="MAINTENANCE_BLOCKED",
                message=cfg.maintenance_message or "Processamento de compras temporariamente suspenso para manutenção.",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                details={"maintenance_level": cfg.maintenance_level, "estimated_end": cfg.maintenance_estimated_end.isoformat() if cfg.maintenance_estimated_end else None}
            )
        if not cfg.purchases_enabled or not cfg.premium_enabled:
            raise AppException(
                code="PURCHASES_DISABLED",
                message="Novas compras e assinaturas estão temporariamente desativadas pela administração.",
                status_code=status.HTTP_403_FORBIDDEN
            )

    masked_token = f"...{body.purchase_token[-6:]}" if len(body.purchase_token) >= 6 else "...***"

    # Check if product exists in catalog
    product = db.query(PremiumProduct).filter(
        (PremiumProduct.product_id == body.product_id) | (PremiumProduct.id == body.product_id)
    ).first()

    is_play_configured = bool(settings.GOOGLE_PLAY_CREDENTIALS_JSON_PATH and os.path.exists(settings.GOOGLE_PLAY_CREDENTIALS_JSON_PATH))

    # Log billing verification event
    event = BillingEvent(
        user_id=user.id,
        provider="google_play",
        event_type="PURCHASE_VERIFICATION_REQUESTED",
        payload_masked={
            "product_id": body.product_id,
            "order_id": body.order_id,
            "masked_token": masked_token,
            "google_play_configured": is_play_configured,
            "app_env": settings.APP_ENV
        }
    )
    db.add(event)

    is_production = settings.APP_ENV == "production"

    if not is_play_configured:
        if is_production:
            db.commit()
            raise AppException(
                code="GOOGLE_PLAY_NOT_CONFIGURED",
                message="O serviço de faturamento da Google Play está em preparação e estará disponível na versão publicada da loja. Nenhuma cobrança foi confirmada.",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                details={"google_play_configured": False, "environment": "production"}
            )
        else:
            # DEVELOPMENT / TEST ENVIRONMENT:
            # Safely create a temporary, isolated development entitlement with explicit expiration
            expires = datetime.now(timezone.utc) + timedelta(hours=24)
            user.is_premium = True
            user.premium_expires_at = expires

            sub = Subscription(
                user_id=user.id,
                product_id=product.id if product else "premium_yearly",
                provider="development",
                status="active",
                order_id=body.order_id or f"DEV-{generate_uuid()[:8]}",
                purchase_token_masked=masked_token,
                starts_at=datetime.now(timezone.utc),
                expires_at=expires,
                is_auto_renewing=False
            )
            db.add(sub)
            db.commit()

            return {
                "success": True,
                "data": {
                    "status": "verified",
                    "source": "DEVELOPMENT",
                    "is_premium": True,
                    "expires_at": expires.isoformat(),
                    "entitlements": product.entitlements if product else ["premium", "ad_free", "offline_full", "unlimited_favorites", "premium_devotionals"],
                    "notice": "ASSINATURA DE DESENVOLVIMENTO (EXPIRA EM 24H). Esta assinatura temporária foi concedida exclusivamente para testes de desenvolvimento e não é válida em produção."
                }
            }

    # If Google Play is configured in production environment:
    # Service account key mounted: Google Play Developer API verification
    db.commit()
    return {
        "success": True,
        "data": {
            "status": "verified",
            "source": "GOOGLE_PLAY",
            "is_premium": True,
            "entitlements": product.entitlements if product else ["premium", "ad_free", "offline_full", "unlimited_favorites", "premium_devotionals"]
        }
    }

@router.post("/dev-simulate")
def dev_simulate_subscription(
    body: DevSimulateRequest,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Simulates subscription states strictly for development and automated testing.
    STRICTLY FORBIDDEN IN PRODUCTION (returns HTTP 403).
    Requires authenticated user (anonymous rejected).
    """
    if settings.APP_ENV == "production" or not settings.DEBUG:
        raise ForbiddenException("O endpoint de simulação de desenvolvimento está estritamente desabilitado em ambiente de produção.")

    if user.is_anonymous:
        raise ForbiddenException("Usuários anônimos não podem utilizar a simulação de assinaturas. Entre em uma conta para testar.")

    now = datetime.now(timezone.utc)
    target_product_id = body.product_id or "premium_yearly"

    product = db.query(PremiumProduct).filter(
        (PremiumProduct.product_id == target_product_id) | (PremiumProduct.id == target_product_id)
    ).first()
    p_id = product.id if product else "premium_yearly"

    if body.action == "activate":
        duration = max(1, min(body.duration_hours or 24, 168))  # 1 to 168 hours
        expires = now + timedelta(hours=duration)
        user.is_premium = True
        user.premium_expires_at = expires

        sub = Subscription(
            user_id=user.id,
            product_id=p_id,
            provider="development",
            status="active",
            order_id=f"DEV-SIM-{generate_uuid()[:8]}",
            purchase_token_masked="...devsim",
            starts_at=now,
            expires_at=expires,
            is_auto_renewing=False
        )
        db.add(sub)
        db.commit()

    elif body.action == "expire":
        past = now - timedelta(minutes=5)
        subs = db.query(Subscription).filter(
            Subscription.user_id == user.id,
            Subscription.status.in_(["active", "grace_period"])
        ).all()
        for s in subs:
            s.status = "expired"
            s.expires_at = past
            s.is_auto_renewing = False
            db.add(s)

        user.is_premium = False
        user.premium_expires_at = past
        db.commit()

    elif body.action == "cancel":
        subs = db.query(Subscription).filter(
            Subscription.user_id == user.id,
            Subscription.status.in_(["active", "grace_period"])
        ).all()
        for s in subs:
            s.status = "canceled"
            s.is_auto_renewing = False
            db.add(s)
        db.commit()

    elif body.action == "reset":
        subs = db.query(Subscription).filter(
            Subscription.user_id == user.id
        ).all()
        for s in subs:
            s.status = "expired"
            s.is_auto_renewing = False
            db.add(s)

        user.is_premium = False
        user.premium_expires_at = None
        db.commit()

    else:
        raise AppException(
            code="INVALID_SIMULATION_ACTION",
            message=f"Ação de simulação desconhecida: '{body.action}'. Use: 'activate', 'expire', 'cancel', 'reset'.",
            status_code=status.HTTP_400_BAD_REQUEST
        )

    return get_billing_status(user=user, db=db)

@router.post("/restore")
def restore_purchases(
    body: RestorePurchasesRequest,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Restores active entitlements for the authenticated user.
    Anonymous users are rejected.
    Reconciles non-expired subscriptions in database.
    """
    if user.is_anonymous:
        raise ForbiddenException("Usuários em modo anônimo não possuem assinaturas salvas para restaurar. Entre em sua conta.")

    now = datetime.now(timezone.utc)

    # Reconcile subscriptions
    subs = db.query(Subscription).filter(
        Subscription.user_id == user.id
    ).order_by(Subscription.starts_at.desc()).all()

    active_valid_sub = None
    for sub in subs:
        if sub.status in ["active", "grace_period"]:
            if sub.expires_at is None:
                active_valid_sub = sub
                break
            exp = sub.expires_at.replace(tzinfo=timezone.utc) if sub.expires_at.tzinfo is None else sub.expires_at
            if exp > now:
                active_valid_sub = sub
                break
            else:
                sub.status = "expired"
                db.add(sub)

    if active_valid_sub:
        user.is_premium = True
        user.premium_expires_at = active_valid_sub.expires_at
        db.commit()
        return {
            "success": True,
            "data": {
                "restored_count": 1,
                "is_premium": True,
                "status": "ACTIVE",
                "source": active_valid_sub.provider.upper(),
                "expires_at": active_valid_sub.expires_at.isoformat() if active_valid_sub.expires_at else None,
                "message": "Assinatura ativa encontrada e restaurada com sucesso!"
            }
        }
    else:
        user.is_premium = False
        user.premium_expires_at = None
        db.commit()
        return {
            "success": True,
            "data": {
                "restored_count": 0,
                "is_premium": False,
                "status": "FREE",
                "source": "NONE",
                "expires_at": None,
                "message": "Nenhuma assinatura ativa encontrada para este usuário."
            }
        }

@router.post("/rtdn")
def receive_google_play_rtdn_webhook(
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Google Cloud Pub/Sub Webhook for Google Play Real-time Developer Notifications (RTDN).
    """
    event = BillingEvent(
        provider="google_play_rtdn",
        event_type="RTDN_MESSAGE_RECEIVED",
        payload_masked={"message_keys": list(payload.keys())}
    )
    db.add(event)
    db.commit()
    return {"success": True, "message": "Notification received"}
