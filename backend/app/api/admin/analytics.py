from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models.analytics import AnalyticsEvent, AnalyticsDailyAggregate
from app.services.analytics_service import get_dashboard_metrics

router = APIRouter(prefix="/analytics", tags=["Admin Analytics & Telemetry"])

@router.get("/metrics")
def get_analytics_metrics(
    preset: str = Query("executive"),
    period: str = Query("30d"),
    app_id: str = Query("verse_daily"),
    admin = Depends(require_permission("analytics.read")),
    db: Session = Depends(get_db)
):
    return {
        "success": True,
        "data": get_dashboard_metrics(db=db, preset=preset, app_id=app_id, period=period)
    }

@router.get("/events")
def list_raw_events(
    event_name: Optional[str] = Query(None),
    app_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    admin = Depends(require_permission("analytics.read")),
    db: Session = Depends(get_db)
):
    query = db.query(AnalyticsEvent)
    if event_name:
        query = query.filter(AnalyticsEvent.event_name == event_name)
    if app_id:
        query = query.filter(AnalyticsEvent.app_id == app_id)

    events = query.order_by(desc(AnalyticsEvent.created_at)).limit(limit).all()

    return {
        "success": True,
        "data": [
            {
                "id": ev.id,
                "event_name": ev.event_name,
                "app_id": ev.app_id,
                "platform": ev.platform,
                "user_id": ev.user_id,
                "properties": ev.properties,
                "created_at": ev.created_at.isoformat()
            }
            for ev in events
        ]
    }
