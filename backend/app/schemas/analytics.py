from typing import Optional, Dict, Any, List
from datetime import datetime, date
from pydantic import BaseModel

class EventIngestItem(BaseModel):
    event: str
    app_id: str = "verse_daily"
    platform: str = "android"
    user_id: Optional[str] = None
    anonymous_session_id: Optional[str] = None
    timestamp: Optional[datetime] = None
    properties: Dict[str, Any] = {}

class EventIngestRequest(BaseModel):
    events: List[EventIngestItem]

class MetricCard(BaseModel):
    id: str
    title: str
    value: str
    numeric_value: float
    change_pct: Optional[float] = None
    change_direction: Optional[str] = None  # "up", "down", "neutral"
    category: str
    status: str = "available"  # "available", "zero", "no_data", "unavailable"
    tooltip: Optional[str] = None

class ChartDataPoint(BaseModel):
    date: str
    label: Optional[str] = None
    values: Dict[str, float]

class TopItemDto(BaseModel):
    name: str
    count: int
    percentage: float

class RealtimeActivePoint(BaseModel):
    timestamp: str
    active_users: int
    reading_verse: int
    in_devotional: int
    sharing: int

class TrendingVerseShareItem(BaseModel):
    verse_id: str
    reference: str
    text: str
    book: str
    shares_count: int
    shares_growth_pct: float
    channels: Dict[str, int]

class ShareChannelBreakdown(BaseModel):
    channel: str
    label: str
    shares: int
    percentage: float
    color: str

class UserEngagementResponse(BaseModel):
    app_id: str
    current_active_users: int
    active_change_pct: float
    peak_active_today: int
    peak_time: str
    avg_session_duration_seconds: int
    total_shares_today: int
    shares_growth_pct: float
    realtime_timeline: List[RealtimeActivePoint]
    trending_verses: List[TrendingVerseShareItem]
    channel_breakdown: List[ShareChannelBreakdown]
    hourly_shares_trend: List[Dict[str, Any]]

class AnalyticsDashboardResponse(BaseModel):
    preset: str  # "executive", "product", "monetization", "operations"
    app_id: str
    period: str  # "today", "7d", "30d", "90d", "year", "custom"
    cards: List[MetricCard]
    timeseries: List[ChartDataPoint]
    top_themes: List[TopItemDto] = []
    aggregated_emotions: List[TopItemDto] = []
    conversion_funnel: List[TopItemDto] = []
