import os
from typing import Optional, List
from fastapi import APIRouter, Depends, Request, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import require_permission
from app.core.errors import NotFoundException, ConflictException
from app.models.monetization import (
    PremiumProduct, AdPlacement, AdConfig, Subscription, Purchase, Entitlement
)
from app.models.user import User
from app.schemas.monetization import (
    PremiumProductCreate, PremiumProductUpdate, AdPlacementCreate, AdPlacementUpdate,
    SimulatorInput, SimulatorOutput, MonetizationDiagnosticResponse, DiagnosticItem,
    ScenarioCreate
)
from app.services.simulation_service import calculate_monetization_projection
from app.services.audit_service import log_admin_action

router = APIRouter(prefix="/monetization", tags=["Admin Monetization Hub"])

# --- Overview Real Metrics ---
@router.get("/overview")
def get_monetization_overview(
    app_id: str = "verse_daily",
    admin = Depends(require_permission("monetization.read")),
    db: Session = Depends(get_db)
):
    from sqlalchemy import func
    # Real user stats
    premium_users_count = db.query(func.count(User.id)).filter(
        User.app_id == app_id,
        User.is_premium == True,
        User.is_deleted == False
    ).scalar() or 0

    free_users_count = db.query(func.count(User.id)).filter(
        User.app_id == app_id,
        User.is_premium == False,
        User.is_deleted == False
    ).scalar() or 0

    # Active subscriptions
    active_subs_count = db.query(func.count(Subscription.id)).filter(
        Subscription.status == "ACTIVE"
    ).scalar() or 0

    # Active catalog items
    total_products_count = db.query(func.count(PremiumProduct.id)).filter(
        PremiumProduct.app_id == app_id
    ).scalar() or 0

    active_products_count = db.query(func.count(PremiumProduct.id)).filter(
        PremiumProduct.app_id == app_id,
        PremiumProduct.status == "active"
    ).scalar() or 0

    total_placements_count = db.query(func.count(AdPlacement.id)).filter(
        AdPlacement.app_id == app_id
    ).scalar() or 0

    active_placements_count = db.query(func.count(AdPlacement.id)).filter(
        AdPlacement.app_id == app_id,
        AdPlacement.enabled == True
    ).scalar() or 0

    # Real purchases total revenue
    real_revenue_cents = db.query(func.sum(Purchase.amount_cents)).filter(
        Purchase.status == "COMPLETED"
    ).scalar() or 0

    is_play_configured = bool(settings.GOOGLE_PLAY_CREDENTIALS_JSON_PATH and os.path.exists(settings.GOOGLE_PLAY_CREDENTIALS_JSON_PATH))
    has_admob = bool(settings.ADMOB_APP_ID_ANDROID)

    return {
        "success": True,
        "data": {
            "premium_users_count": premium_users_count,
            "free_users_count": free_users_count,
            "total_users_count": premium_users_count + free_users_count,
            "active_subscriptions_count": active_subs_count,
            "total_products_count": total_products_count,
            "active_products_count": active_products_count,
            "total_placements_count": total_placements_count,
            "active_placements_count": active_placements_count,
            "real_revenue_cents": real_revenue_cents,
            "real_revenue_formatted": f"R$ {(real_revenue_cents / 100):,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "providers_status": {
                "google_play": "configured" if is_play_configured else "not_configured",
                "admob": "configured" if has_admob else "not_configured",
                "ump": "configured",
                "adsense": "configured" if settings.ADSENSE_CLIENT_ID else "not_configured"
            }
        }
    }

# --- Premium Products Catalog ---
@router.get("/products")
def list_premium_products(
    app_id: str = "verse_daily",
    admin = Depends(require_permission("monetization.read")),
    db: Session = Depends(get_db)
):
    prods = db.query(PremiumProduct).filter(PremiumProduct.app_id == app_id).all()
    return {
        "success": True,
        "data": [
            {
                "id": p.id,
                "app_id": p.app_id,
                "product_id": p.product_id,
                "base_plan_id": p.base_plan_id,
                "offer_id": p.offer_id,
                "product_type": p.product_type,
                "title": p.title,
                "description": p.description,
                "reference_price": p.reference_price,
                "status": p.status,
                "entitlements": p.entitlements,
                "created_at": p.created_at.isoformat(),
                "updated_at": p.updated_at.isoformat()
            }
            for p in prods
        ]
    }

