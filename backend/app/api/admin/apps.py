from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.errors import NotFoundException, ConflictException
from app.models.app import App, AppConfig
from app.schemas.app import AppCreate, AppUpdate, AppResponse, AppConfigUpdate, AppConfigResponse
from app.services.audit_service import log_admin_action

router = APIRouter(prefix="/apps", tags=["Admin Multi-App Management"])

@router.get("")
def list_apps(
    admin = Depends(require_permission("apps.read")),
    db: Session = Depends(get_db)
):
    apps = db.query(App).all()
    return {
        "success": True,
        "data": [
            {
                "id": a.id,
                "name": a.name,
                "package_id": a.package_id,
                "platform": a.platform,
                "status": a.status,
                "default_language": a.default_language,
                "description": a.description,
                "created_at": a.created_at.isoformat(),
                "updated_at": a.updated_at.isoformat()
            }
            for a in apps
        ]
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_app(
    body: AppCreate,
    request: Request,
    admin = Depends(require_permission("apps.write")),
    db: Session = Depends(get_db)
):
    existing = db.query(App).filter(App.id == body.id).first()
    if existing:
        raise ConflictException(f"Aplicativo com id '{body.id}' já existe")

    app = App(
        id=body.id,
        name=body.name,
        package_id=body.package_id,
        platform=body.platform,
        status=body.status,
        default_language=body.default_language,
        description=body.description
    )
    db.add(app)
    db.flush()

    # Initialize default app config
    cfg = AppConfig(
        app_id=app.id,
        maintenance_mode=False,
        maintenance_message="O aplicativo está temporariamente em manutenção.",
        minimum_supported_version=1,
        latest_version=1,
        force_update=False
    )
    db.add(cfg)
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="app_created",
        resource_type="app",
        resource_id=app.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"name": app.name, "package_id": app.package_id}
    )

    return {"success": True, "data": {"id": app.id, "name": app.name}}

@router.get("/{app_id}/config")
def get_app_config(
    app_id: str,
    admin = Depends(require_permission("apps.read")),
    db: Session = Depends(get_db)
):
    cfg = db.query(AppConfig).filter(AppConfig.app_id == app_id).first()
    if not cfg:
        raise NotFoundException("Configuração do aplicativo não encontrada")

    return {
        "success": True,
        "data": {
            "app_id": cfg.app_id,
            "maintenance_mode": cfg.maintenance_mode,
            "maintenance_level": getattr(cfg, "maintenance_level", "informational"),
            "maintenance_title": getattr(cfg, "maintenance_title", None),
            "maintenance_message": cfg.maintenance_message,
            "maintenance_estimated_end": cfg.maintenance_estimated_end.isoformat() if getattr(cfg, "maintenance_estimated_end", None) else None,
            "registration_enabled": getattr(cfg, "registration_enabled", True),
            "authentication_system_enabled": getattr(cfg, "authentication_system_enabled", True),
            "login_enabled": getattr(cfg, "login_enabled", True),
            "local_auth_enabled": getattr(cfg, "local_auth_enabled", True),
            "google_auth_enabled": getattr(cfg, "google_auth_enabled", False),
            "google_auth_status": getattr(cfg, "google_auth_status", "coming_soon"),
            "logout_enabled": getattr(cfg, "logout_enabled", True),
            "purchases_enabled": getattr(cfg, "purchases_enabled", True),
            "premium_enabled": getattr(cfg, "premium_enabled", True),
            "notifications_enabled": getattr(cfg, "notifications_enabled", True),
            "support_enabled": getattr(cfg, "support_enabled", True),
            "cloud_sync_enabled": getattr(cfg, "cloud_sync_enabled", True),
            "devotionals_enabled": getattr(cfg, "devotionals_enabled", True),
            "search_enabled": getattr(cfg, "search_enabled", True),
            "sharing_enabled": getattr(cfg, "sharing_enabled", True),
            "offline_download_enabled": getattr(cfg, "offline_download_enabled", True),
            "google_login_enabled": getattr(cfg, "google_login_enabled", False),
            "updated_by": getattr(cfg, "updated_by", None),
            "minimum_supported_version": cfg.minimum_supported_version,
            "latest_version": cfg.latest_version,
            "force_update": cfg.force_update,
            "store_url": cfg.store_url,
            "app_mode": getattr(cfg, "app_mode", "TEST"),
            "custom_settings": cfg.custom_settings,
            "updated_at": cfg.updated_at.isoformat()
        }
    }

