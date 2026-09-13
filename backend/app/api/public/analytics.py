from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.analytics import EventIngestRequest
from app.services.analytics_service import ingest_events_batch

router = APIRouter(prefix="/analytics", tags=["Public Analytics Ingestion"])

@router.post("/events", status_code=status.HTTP_202_ACCEPTED)
def ingest_analytics_events(
    body: EventIngestRequest,
    db: Session = Depends(get_db)
):
    """
    Ingests anonymous and user-authorized telemetry events (app_open, verse_view, share, ad_impression, etc.)
    with batch efficiency and payload validation.
    """
    count = ingest_events_batch(db, body.events)
    return {
        "success": True,
        "data": {
            "ingested_count": count,
            "status": "queued"
        }
    }