@router.post("/products", status_code=status.HTTP_201_CREATED)
def create_premium_product(
    body: PremiumProductCreate,
    request: Request,
    admin = Depends(require_permission("monetization.write")),
    db: Session = Depends(get_db)
):
    existing = db.query(PremiumProduct).filter(PremiumProduct.id == body.id).first()
    if existing:
        raise ConflictException(f"Produto '{body.id}' já existe")

    prod = PremiumProduct(
        id=body.id,
        app_id=body.app_id,
        product_id=body.product_id,
        base_plan_id=body.base_plan_id,
        offer_id=body.offer_id,
        product_type=body.product_type,
        title=body.title,
        description=body.description,
        reference_price=body.reference_price,
        status=body.status,
        entitlements=body.entitlements
    )
    db.add(prod)
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="premium_product_created",
        resource_type="premium_product",
        resource_id=prod.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"title": prod.title, "product_id": prod.product_id}
    )

    return {"success": True, "data": {"id": prod.id, "title": prod.title}}

@router.put("/products/{product_id}")
def update_premium_product(
    product_id: str,
    body: PremiumProductUpdate,
    request: Request,
    admin = Depends(require_permission("monetization.write")),
    db: Session = Depends(get_db)
):
    prod = db.query(PremiumProduct).filter(PremiumProduct.id == product_id).first()
    if not prod:
        raise NotFoundException("Produto não encontrado")

    if body.title is not None:
        prod.title = body.title
    if body.description is not None:
        prod.description = body.description
    if body.reference_price is not None:
        prod.reference_price = body.reference_price
    if body.status is not None:
        prod.status = body.status
    if body.entitlements is not None:
        prod.entitlements = body.entitlements
    if body.base_plan_id is not None:
        prod.base_plan_id = body.base_plan_id
    if body.offer_id is not None:
        prod.offer_id = body.offer_id
    if body.product_type is not None:
        prod.product_type = body.product_type
    if body.product_id is not None:
        prod.product_id = body.product_id

    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="premium_product_updated",
        resource_type="premium_product",
        resource_id=prod.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"title": prod.title, "status": prod.status}
    )

    return {"success": True, "message": "Produto atualizado com sucesso"}

@router.post("/products/{product_id}/status")
def change_premium_product_status(
    product_id: str,
    status_val: str = Query(..., regex="^(active|inactive|archived)$"),
    request: Request = None,
    admin = Depends(require_permission("monetization.write")),
    db: Session = Depends(get_db)
):
    prod = db.query(PremiumProduct).filter(PremiumProduct.id == product_id).first()
    if not prod:
        raise NotFoundException("Produto não encontrado")

    prod.status = status_val
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action=f"premium_product_status_{status_val}",
        resource_type="premium_product",
        resource_id=prod.id,
        ip_address=request.client.host if request and request.client else None,
        meta_data={"title": prod.title, "status": prod.status}
    )

    return {"success": True, "data": {"id": prod.id, "status": prod.status}}

@router.delete("/products/{product_id}")
def delete_premium_product(
    product_id: str,
    request: Request,
    admin = Depends(require_permission("monetization.write")),
    db: Session = Depends(get_db)
):
    prod = db.query(PremiumProduct).filter(PremiumProduct.id == product_id).first()
    if not prod:
        raise NotFoundException("Produto não encontrado")

    db.delete(prod)
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="premium_product_deleted",
        resource_type="premium_product",
        resource_id=product_id,
        ip_address=request.client.host if request.client else None,
        meta_data={"product_id": product_id}
    )

    return {"success": True, "message": "Produto excluído com sucesso"}

# --- Ad Placements ---
@router.get("/placements")
def list_ad_placements(
    app_id: str = "verse_daily",
    admin = Depends(require_permission("monetization.read")),
    db: Session = Depends(get_db)
):
    placements = db.query(AdPlacement).filter(AdPlacement.app_id == app_id).all()
    return {
        "success": True,
        "data": [
            {
                "id": p.id,
                "app_id": p.app_id,
                "name": p.name,
                "provider": p.provider,
                "platform": p.platform,
                "ad_unit_id_masked": p.ad_unit_id_masked,
                "format": p.format,
                "enabled": p.enabled,
                "min_interval_seconds": p.min_interval_seconds,
                "max_per_session": p.max_per_session,
                "free_only": p.free_only,
                "created_at": p.created_at.isoformat(),
                "updated_at": p.updated_at.isoformat()
            }
            for p in placements
        ]
    }

