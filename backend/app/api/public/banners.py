from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Path, Body, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from app.core.database import get_db
from app.models.base import utc_now
from app.models.banner import Banner
from app.schemas.banner import BannerPublicItem
from app.core.errors import NotFoundException, BadRequestException

router = APIRouter(prefix="/banners", tags=["Public Banners"])

@router.get("", response_model=dict)
def get_public_banners(
    app_id: str = Query("verse_daily"),
    placement: Optional[str] = Query(None),
    audience: Optional[str] = Query(None),  # free, premium, anonymous, registered
    db: Session = Depends(get_db)
):
    now = utc_now()
    query = db.query(Banner).filter(
        Banner.app_id == app_id,
        Banner.is_active == True,
        or_(Banner.starts_at == None, Banner.starts_at <= now),
        or_(Banner.expires_at == None, Banner.expires_at >= now)
    )

    if placement:
        query = query.filter(Banner.placement == placement)

    # Audience filter
    if audience:
        aud_clean = audience.strip().lower()
        if aud_clean in ["free", "free_only"]:
            query = query.filter(Banner.target_audience.in_(["all", "free_only"]))
        elif aud_clean in ["premium", "premium_only"]:
            query = query.filter(Banner.target_audience.in_(["all", "premium_only"]))
        elif aud_clean in ["anonymous", "anonymous_only"]:
            query = query.filter(Banner.target_audience.in_(["all", "anonymous_only", "free_only"]))
        elif aud_clean in ["registered", "registered_only"]:
            query = query.filter(Banner.target_audience.in_(["all", "registered_only"]))
        else:
            query = query.filter(Banner.target_audience.in_(["all", aud_clean]))

    # Order by priority (highest first), then by creation date
    banners = query.order_by(desc(Banner.priority), desc(Banner.created_at)).all()

    # Filter out banners that have reached max_impressions
    active_banners = [
        b for b in banners
        if b.max_impressions is None or b.impression_count < b.max_impressions
    ]

    items = [
        {
            "id": b.id,
            "app_id": b.app_id,
            "title": b.title,
            "subtitle": b.subtitle,
            "description": b.description,
            "image_url": b.image_url,
            "badge_text": b.badge_text,
            "placement": b.placement,
            "action_type": b.action_type,
            "action_url": b.action_url,
            "action_label": b.action_label,
            "secondary_action_label": b.secondary_action_label,
            "priority": b.priority,
            "dismissible": b.dismissible,
            "bg_color": b.bg_color,
            "text_color": b.text_color
        }
        for b in active_banners
    ]

    return {
        "success": True,
        "total": len(items),
        "data": items
    }

@router.post("/{banner_id}/track")
def track_banner_interaction(
    banner_id: str = Path(...),
    action: str = Query("impression", regex="^(impression|click)$"),
    db: Session = Depends(get_db)
):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise NotFoundException("Banner não encontrado")

    if action == "impression":
        banner.impression_count = (banner.impression_count or 0) + 1
    elif action == "click":
        banner.click_count = (banner.click_count or 0) + 1

    db.commit()
    return {"success": True, "message": f"Interação '{action}' registrada com sucesso"}
