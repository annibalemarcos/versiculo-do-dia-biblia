import logging
import os
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.core.dependencies import get_current_user_optional, get_current_user_required, get_current_app_id
from app.core.errors import NotFoundException, ForbiddenException, BadRequestException, AppException
from app.models.user import User
from app.models.ticket import SupportTicket, TicketMessage, TicketAttachment
from app.models.base import utc_now

logger = logging.getLogger("support_api")
from app.schemas.ticket import (
    TicketCreateUserRequest,
    TicketSummaryResponse,
    TicketDetailResponse,
    TicketMessageResponse,
    TicketMessageCreate,
    TicketAttachmentResponse
)
from app.services.ticket_service import create_ticket, add_ticket_message

router = APIRouter(prefix="/support", tags=["Public & User Support"])

ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"]
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB

def _serialize_ticket_summary(t: SupportTicket) -> dict:
    user_name = t.user.name if t.user else (t.guest_name or "Anônimo")
    user_email = t.user.email if t.user else t.guest_email
    assigned_name = t.assigned_admin.name if t.assigned_admin else None

    return {
        "id": t.id,
        "ticket_number": t.ticket_number,
        "app_id": t.app_id,
        "user_id": t.user_id,
        "user_name": user_name,
        "user_email": user_email,
        "guest_name": t.guest_name,
        "guest_email": t.guest_email,
        "subject": t.subject,
        "description": t.description,
        "category": t.category,
        "priority": t.priority,
        "status": t.status,
        "assigned_admin_id": t.assigned_admin_id,
        "assigned_admin_name": assigned_name,
        "messages_count": len([m for m in t.messages if not m.is_internal_note]),
        "created_at": t.created_at,
        "updated_at": t.updated_at,
        "first_response_at": t.first_response_at,
        "resolved_at": t.resolved_at,
        "closed_at": t.closed_at
    }

def _serialize_ticket_detail_for_user(t: SupportTicket) -> dict:
    user_name = t.user.name if t.user else (t.guest_name or "Anônimo")
    user_email = t.user.email if t.user else t.guest_email
    assigned_name = t.assigned_admin.name if t.assigned_admin else None

    # Filter out internal notes completely for normal users
    public_messages = [
        {
            "id": m.id,
            "ticket_id": m.ticket_id,
            "sender_type": m.sender_type,
            "sender_user_id": m.sender_user_id,
            "sender_admin_id": m.sender_admin_id,
            "sender_name": m.sender_name or ("Suporte" if m.sender_type == "ADMIN" else "Você"),
            "message": m.message,
            "is_internal_note": False,
            "created_at": m.created_at,
            "updated_at": m.updated_at,
            "attachments": [
                {
                    "id": a.id,
                    "ticket_id": a.ticket_id,
                    "message_id": a.message_id,
                    "file_name": a.file_name,
                    "mime_type": a.mime_type,
                    "file_size": a.file_size,
                    "storage_reference": a.storage_reference,
                    "uploaded_by": a.uploaded_by,
                    "created_at": a.created_at
                }
                for a in m.attachments
            ]
        }
        for m in t.messages
        if not m.is_internal_note
    ]

    attachments = [
        {
            "id": a.id,
            "ticket_id": a.ticket_id,
            "message_id": a.message_id,
            "file_name": a.file_name,
            "mime_type": a.mime_type,
            "file_size": a.file_size,
            "storage_reference": a.storage_reference,
            "uploaded_by": a.uploaded_by,
            "created_at": a.created_at
        }
        for a in t.attachments
    ]

    return {
        "id": t.id,
        "ticket_number": t.ticket_number,
        "app_id": t.app_id,
        "user_id": t.user_id,
        "user_name": user_name,
        "user_email": user_email,
        "guest_name": t.guest_name,
        "guest_email": t.guest_email,
        "subject": t.subject,
        "description": t.description,
        "category": t.category,
        "priority": t.priority,
        "status": t.status,
        "assigned_admin_id": t.assigned_admin_id,
        "assigned_admin_name": assigned_name,
        "first_response_at": t.first_response_at,
        "resolved_at": t.resolved_at,
        "closed_at": t.closed_at,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
        "messages": public_messages,
        "attachments": attachments,
        "history": []  # History is admin-only
    }