@router.post("/placements", status_code=status.HTTP_201_CREATED)
def create_ad_placement(
    body: AdPlacementCreate,
    request: Request,
    admin = Depends(require_permission("monetization.write")),
    db: Session = Depends(get_db)
):
    placement = AdPlacement(
        app_id=body.app_id,
        name=body.name,
        provider=body.provider,
        platform=body.platform,
        ad_unit_id_masked=body.ad_unit_id_masked,
        format=body.format,
        enabled=body.enabled,
        min_interval_seconds=body.min_interval_seconds,
        max_per_session=body.max_per_session,
        free_only=body.free_only
    )
    db.add(placement)
    db.commit()
    db.refresh(placement)

    log_admin_action(
        db=db,
        admin=admin,
        action="ad_placement_created",
        resource_type="ad_placement",
        resource_id=placement.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"name": placement.name, "provider": placement.provider}
    )

    return {"success": True, "data": {"id": placement.id, "name": placement.name}}

@router.put("/placements/{placement_id}")
def update_ad_placement(
    placement_id: str,
    body: AdPlacementUpdate,
    request: Request,
    admin = Depends(require_permission("monetization.write")),
    db: Session = Depends(get_db)
):
    p = db.query(AdPlacement).filter(AdPlacement.id == placement_id).first()
    if not p:
        raise NotFoundException("Posicionamento de anúncio não encontrado")

    if body.provider is not None:
        p.provider = body.provider
    if body.platform is not None:
        p.platform = body.platform
    if body.ad_unit_id_masked is not None:
        p.ad_unit_id_masked = body.ad_unit_id_masked
    if body.format is not None:
        p.format = body.format
    if body.enabled is not None:
        p.enabled = body.enabled
    if body.min_interval_seconds is not None:
        p.min_interval_seconds = body.min_interval_seconds
    if body.max_per_session is not None:
        p.max_per_session = body.max_per_session
    if body.free_only is not None:
        p.free_only = body.free_only

    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="ad_placement_updated",
        resource_type="ad_placement",
        resource_id=p.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"name": p.name, "enabled": p.enabled}
    )

    return {"success": True, "message": "Posicionamento atualizado com sucesso"}

@router.delete("/placements/{placement_id}")
def delete_ad_placement(
    placement_id: str,
    request: Request,
    admin = Depends(require_permission("monetization.write")),
    db: Session = Depends(get_db)
):
    p = db.query(AdPlacement).filter(AdPlacement.id == placement_id).first()
    if not p:
        raise NotFoundException("Posicionamento não encontrado")

    name = p.name
    db.delete(p)
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="ad_placement_deleted",
        resource_type="ad_placement",
        resource_id=placement_id,
        ip_address=request.client.host if request.client else None,
        meta_data={"name": name}
    )

    return {"success": True, "message": "Posicionamento excluído com sucesso"}

# --- Subscriptions & Transactions Monitoring ---
@router.get("/subscriptions")
def list_subscriptions(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    admin = Depends(require_permission("monetization.read")),
    db: Session = Depends(get_db)
):
    query = db.query(Subscription).options(
        joinedload(Subscription.user),
        joinedload(Subscription.product)
    )
    if status:
        query = query.filter(Subscription.status == status)

    subs = query.order_by(desc(Subscription.created_at)).limit(limit).all()

    return {
        "success": True,
        "data": [
            {
                "id": s.id,
                "user_id": s.user_id,
                "user_email": s.user.email if s.user else "Anônimo",
                "product_id": s.product_id,
                "product_title": s.product.title if s.product else s.product_id,
                "provider": s.provider,
                "status": s.status,
                "order_id": s.order_id,
                "purchase_token_masked": s.purchase_token_masked,
                "starts_at": s.starts_at.isoformat(),
                "renews_at": s.renews_at.isoformat() if s.renews_at else None,
                "expires_at": s.expires_at.isoformat() if s.expires_at else None,
                "is_auto_renewing": s.is_auto_renewing
            }
            for s in subs
        ]
    }

@router.get("/transactions")
def list_transactions(
    limit: int = Query(50, ge=1, le=100),
    admin = Depends(require_permission("monetization.read")),
    db: Session = Depends(get_db)
):
    purchases = db.query(Purchase).options(
        joinedload(Purchase.user),
        joinedload(Purchase.product)
    ).order_by(desc(Purchase.purchased_at)).limit(limit).all()

    return {
        "success": True,
        "data": [
            {
                "id": p.id,
                "user_id": p.user_id,
                "user_email": p.user.email if p.user else "Anônimo",
                "product_id": p.product_id,
                "product_title": p.product.title if p.product else p.product_id,
                "provider": p.provider,
                "order_id": p.order_id,
                "amount_cents": p.amount_cents,
                "currency": p.currency,
                "status": p.status,
                "purchased_at": p.purchased_at.isoformat()
            }
            for p in purchases
        ]
    }