@router.put("/{app_id}/config")
def update_app_config(
    app_id: str,
    body: AppConfigUpdate,
    request: Request,
    admin = Depends(require_permission("apps.write")),
    db: Session = Depends(get_db)
):
    cfg = db.query(AppConfig).filter(AppConfig.app_id == app_id).first()
    if not cfg:
        cfg = AppConfig(app_id=app_id)
        db.add(cfg)

    # Validate maintenance level
    if body.maintenance_level is not None:
        if body.maintenance_level not in ["informational", "partial", "full"]:
            from app.core.errors import BadRequestException
            raise BadRequestException("Nível de manutenção inválido. Permitidos: informational, partial, full")
        cfg.maintenance_level = body.maintenance_level

    if body.maintenance_mode is not None:
        cfg.maintenance_mode = body.maintenance_mode
    if "maintenance_title" in body.model_fields_set:
        cfg.maintenance_title = body.maintenance_title
    if body.maintenance_message is not None:
        cfg.maintenance_message = body.maintenance_message
    if "maintenance_estimated_end" in body.model_fields_set:
        cfg.maintenance_estimated_end = body.maintenance_estimated_end

    if body.registration_enabled is not None:
        cfg.registration_enabled = body.registration_enabled
    if body.authentication_system_enabled is not None:
        cfg.authentication_system_enabled = body.authentication_system_enabled
    if body.login_enabled is not None:
        cfg.login_enabled = body.login_enabled
    if body.local_auth_enabled is not None:
        cfg.local_auth_enabled = body.local_auth_enabled
    if body.google_auth_enabled is not None:
        cfg.google_auth_enabled = body.google_auth_enabled
        cfg.google_login_enabled = body.google_auth_enabled
    if body.google_auth_status is not None:
        if body.google_auth_status not in ["enabled", "disabled", "coming_soon"]:
            from app.core.errors import BadRequestException
            raise BadRequestException("Status do Google Auth inválido. Permitidos: enabled, disabled, coming_soon")
        cfg.google_auth_status = body.google_auth_status
    if body.logout_enabled is not None:
        cfg.logout_enabled = body.logout_enabled
    if body.purchases_enabled is not None:
        cfg.purchases_enabled = body.purchases_enabled
    if body.premium_enabled is not None:
        cfg.premium_enabled = body.premium_enabled
    if body.notifications_enabled is not None:
        cfg.notifications_enabled = body.notifications_enabled
    if body.support_enabled is not None:
        cfg.support_enabled = body.support_enabled
    if body.cloud_sync_enabled is not None:
        cfg.cloud_sync_enabled = body.cloud_sync_enabled
    if body.devotionals_enabled is not None:
        cfg.devotionals_enabled = body.devotionals_enabled
    if body.search_enabled is not None:
        cfg.search_enabled = body.search_enabled
    if body.sharing_enabled is not None:
        cfg.sharing_enabled = body.sharing_enabled
    if body.offline_download_enabled is not None:
        cfg.offline_download_enabled = body.offline_download_enabled
    if body.google_login_enabled is not None:
        cfg.google_login_enabled = body.google_login_enabled

    cfg.updated_by = getattr(admin, "id", None) or getattr(admin, "email", "admin")

    if body.minimum_supported_version is not None:
        cfg.minimum_supported_version = body.minimum_supported_version
    if body.latest_version is not None:
        cfg.latest_version = body.latest_version
    if body.force_update is not None:
        cfg.force_update = body.force_update
    if body.store_url is not None:
        cfg.store_url = body.store_url
    if body.app_mode is not None:
        cfg.app_mode = body.app_mode
    if body.custom_settings is not None:
        cfg.custom_settings = body.custom_settings

    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="app_config_updated",
        resource_type="app_config",
        resource_id=app_id,
        ip_address=request.client.host if request.client else None,
        meta_data={
            "maintenance_mode": cfg.maintenance_mode,
            "maintenance_level": cfg.maintenance_level,
            "registration_enabled": cfg.registration_enabled,
            "purchases_enabled": cfg.purchases_enabled,
            "premium_enabled": cfg.premium_enabled,
            "force_update": cfg.force_update
        }
    )

    return {"success": True, "message": "Configurações do aplicativo atualizadas com sucesso"}
