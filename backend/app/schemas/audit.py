from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class AuditLogEntry(BaseModel):
    id: str
    admin_id: Optional[str] = None
    admin_email: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    meta_data: Optional[Dict[str, Any]] = None
    created_at: datetime