# --- Monetization Simulator ---
@router.post("/simulator")
def run_monetization_simulator(
    body: SimulatorInput,
    admin = Depends(require_permission("monetization.read"))
):
    """
    Simulates financial projections (Ads vs Premium, MRR, ARR, ARPU, 12m roadmap).
    Explicitly branded as SIMULAÇÃO / PROJEÇÃO.
    """
    output = calculate_monetization_projection(body)
    return {
        "success": True,
        "data": output
    }

# --- Monetization Diagnostics ---
@router.get("/diagnostic")
def get_monetization_diagnostic(
    admin = Depends(require_permission("monetization.read")),
    db: Session = Depends(get_db)
):
    is_play_configured = bool(settings.GOOGLE_PLAY_CREDENTIALS_JSON_PATH and os.path.exists(settings.GOOGLE_PLAY_CREDENTIALS_JSON_PATH))
    has_admob = bool(settings.ADMOB_APP_ID_ANDROID)

    items = [
        DiagnosticItem(
            category="Android In-App / Subscriptions",
            provider="Google Play Billing",
            status="configured" if is_play_configured else "external_config_required",
            details=f"Package: {settings.GOOGLE_PLAY_PACKAGE_NAME}. " + ("Chave de serviço pronta." if is_play_configured else "JSON da Service Account do Google Play Console pendente."),
            recommendation="Fazer upload do arquivo de credenciais Service Account do Google Cloud / Play Console para verificação de recibos em produção." if not is_play_configured else "Serviço operacional."
        ),
        DiagnosticItem(
            category="Android Ads",
            provider="Google AdMob",
            status="configured" if has_admob else "external_config_required",
            details="App ID e blocos de anúncios configurados." if has_admob else "Variável ADMOB_APP_ID_ANDROID pendente.",
            recommendation="Configurar IDs dos blocos reais de banner e intersticial no painel AdMob para Android."
        ),
        DiagnosticItem(
            category="Privacy & Consent",
            provider="Google UMP (Consent SDK)",
            status="configured",
            details="SDK de consentimento e mensagens GDPR/LGPD preparado para inicialização no app.",
            recommendation="Manter formulário de consentimento ativo para usuários da União Europeia e Brasil."
        ),
        DiagnosticItem(
            category="Web Monetization",
            provider="Google AdSense",
            status="configured" if settings.ADSENSE_CLIENT_ID else "external_config_required",
            details="Cliente AdSense configurado para versão Web." if settings.ADSENSE_CLIENT_ID else "Configuração separada e independente do AdMob mobile.",
            recommendation="Utilizar apenas em páginas Web públicas, sem misturar com SDKs nativos mobile."
        )
    ]

    return {
        "success": True,
        "data": {
            "overall_status": "configured" if is_play_configured and has_admob else "external_config_required",
            "items": items
        }
    }

# --- Saved Financial Scenarios ---

@router.get("/scenarios")
def list_financial_scenarios(
    app_id: str = "verse_daily",
    admin = Depends(require_permission("monetization.read")),
    db: Session = Depends(get_db)
):
    from app.models.monetization import FinancialScenario
    scenarios = db.query(FinancialScenario).filter(FinancialScenario.app_id == app_id).order_by(desc(FinancialScenario.created_at)).all()
    return {
        "success": True,
        "data": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "parameters": s.parameters,
                "projection_summary": s.projection_summary,
                "created_at": s.created_at.isoformat()
            }
            for s in scenarios
        ]
    }

@router.post("/scenarios", status_code=status.HTTP_201_CREATED)
def save_financial_scenario(
    body: ScenarioCreate,
    admin = Depends(require_permission("monetization.write")),
    db: Session = Depends(get_db)
):
    from app.models.monetization import FinancialScenario
    scenario = FinancialScenario(
        app_id=body.app_id,
        name=body.name,
        description=body.description,
        created_by_admin_id=admin.id,
        parameters=body.parameters,
        projection_summary=body.projection_summary
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)

    return {
        "success": True,
        "data": {
            "id": scenario.id,
            "name": scenario.name,
            "created_at": scenario.created_at.isoformat()
        }
    }

@router.delete("/scenarios/{scenario_id}")
def delete_financial_scenario(
    scenario_id: str,
    admin = Depends(require_permission("monetization.write")),
    db: Session = Depends(get_db)
):
    from app.models.monetization import FinancialScenario
    sc = db.query(FinancialScenario).filter(FinancialScenario.id == scenario_id).first()
    if not sc:
        raise NotFoundException("Cenário não encontrado")
    db.delete(sc)
    db.commit()
    return {"success": True, "message": "Cenário excluído com sucesso"}

