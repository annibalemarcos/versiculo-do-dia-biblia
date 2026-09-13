import math
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from app.core.database import get_db
from app.core.dependencies import require_permission, get_current_admin
from app.core.errors import NotFoundException, ForbiddenException, BadRequestException
from app.models.auth import AdminUser
from app.models.ticket import SupportTicket, TicketMessage, TicketAttachment, TicketHistory, TicketParticipant
from app.models.base import utc_now
from app.schemas.ticket import (
    TicketSummaryResponse,
    TicketDetailResponse,
    TicketUpdateAdminRequest,
    TicketAssignRequest,
    TicketParticipantAddRequest,
    TicketMessageCreate,
    TicketMetricsSummary
)
from app.services.ticket_service import (
    add_ticket_message,
    record_ticket_history,
    record_admin_audit,
    get_ticket_metrics
)
from app.services.staff_notification_service import create_staff_notification

router = APIRouter(prefix="/tickets", tags=["Admin Support Tickets"])

def _serialize_participant(p: TicketParticipant) -> dict:
    admin_name = p.admin.name if p.admin else "Membro"
    admin_email = p.admin.email if p.admin else ""
    admin_role = p.admin.roles[0].name if (p.admin and p.admin.roles) else None
    admin_dept = getattr(p.admin, "department", "general") if p.admin else None
    added_name = p.added_by_admin.name if p.added_by_admin else "Sistema"

    return {
        "id": p.id,
        "ticket_id": p.ticket_id,
        "admin_id": p.admin_id,
        "admin_name": admin_name,
        "admin_email": admin_email,
        "admin_role": admin_role,
        "admin_department": admin_dept,
        "added_by_admin_id": p.added_by_admin_id,
        "added_by_name": added_name,
        "created_at": p.created_at
    }

def _serialize_admin_ticket_summary(t: SupportTicket) -> dict:
    user_name = t.user.name if t.user else (t.guest_name or "Anônimo")
    user_email = t.user.email if t.user else t.guest_email
    assigned_name = t.assigned_admin.name if t.assigned_admin else None
    assigned_role = t.assigned_admin.roles[0].name if (t.assigned_admin and t.assigned_admin.roles) else None
    assigned_dept = getattr(t.assigned_admin, "department", None) if t.assigned_admin else None
    participants = [_serialize_participant(p) for p in t.participants] if hasattr(t, "participants") and t.participants else []

    return {
        "id": t.id,
        "ticket_number": t.ticket_number,
        "app_id": t.app_id,
        "user_id": t.user_id,
        "is_guest": t.user_id is None,
        "user_name": user_name,
        "user_email": user_email,
        "user_is_premium": t.user.is_premium if t.user else False,
        "user_is_active": t.user.is_active if t.user else True,
        "guest_name": t.guest_name,
        "guest_email": t.guest_email,
        "subject": t.subject,
        "category": t.category,
        "priority": t.priority,
        "status": t.status,
        "assigned_admin_id": t.assigned_admin_id,
        "assigned_admin_name": assigned_name,
        "assigned_admin_role": assigned_role,
        "assigned_admin_department": assigned_dept,
        "participants_count": len(participants),
        "participants": participants,
        "messages_count": len(t.messages),
        "created_at": t.created_at,
        "updated_at": t.updated_at,
        "first_response_at": t.first_response_at,
        "resolved_at": t.resolved_at,
        "closed_at": t.closed_at
    }

