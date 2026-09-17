from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class VariantCreate(BaseModel):
    key: str
    name: str
    traffic_percentage: int = 50
    config_json: Dict[str, Any] = {}

class VariantResponse(BaseModel):
    id: str
    key: str
    name: str
    traffic_percentage: int
    config_json: Dict[str, Any]
    impressions_count: int
    conversions_count: int
    conversion_rate_pct: float = 0.0

class ExperimentCreate(BaseModel):
    id: str
    app_id: str = "verse_daily"
    name: str
    description: Optional[str] = None
    target_metric: str = "purchase_completed"
    variants: List[VariantCreate]

class ExperimentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    target_metric: Optional[str] = None

class ExperimentResponse(BaseModel):
    id: str
    app_id: str
    name: str
    description: Optional[str] = None
    status: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_metric: str
    variants: List[VariantResponse] = []
    created_at: datetime