@router.post("/tickets", status_code=status.HTTP_201_CREATED)
def create_support_ticket(
    body: TicketCreateUserRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    app_id: str = Depends(get_current_app_id),
    db: Session = Depends(get_db)
):
    """
    Creates a new support ticket by an authenticated user or guest.
    """
    from app.models.app import AppConfig
    cfg = db.query(AppConfig).filter(AppConfig.app_id == app_id).first()
    if cfg:
        if cfg.maintenance_mode and cfg.maintenance_level == "full":
            raise AppException(
                code="MAINTENANCE_BLOCKED",
                message=cfg.maintenance_message or "Abertura de chamados suspensa para manutenção.",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        if not cfg.support_enabled:
            raise AppException(
                code="SUPPORT_DISABLED",
                message="A abertura de novos chamados de suporte está temporariamente desativada.",
                status_code=status.HTTP_403_FORBIDDEN
            )

    try:
        user_id = current_user.id if current_user else None
        guest_email = body.guest_email if not current_user else None
        guest_name = body.guest_name if not current_user else None

        ticket = create_ticket(
            db=db,
            app_id=app_id,
            subject=body.subject,
            description=body.description,
            category=body.category,
            priority=body.priority,
            user_id=user_id,
            guest_email=guest_email,
            guest_name=guest_name
        )

        return {
            "success": True,
            "data": _serialize_ticket_detail_for_user(ticket)
        }
    except AppException:
        raise
    except Exception as e:
        logger.error(f"[SUPPORT API] Error creating support ticket: {e}", exc_info=True)
        raise

@router.get("/tickets")
def list_my_support_tickets(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Lists all support tickets belonging strictly to the authenticated user.
    """
    tickets = (
        db.query(SupportTicket)
        .filter(SupportTicket.user_id == current_user.id)
        .order_by(desc(SupportTicket.updated_at))
        .all()
    )

    return {
        "success": True,
        "data": [_serialize_ticket_summary(t) for t in tickets]
    }

@router.get("/tickets/{ticket_id}")
def get_my_support_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Retrieves details and conversation messages for a specific ticket of the user.
    """
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise NotFoundException("Chamado de suporte não encontrado.")

    # Strict horizontal access check
    if ticket.user_id != current_user.id:
        raise ForbiddenException("Você não tem permissão para visualizar este chamado.")

    return {
        "success": True,
        "data": _serialize_ticket_detail_for_user(ticket)
    }

@router.post("/tickets/{ticket_id}/messages")
def reply_to_support_ticket(
    ticket_id: str,
    body: TicketMessageCreate,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    User sends a new reply message in the ticket conversation.
    """
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise NotFoundException("Chamado de suporte não encontrado.")

    if ticket.user_id != current_user.id:
        raise ForbiddenException("Você não tem permissão para responder neste chamado.")

    msg = add_ticket_message(
        db=db,
        ticket=ticket,
        sender_type="USER",
        message=body.message,
        is_internal_note=False,
        sender_user_id=current_user.id,
        sender_name=current_user.name or current_user.email or "Usuário"
    )

    return {
        "success": True,
        "data": {
            "id": msg.id,
            "ticket_id": msg.ticket_id,
            "sender_type": msg.sender_type,
            "sender_name": msg.sender_name,
            "message": msg.message,
            "created_at": msg.created_at
        }
    }

@router.post("/tickets/{ticket_id}/attachments")
async def upload_ticket_attachment(
    ticket_id: str,
    file: UploadFile = File(...),
    message_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Upload an attachment to a ticket (sanitizes name, validates MIME type and max size).
    """
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise NotFoundException("Chamado não encontrado.")

    if ticket.user_id != current_user.id:
        raise ForbiddenException("Acesso negado.")

    if ticket.status == "CLOSED":
        raise AppException(
            code="TICKET_CLOSED",
            message="Este chamado foi encerrado e não aceita novos anexos.",
            status_code=400
        )

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise BadRequestException(f"Tipo de arquivo não suportado. Tipos permitidos: {', '.join(ALLOWED_MIME_TYPES)}")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise BadRequestException("O arquivo excede o limite máximo permitido de 5MB.")

    # Generate sanitized storage reference
    clean_filename = os.path.basename(file.filename or "attachment")
    storage_ref = f"attachments/tickets/{ticket_id}/{uuid.uuid4().hex[:8]}_{clean_filename}"

    attachment = TicketAttachment(
        ticket_id=ticket.id,
        message_id=message_id,
        file_name=clean_filename,
        mime_type=file.content_type,
        file_size=len(contents),
        storage_reference=storage_ref,
        uploaded_by="USER",
        created_at=utc_now()
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return {
        "success": True,
        "data": {
            "id": attachment.id,
            "file_name": attachment.file_name,
            "mime_type": attachment.mime_type,
            "file_size": attachment.file_size,
            "storage_reference": attachment.storage_reference,
            "created_at": attachment.created_at
        }
    }