def _serialize_admin_ticket_detail(t: SupportTicket, can_view_internal_notes: bool = True) -> dict:
    user_name = t.user.name if t.user else (t.guest_name or "Anônimo")
    user_email = t.user.email if t.user else t.guest_email
    assigned_name = t.assigned_admin.name if t.assigned_admin else None
    assigned_role = t.assigned_admin.roles[0].name if (t.assigned_admin and t.assigned_admin.roles) else None
    assigned_dept = getattr(t.assigned_admin, "department", None) if t.assigned_admin else None
    participants = [_serialize_participant(p) for p in t.participants] if hasattr(t, "participants") and t.participants else []
    user_created_at = t.user.created_at.isoformat() if t.user and t.user.created_at else None
    user_is_premium = t.user.is_premium if t.user else False
    user_is_active = t.user.is_active if t.user else True
    user_platform = t.user.platform if t.user else None

    messages = [
        {
            "id": m.id,
            "ticket_id": m.ticket_id,
            "sender_type": m.sender_type,
            "sender_user_id": m.sender_user_id,
            "sender_admin_id": m.sender_admin_id,
            "sender_name": m.sender_name or (m.ticket.assigned_admin.name if m.sender_type == "ADMIN" and m.ticket.assigned_admin else "Administrador"),
            "message": m.message,
            "is_internal_note": m.is_internal_note,
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
        if not m.is_internal_note or can_view_internal_notes
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

    history = [
        {
            "id": h.id,
            "ticket_id": h.ticket_id,
            "action": h.action,
            "previous_value": h.previous_value,
            "new_value": h.new_value,
            "admin_id": h.admin_id,
            "user_id": h.user_id,
            "created_at": h.created_at
        }
        for h in t.history
    ]

    return {
        "id": t.id,
        "ticket_number": t.ticket_number,
        "app_id": t.app_id,
        "user_id": t.user_id,
        "is_guest": t.user_id is None,
        "user_name": user_name,
        "user_email": user_email,
        "user_is_premium": user_is_premium,
        "user_is_active": user_is_active,
        "user_platform": user_platform,
        "user_created_at": user_created_at,
        "guest_name": t.guest_name,
        "guest_email": t.guest_email,
        "subject": t.subject,
        "description": t.description,
        "category": t.category,
        "priority": t.priority,
        "status": t.status,
        "assigned_admin_id": t.assigned_admin_id,
        "assigned_admin_name": assigned_name,
        "assigned_admin_role": assigned_role,
        "assigned_admin_department": assigned_dept,
        "participants": participants,
        "first_response_at": t.first_response_at,
        "resolved_at": t.resolved_at,
        "closed_at": t.closed_at,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
        "messages": messages,
        "attachments": attachments,
        "history": history
    }


@router.get("/metrics")
def get_tickets_metrics_summary(
    app_id: Optional[str] = Query(None),
    admin: AdminUser = Depends(require_permission("tickets.view")),
    db: Session = Depends(get_db)
):
    """
    Returns executive metrics for support tickets.
    """
    metrics = get_ticket_metrics(db=db, app_id=app_id)
    return {
        "success": True,
        "data": metrics
    }

@router.get("")
def list_tickets_admin(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    app_id: Optional[str] = Query(None),
    assigned_admin_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    admin: AdminUser = Depends(require_permission("tickets.view")),
    db: Session = Depends(get_db)
):
    """
    Paginated list of support tickets with multi-filter capability.
    """
    query = db.query(SupportTicket)

    if status:
        query = query.filter(SupportTicket.status == status.upper())
    if priority:
        query = query.filter(SupportTicket.priority == priority.upper())
    if category:
        query = query.filter(SupportTicket.category == category.upper())
    if app_id:
        query = query.filter(SupportTicket.app_id == app_id)
    if assigned_admin_id:
        query = query.filter(SupportTicket.assigned_admin_id == assigned_admin_id)
    if user_id:
        query = query.filter(SupportTicket.user_id == user_id)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                SupportTicket.ticket_number.ilike(search_term),
                SupportTicket.subject.ilike(search_term),
                SupportTicket.description.ilike(search_term),
                SupportTicket.guest_email.ilike(search_term)
            )
        )

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit
    tickets = query.order_by(desc(SupportTicket.updated_at)).offset(offset).limit(limit).all()

    items = [_serialize_admin_ticket_summary(t) for t in tickets]

    return {
        "success": True,
        "data": {
            "items": items,
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "pages": pages,
                "has_next": page < pages,
                "has_prev": page > 1
            }
        }
    }

@router.get("/{ticket_id}")
def get_ticket_admin_detail(
    ticket_id: str,
    admin: AdminUser = Depends(require_permission("tickets.view")),
    db: Session = Depends(get_db)
):
    """
    Returns full ticket conversation and metadata.
    """
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise NotFoundException("Chamado de suporte não encontrado.")

    # Check if admin has tickets.internal_notes permission
    can_internal = admin.is_super_admin or any(
        any(p.id in ["tickets.internal_notes", "*"] for p in r.permissions)
        for r in admin.roles
    )

    return {
        "success": True,
        "data": _serialize_admin_ticket_detail(ticket, can_view_internal_notes=can_internal)
    }

