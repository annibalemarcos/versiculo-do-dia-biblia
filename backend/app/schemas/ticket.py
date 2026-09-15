from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, model_validator

class TicketAttachmentResponse(BaseModel):
    id: str
    ticket_id: str
    message_id: Optional[str] = None
    file_name: str
    mime_type: str
    file_size: int
    storage_reference: str
    uploaded_by: str
    created_at: datetime

    class Config:
        from_attributes = True

class TicketMessageCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    is_internal_note: bool = False

class TicketMessageResponse(BaseModel):
    id: str
    ticket_id: str
    sender_type: str  # USER, ADMIN, SYSTEM
    sender_user_id: Optional[str] = None
    sender_admin_id: Optional[str] = None
    sender_name: Optional[str] = None
    message: str
    is_internal_note: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    attachments: List[TicketAttachmentResponse] = []

    class Config:
        from_attributes = True

class TicketHistoryResponse(BaseModel):
    id: str
    ticket_id: str
    action: str
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    admin_id: Optional[str] = None
    user_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TicketParticipantResponse(BaseModel):
    id: str
    ticket_id: str
    admin_id: str
    admin_name: str
    admin_email: str
    admin_role: Optional[str] = None
    admin_department: Optional[str] = None
    added_by_admin_id: Optional[str] = None
    added_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TicketParticipantAddRequest(BaseModel):
    admin_id: str

class TicketCreateUserRequest(BaseModel):
    subject: Optional[str] = Field(None, max_length=255)
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=10000)
    message: Optional[str] = Field(None, max_length=10000)
    category: str = Field("OTHER", max_length=50)  # TECHNICAL, ACCOUNT, PREMIUM_PAYMENT, ADS, CONTENT, SUGGESTION, OTHER
    priority: str = Field("NORMAL", max_length=20)  # LOW, NORMAL, HIGH, URGENT
    guest_name: Optional[str] = Field(None, max_length=150)
    guest_email: Optional[EmailStr] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            subj = data.get("subject") or data.get("title")
            desc = data.get("description") or data.get("message")
            if not subj or len(str(subj).strip()) < 3:
                raise ValueError("O campo 'subject' (ou 'title') é obrigatório e deve ter no mínimo 3 caracteres.")
            if not desc or len(str(desc).strip()) < 5:
                raise ValueError("O campo 'description' (ou 'message') é obrigatório e deve ter no mínimo 5 caracteres.")
            data["subject"] = str(subj).strip()
            data["title"] = str(subj).strip()
            data["description"] = str(desc).strip()
            data["message"] = str(desc).strip()
        return data

class TicketUpdateAdminRequest(BaseModel):
    status: Optional[str] = None  # OPEN, IN_PROGRESS, WAITING_USER, RESOLVED, CLOSED
    priority: Optional[str] = None  # LOW, NORMAL, HIGH, URGENT
    category: Optional[str] = None
    assigned_admin_id: Optional[str] = None

class TicketAssignRequest(BaseModel):
    admin_id: Optional[str] = None

class TicketSummaryResponse(BaseModel):
    id: str
    ticket_number: str
    app_id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    guest_name: Optional[str] = None
    guest_email: Optional[str] = None
    subject: str
    category: str
    priority: str
    status: str
    assigned_admin_id: Optional[str] = None
    assigned_admin_name: Optional[str] = None
    assigned_admin_role: Optional[str] = None
    assigned_admin_department: Optional[str] = None
    participants_count: int = 0
    participants: List[TicketParticipantResponse] = []
    messages_count: int = 0
    created_at: datetime
    updated_at: datetime
    first_response_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TicketDetailResponse(BaseModel):
    id: str
    ticket_number: str
    app_id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    guest_name: Optional[str] = None
    guest_email: Optional[str] = None
    subject: str
    description: str
    category: str
    priority: str
    status: str
    assigned_admin_id: Optional[str] = None
    assigned_admin_name: Optional[str] = None
    assigned_admin_role: Optional[str] = None
    assigned_admin_department: Optional[str] = None
    first_response_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    participants: List[TicketParticipantResponse] = []
    messages: List[TicketMessageResponse] = []
    attachments: List[TicketAttachmentResponse] = []
    history: List[TicketHistoryResponse] = []

    class Config:
        from_attributes = True

class TicketMetricsSummary(BaseModel):
    open_tickets: int = 0
    urgent_tickets: int = 0
    in_progress_tickets: int = 0
    waiting_user_tickets: int = 0
    resolved_today: int = 0
    closed_total: int = 0
    avg_first_response_minutes: Optional[float] = None
    avg_resolution_hours: Optional[float] = None
