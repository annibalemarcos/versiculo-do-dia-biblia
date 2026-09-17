from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.errors import NotFoundException, ConflictException
from app.models.app import FeatureFlag
from app.schemas.app import FeatureFlagCreate, FeatureFlagUpdate, FeatureFlagResponse
from app.services.audit_service import log_admin_action

router = APIRouter(prefix="/feature-flags", tags=["Admin Feature Flags"])

@router.get("")
def list_feature_flags(
    app_id: str = "verse_daily",
    admin = Depends(require_permission("feature_flags.read")),
    db: Session = Depends(get_db)
):
    flags = db.query(FeatureFlag).filter(FeatureFlag.app_id == app_id).all()
    return {
        "success": True,
        "data": [
            {
                "id": f.id,
                "app_id": f.app_id,
                "key": f.key,
                "enabled": f.enabled,
                "platform": f.platform,
                "description": f.description,
                "rules": f.rules,
                "updated_at": f.updated_at.isoformat()
            }
            for f in flags
        ]
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_feature_flag(
    body: FeatureFlagCreate,
    request: Request,
    admin = Depends(require_permission("feature_flags.write")),
    db: Session = Depends(get_db)
):
    existing = db.query(FeatureFlag).filter(
        FeatureFlag.app_id == body.app_id,
        FeatureFlag.key == body.key
    ).first()

    if existing:
        raise ConflictException(f"Feature flag '{body.key}' já existe para o app '{body.app_id}'")

    flag = FeatureFlag(
        app_id=body.app_id,
        key=body.key,
        enabled=body.enabled,
        platform=body.platform,
        description=body.description,
        rules=body.rules or {}
    )
    db.add(flag)
    db.commit()
    db.refresh(flag)

    log_admin_action(
        db=db,
        admin=admin,
        action="feature_flag_created",
        resource_type="feature_flag",
        resource_id=flag.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"key": flag.key, "enabled": flag.enabled}
    )

    return {"success": True, "data": {"id": flag.id, "key": flag.key}}

@router.put("/{flag_id}")
def update_feature_flag(
    flag_id: str,
    body: FeatureFlagUpdate,
    request: Request,
    admin = Depends(require_permission("feature_flags.write")),
    db: Session = Depends(get_db)
):
    flag = db.query(FeatureFlag).filter(FeatureFlag.id == flag_id).first()
    if not flag:
        raise NotFoundException("Feature flag não encontrada")

    if body.enabled is not None:
        flag.enabled = body.enabled
    if body.platform is not None:
        flag.platform = body.platform
    if body.description is not None:
        flag.description = body.description
    if body.rules is not None:
        flag.rules = body.rules

    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="feature_flag_updated",
        resource_type="feature_flag",
        resource_id=flag.id,
        ip_address=request.client.host if request.client else None,
        meta_data={"key": flag.key, "enabled": flag.enabled}
    )

    return {"success": True, "message": "Feature flag atualizada com sucesso"}

@router.delete("/{flag_id}")
def delete_feature_flag(
    flag_id: str,
    request: Request,
    admin = Depends(require_permission("feature_flags.write")),
    db: Session = Depends(get_db)
):
    flag = db.query(FeatureFlag).filter(FeatureFlag.id == flag_id).first()
    if not flag:
        raise NotFoundException("Feature flag não encontrada")

    key = flag.key
    db.delete(flag)
    db.commit()

    log_admin_action(
        db=db,
        admin=admin,
        action="feature_flag_deleted",
        resource_type="feature_flag",
        resource_id=flag_id,
        ip_address=request.client.host if request.client else None,
        meta_data={"key": key}
    )

    return {"success": True, "message": "Feature flag excluída com sucesso"}
