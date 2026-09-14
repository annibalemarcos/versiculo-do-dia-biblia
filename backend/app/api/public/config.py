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
    Includes structured governance and operational controls.
    """
    app = db.query(App).filter(App.id == app_id).first()
    config = db.query(AppConfig).filter(AppConfig.app_id == app_id).first()
    
    # Feature Flags from feature_flags table
    flags = db.query(FeatureFlag).filter(FeatureFlag.app_id == app_id).all()
    feature_map = {f.key: f.enabled for f in flags}

    # Merge model-level governance flags into feature_map for backward compatibility
    if config:
        feature_map["notifications"] = config.notifications_enabled
        feature_map["support"] = config.support_enabled
        feature_map["cloud_sync"] = config.cloud_sync_enabled
        feature_map["devotionals"] = config.devotionals_enabled
        feature_map["search"] = config.search_enabled
        feature_map["sharing"] = config.sharing_enabled
        feature_map["offline_download"] = getattr(config, "offline_download_enabled", True)
        feature_map["google_login"] = config.google_login_enabled
        feature_map["premium"] = config.premium_enabled
        feature_map["purchases"] = config.purchases_enabled
        feature_map["registration"] = config.registration_enabled
    else:
        feature_map.setdefault("notifications", True)
        feature_map.setdefault("support", True)
        feature_map.setdefault("cloud_sync", True)
        feature_map.setdefault("devotionals", True)
        feature_map.setdefault("search", True)
        feature_map.setdefault("sharing", True)
        feature_map.setdefault("offline_download", True)
        feature_map.setdefault("google_login", False)
        feature_map.setdefault("premium", True)
        feature_map.setdefault("purchases", True)
        feature_map.setdefault("registration", True)

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

    # Structured governance blocks
    maintenance_enabled = config.maintenance_mode if config else False
    maintenance_level = getattr(config, "maintenance_level", "informational") if config else "informational"
    maintenance_title = getattr(config, "maintenance_title", None) if config else None
    maintenance_msg = config.maintenance_message if config else "Estamos em manutenção preventiva."
    estimated_end = getattr(config, "maintenance_estimated_end", None) if config else None
    estimated_end_iso = estimated_end.isoformat() if estimated_end else None

    reg_enabled = getattr(config, "registration_enabled", True) if config else True
    google_login = getattr(config, "google_login_enabled", False) if config else False

    purchases_enabled = getattr(config, "purchases_enabled", True) if config else True
    premium_enabled = getattr(config, "premium_enabled", True) if config else True

    features_block = {
        "notifications": getattr(config, "notifications_enabled", True) if config else True,
        "support": getattr(config, "support_enabled", True) if config else True,
        "cloud_sync": getattr(config, "cloud_sync_enabled", True) if config else True,
        "devotionals": getattr(config, "devotionals_enabled", True) if config else True,
        "search": getattr(config, "search_enabled", True) if config else True,
        "sharing": getattr(config, "sharing_enabled", True) if config else True,
        "offline_download": getattr(config, "offline_download_enabled", True) if config else True,
    }

    return {
        "success": True,
        "data": {
            "app_id": app_id,
            "app_name": app.name if app else "Bíblia",
            "app_mode": getattr(config, "app_mode", "TEST") if config else "TEST",
            "maintenance_enabled": maintenance_enabled,
            "maintenance_level": maintenance_level,
            "maintenance_title": maintenance_title,
            "maintenance_message": maintenance_msg,
            "maintenance_estimated_end": estimated_end_iso,
            "registration_enabled": reg_enabled,
            "purchases_enabled": purchases_enabled,
            "premium_enabled": premium_enabled,
            "notifications_enabled": features_block["notifications"],
            "support_enabled": features_block["support"],
            "cloud_sync_enabled": features_block["cloud_sync"],
            "devotionals_enabled": features_block["devotionals"],
            "search_enabled": features_block["search"],
            "sharing_enabled": features_block["sharing"],
            "offline_download_enabled": features_block["offline_download"],
            "google_login_enabled": google_login,
            "maintenance": {
                "enabled": maintenance_enabled,
                "level": maintenance_level,
                "title": maintenance_title,
                "message": maintenance_msg,
                "estimated_end": estimated_end_iso
            },
            "registration": {
                "enabled": reg_enabled,
                "google_login_enabled": google_login
            },
            "commerce": {
                "purchases_enabled": purchases_enabled,
                "premium_enabled": premium_enabled
            },
            "features": features_block,
            # Legacy flat fields for backwards compatibility with existing clients
            "legacy_maintenance": maintenance_enabled,
            "maintenance_message": maintenance_msg,
            "minimum_supported_version": config.minimum_supported_version if config else 1,
            "latest_version": config.latest_version if config else 1,
            "force_update": config.force_update if config else False,
            "store_url": config.store_url if config else None,
            "feature_flags": feature_map,
            "monetization": monetization_info,
            "placements": placement_list,
            "premium_products": products_list,
            "custom_settings": config.custom_settings if config else {}
        }
    }