@router.post("/{ticket_id}/messages")
def send_admin_ticket_message(
    ticket_id: str,
    body: TicketMessageCreate,
    request: Request,
    admin: AdminUser = Depends(require_permission("tickets.reply")),
    db: Session = Depends(get_db)
):
    """
    Admin sends a public reply or adds an internal note.
    """
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise NotFoundException("Chamado não encontrado.")

    if body.is_internal_note:
        # Check internal note permission
        can_internal = admin.is_super_admin or any(
            any(p.id in ["tickets.internal_notes", "*"] for p in r.permissions)
            for r in admin.roles
        )
        if not can_internal:
            raise ForbiddenException("Você não tem permissão para adicionar notas internas.")

    msg = add_ticket_message(
        db=db,
        ticket=ticket,
        sender_type="ADMIN",
        message=body.message,
        is_internal_note=body.is_internal_note,
        sender_admin_id=admin.id,
        sender_name=admin.name
    )

    # Notify assigned admin & participants about the new message
    recipient_ids = set()
    if ticket.assigned_admin_id and ticket.assigned_admin_id != admin.id:
        recipient_ids.add(ticket.assigned_admin_id)
    for p in ticket.participants:
        if p.admin_id != admin.id:
            recipient_ids.add(p.admin_id)

    msg_preview = body.message[:80] + "..." if len(body.message) > 80 else body.message
    notif_title = f"{'Nota interna' if body.is_internal_note else 'Nova resposta'} no Ticket #{ticket.ticket_number}"
    for rec_id in recipient_ids:
        create_staff_notification(
            db=db,
            recipient_admin_id=rec_id,
            type="TICKET_NEW_MESSAGE",
            title=notif_title,
            message=f"{admin.name}: {msg_preview}",
            target_type="ticket",
            target_id=ticket.id,
            action_url=f"/tickets?id={ticket.id}"
        )

    record_admin_audit(
        db=db,
        admin=admin,
        action="ticket_internal_note" if body.is_internal_note else "ticket_reply",
        ticket_id=ticket.id,
        meta_data={"ticket_number": ticket.ticket_number, "is_internal": body.is_internal_note},
        ip_address=request.client.host if request.client else None
    )
    db.commit()

    return {
        "success": True,
        "data": {
            "id": msg.id,
            "ticket_id": msg.ticket_id,
            "sender_type": msg.sender_type,
            "sender_name": msg.sender_name,
            "message": msg.message,
            "is_internal_note": msg.is_internal_note,
            "created_at": msg.created_at
        }
    }

@router.patch("/{ticket_id}")
def update_ticket_attributes(
    ticket_id: str,
    body: TicketUpdateAdminRequest,
    request: Request,
    admin: AdminUser = Depends(require_permission("tickets.edit")),
    db: Session = Depends(get_db)
):
    """
    Updates status, priority, category or assignment.
    """
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise NotFoundException("Chamado não encontrado.")

    changes = {}
    if body.status and body.status.upper() != ticket.status:
        old_status = ticket.status
        ticket.status = body.status.upper()
        if ticket.status == "RESOLVED" and not ticket.resolved_at:
            ticket.resolved_at = utc_now()
        if ticket.status == "CLOSED" and not ticket.closed_at:
            ticket.closed_at = utc_now()
        changes["status"] = (old_status, ticket.status)
        record_ticket_history(db, ticket.id, "status_changed", old_status, ticket.status, admin_id=admin.id)

    if body.priority and body.priority.upper() != ticket.priority:
        old_prio = ticket.priority
        ticket.priority = body.priority.upper()
        changes["priority"] = (old_prio, ticket.priority)
        record_ticket_history(db, ticket.id, "priority_changed", old_prio, ticket.priority, admin_id=admin.id)

    if body.category and body.category.upper() != ticket.category:
        old_cat = ticket.category
        ticket.category = body.category.upper()
        changes["category"] = (old_cat, ticket.category)
        record_ticket_history(db, ticket.id, "category_changed", old_cat, ticket.category, admin_id=admin.id)

    if body.assigned_admin_id is not None:
        old_admin = ticket.assigned_admin_id
        ticket.assigned_admin_id = body.assigned_admin_id if body.assigned_admin_id else None
        changes["assigned_admin_id"] = (old_admin, ticket.assigned_admin_id)
        record_ticket_history(db, ticket.id, "assigned", old_admin, ticket.assigned_admin_id, admin_id=admin.id)

    ticket.updated_at = utc_now()

    record_admin_audit(
        db=db,
        admin=admin,
        action="ticket_updated",
        ticket_id=ticket.id,
        meta_data={"ticket_number": ticket.ticket_number, "changes": changes},
        ip_address=request.client.host if request.client else None
    )
    db.commit()

    return {
        "success": True,
        "data": _serialize_admin_ticket_summary(ticket)
    }

