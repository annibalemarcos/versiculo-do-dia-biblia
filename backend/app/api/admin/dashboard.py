from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_permission, get_current_app_id
from app.services.analytics_service import get_dashboard_metrics

router = APIRouter(prefix="/dashboard", tags=["Admin Dashboard"])

@router.get("")
@router.get("/metrics")
def get_admin_dashboard(
    preset: str = Query("executive", enum=["executive", "product", "monetization", "operations"]),
    app_id: str = Query("verse_daily"),
    period: str = Query("30d", enum=["today", "7d", "30d", "90d", "year", "custom"]),
    admin = Depends(require_permission("dashboard.read")),
    db: Session = Depends(get_db)
):
    """
    Returns executive metrics, audience graphs, revenue breakdowns, unit economics,
    retention, top themes, and operations health tailored to selected presets.
    """
    data = get_dashboard_metrics(
        db=db,
        preset=preset,
        app_id=app_id,
        period=period
    )
    return {
        "success": True,
        "data": data
    }
