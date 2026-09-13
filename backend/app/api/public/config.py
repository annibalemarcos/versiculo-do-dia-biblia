from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_app_id
from app.models.app import App, AppConfig, FeatureFlag
from app.models.monetization import AdConfig, AdPlacement, PremiumProduct

router = APIRouter(prefix="/app", tags=["Public App Configuration"])

@router.get("/config")
def get_public_app_config(
    app_id: str = Depends(get_current_app_id),
    db: Session = Depends(get_db)
):
    """
    Returns live application configuration, maintenance state, minimum version,
    feature flags, ad placements, and premium products for mobile and web clients.
    """
    app = db.query(App).filter(App.id == app_id).first()
    config = db.query(AppConfig).filter(AppConfig.app_id == app_id).first()
    
    # Feature Flags
    flags = db.query(FeatureFlag).filter(FeatureFlag.app_id == app_id).all()
    feature_map = {f.key: f.enabled for f in flags}

    # Ad Placements
    placements = db.query(AdPlacement).filter(AdPlacement.app_id == app_id, AdPlacement.enabled == True).all()
    placement_list = [
        {
            "name": p.name,
            "provider": p.provider,
            "platform": p.platform,
            "ad_unit_id": p.ad_unit_id_masked,
            "format": p.format,
            "min_interval_seconds": p.min_interval_seconds,
            "max_per_session": p.max_per_session,
            "free_only": p.free_only
        }
        for p in placements
    ]

    # Ad Config
    ad_cfg = db.query(AdConfig).filter(AdConfig.app_id == app_id).first()
    monetization_info = {
        "ads_enabled": ad_cfg.ads_global_enabled if ad_cfg else True,
        "admob_app_id": ad_cfg.admob_app_id_masked if ad_cfg else "",
        "ump_consent_required": ad_cfg.ump_consent_required if ad_cfg else True,
        "test_mode": ad_cfg.test_mode if ad_cfg else False
    }

    # Available Premium Products
    products = db.query(PremiumProduct).filter(PremiumProduct.app_id == app_id, PremiumProduct.status == "active").all()
    products_list = [
        {
            "id": prod.id,
            "product_id": prod.product_id,
            "base_plan_id": prod.base_plan_id,
            "offer_id": prod.offer_id,
            "product_type": prod.product_type,
            "title": prod.title,
            "description": prod.description,
            "reference_price": prod.reference_price,
            "entitlements": prod.entitlements
        }
        for prod in products
    ]

    return {
        "success": True,
        "data": {
            "app_id": app_id,
            "app_name": app.name if app else "Bíblia",
            "app_mode": getattr(config, "app_mode", "TEST") if config else "TEST",
            "maintenance": config.maintenance_mode if config else False,
            "maintenance_message": config.maintenance_message if config else "Estamos em manutenção.",
            "minimum_supported_version": config.minimum_supported_version if config else 1,
            "latest_version": config.latest_version if config else 1,
            "force_update": config.force_update if config else False,
            "store_url": config.store_url if config else None,
            "features": feature_map,
            "monetization": monetization_info,
            "placements": placement_list,
            "premium_products": products_list,
            "custom_settings": config.custom_settings if config else {}
        }
    }