@router.post("/{ticket_id}/assign")
def assign_ticket(
    ticket_id: str,
    body: TicketAssignRequest,
    request: Request,
    admin: AdminUser = Depends(require_permission("tickets.assign")),
    db: Session = Depends(get_db)
):
    """
    Assigns ticket to a specific administrator or unassigns.
    """
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise NotFoundException("Chamado não encontrado.")

    old_assigned = ticket.assigned_admin_id
    ticket.assigned_admin_id = body.admin_id if body.admin_id else None
    ticket.updated_at = utc_now()

    if body.admin_id and body.admin_id != admin.id:
        create_staff_notification(
            db=db,
            recipient_admin_id=body.admin_id,
            type="TICKET_ASSIGNED",
            title="Novo Chamado Atribuído",
            message=f"O chamado #{ticket.ticket_number} - '{ticket.subject}' foi atribuído a você por {admin.name}.",
            target_type="ticket",
            target_id=ticket.id,
            action_url=f"/tickets?id={ticket.id}"
        )

    record_ticket_history(
        db=db,
        ticket_id=ticket.id,
        action="assigned",
        previous_value=old_assigned,
        new_value=ticket.assigned_admin_id,
        admin_id=admin.id
    )

    record_admin_audit(
        db=db,
        admin=admin,
        action="ticket_assigned",
        ticket_id=ticket.id,
        meta_data={"ticket_number": ticket.ticket_number, "assigned_admin_id": ticket.assigned_admin_id},
        ip_address=request.client.host if request.client else None
    )
    db.commit()

    return {
        "success": True,
        "data": _serialize_admin_ticket_summary(ticket)
    }

@router.post("/{ticket_id}/resolve")
def resolve_ticket(
    ticket_id: str,
    request: Request,
    admin: AdminUser = Depends(require_permission("tickets.resolve")),
    db: Session = Depends(get_db)
):
    """
    Marks ticket as RESOLVED.
    """
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise NotFoundException("Chamado não encontrado.")

    old_status = ticket.status
    ticket.status = "RESOLVED"
    ticket.resolved_at = utc_now()
    ticket.updated_at = utc_now()

    record_ticket_history(
        db=db,
        ticket_id=ticket.id,
        action="resolved",
        previous_value=old_status,
        new_value="RESOLVED",
        admin_id=admin.id
    )

    record_admin_audit(
        db=db,
        admin=admin,
        action="ticket_resolved",
        ticket_id=ticket.id,
        meta_data={"ticket_number": ticket.ticket_number},
        ip_address=request.client.host if request.client else None
    )
    db.commit()

    return {
        "success": True,
        "data": _serialize_admin_ticket_summary(ticket)
    }

@router.post("/{ticket_id}/close")
def close_ticket(
    ticket_id: str,
    request: Request,
    admin: AdminUser = Depends(require_permission("tickets.close")),
    db: Session = Depends(get_db)
):
    """
    Marks ticket as CLOSED.
    """
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise NotFoundException("Chamado não encontrado.")

    old_status = ticket.status
    ticket.status = "CLOSED"
    ticket.closed_at = utc_now()
    ticket.updated_at = utc_now()

    record_ticket_history(
        db=db,
        ticket_id=ticket.id,
        action="closed",
        previous_value=old_status,
        new_value="CLOSED",
        admin_id=admin.id
    )

    record_admin_audit(
        db=db,
        admin=admin,
        action="ticket_closed",
        ticket_id=ticket.id,
        meta_data={"ticket_number": ticket.ticket_number},
        ip_address=request.client.host if request.client else None
    )
    db.commit()

    return {
        "success": True,
        "data": _serialize_admin_ticket_summary(ticket)
    }

