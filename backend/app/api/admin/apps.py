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
            "maintenance_message": cfg.maintenance_message,
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

    if body.maintenance_mode is not None:
        cfg.maintenance_mode = body.maintenance_mode
    if body.maintenance_message is not None:
        cfg.maintenance_message = body.maintenance_message
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
        meta_data={"maintenance_mode": cfg.maintenance_mode, "force_update": cfg.force_update}
    )

    return {"success": True, "message": "Configurações do aplicativo atualizadas com sucesso"}
