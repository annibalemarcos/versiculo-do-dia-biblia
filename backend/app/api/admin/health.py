from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.services.health_service import check_system_health, test_provider_connection, test_all_providers

router = APIRouter(prefix="/health", tags=["Admin System Health"])

@router.get("")
def get_admin_system_health(
    admin = Depends(require_permission("system.health")),
    db: Session = Depends(get_db)
):
    health = check_system_health(db)
    return {
        "success": True,
        "data": health
    }

@router.post("/test-all")
def test_all_admin_system_providers(
    admin = Depends(require_permission("system.health")),
    db: Session = Depends(get_db)
):
    result = test_all_providers(db)
    return {
        "success": True,
        "data": result
    }

@router.post("/test/{provider_id}")
def test_admin_system_provider(
    provider_id: str,
    admin = Depends(require_permission("system.health")),
    db: Session = Depends(get_db)
):
    result = test_provider_connection(provider_id, db)
    return {
        "success": True,
        "data": result
    }