# --- Ticket Participants Management ---
@router.post("/{ticket_id}/participants")
def add_ticket_participant(
    ticket_id: str,
    body: TicketParticipantAddRequest,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise NotFoundException("Chamado não encontrado.")

    # Check permission
    can_manage = admin.is_super_admin or ticket.assigned_admin_id == admin.id or any(
        any(p.id in ["tickets.assign", "tickets.edit", "*"] for p in r.permissions)
        for r in admin.roles
    )
    if not can_manage:
        raise ForbiddenException("Você não tem permissão para adicionar participantes a este chamado.")

    target_admin = db.query(AdminUser).filter(AdminUser.id == body.admin_id).first()
    if not target_admin:
        raise NotFoundException("Membro da equipe não encontrado.")

    # Check if already participant
    existing = db.query(TicketParticipant).filter(
        TicketParticipant.ticket_id == ticket_id,
        TicketParticipant.admin_id == body.admin_id
    ).first()

    if existing:
        return {"success": True, "message": "Membro já é participante deste chamado."}

    participant = TicketParticipant(
        ticket_id=ticket_id,
        admin_id=body.admin_id,
        added_by_admin_id=admin.id
    )
    db.add(participant)

    record_ticket_history(
        db=db,
        ticket_id=ticket.id,
        action="participant_added",
        previous_value=None,
        new_value=f"{target_admin.name} ({target_admin.email})",
        admin_id=admin.id
    )

    if body.admin_id != admin.id:
        create_staff_notification(
            db=db,
            recipient_admin_id=body.admin_id,
            type="TICKET_PARTICIPANT_ADDED",
            title="Participante em Chamado",
            message=f"Você foi adicionado por {admin.name} como participante no chamado #{ticket.ticket_number} - '{ticket.subject}'.",
            target_type="ticket",
            target_id=ticket.id,
            action_url=f"/tickets?id={ticket.id}"
        )

    record_admin_audit(
        db=db,
        admin=admin,
        action="ticket_participant_added",
        ticket_id=ticket.id,
        meta_data={"ticket_number": ticket.ticket_number, "participant_id": body.admin_id},
        ip_address=request.client.host if request.client else None
    )

    db.commit()
    db.refresh(ticket)

    return {
        "success": True,
        "message": f"{target_admin.name} adicionado aos participantes com sucesso.",
        "data": _serialize_admin_ticket_detail(ticket)
    }

@router.delete("/{ticket_id}/participants/{participant_admin_id}")
def remove_ticket_participant(
    ticket_id: str,
    participant_admin_id: str,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise NotFoundException("Chamado não encontrado.")

    # Check permission (can remove self or if has perm)
    is_self = participant_admin_id == admin.id
    can_manage = is_self or admin.is_super_admin or ticket.assigned_admin_id == admin.id or any(
        any(p.id in ["tickets.assign", "tickets.edit", "*"] for p in r.permissions)
        for r in admin.roles
    )
    if not can_manage:
        raise ForbiddenException("Você não tem permissão para remover participantes deste chamado.")

    participant = db.query(TicketParticipant).filter(
        TicketParticipant.ticket_id == ticket_id,
        TicketParticipant.admin_id == participant_admin_id
    ).first()

    if not participant:
        raise NotFoundException("Participante não encontrado neste chamado.")

    target_admin = db.query(AdminUser).filter(AdminUser.id == participant_admin_id).first()
    target_name = target_admin.name if target_admin else participant_admin_id

    db.delete(participant)

    record_ticket_history(
        db=db,
        ticket_id=ticket.id,
        action="participant_removed",
        previous_value=target_name,
        new_value=None,
        admin_id=admin.id
    )

    record_admin_audit(
        db=db,
        admin=admin,
        action="ticket_participant_removed",
        ticket_id=ticket.id,
        meta_data={"ticket_number": ticket.ticket_number, "participant_id": participant_admin_id},
        ip_address=request.client.host if request.client else None
    )

    db.commit()
    db.refresh(ticket)

    return {
        "success": True,
        "message": f"Participante removido com sucesso.",
        "data": _serialize_admin_ticket_detail(ticket)
    }

