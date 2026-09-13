from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class ComponentHealth(BaseModel):
    name: str  # "api", "database", "push_fcm", "billing", "admob", "adsense", "storage", "auth_jwt", etc.
    display_name: str
    status: str  # "healthy", "degraded", "unavailable", "not_configured"
    criticality: Optional[str] = "CRÍTICO"  # "CRÍTICO", "IMPORTANTE", "OPCIONAL"
    response_time_ms: Optional[int] = None
    message: str
    last_check_at: datetime
    details: Optional[Dict[str, Any]] = None
    recommendation: Optional[str] = None

class SystemHealthResponse(BaseModel):
    overall_status: str  # "healthy", "degraded", "unhealthy"
    checked_at: datetime
    components: List[ComponentHealth]
