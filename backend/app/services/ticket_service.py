import math
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, and_, text
from app.models.ticket import SupportTicket, TicketMessage, TicketAttachment, TicketHistory
from app.models.auth import AdminUser, AdminAuditLog
from app.models.user import User
from app.models.base import utc_now
from app.core.errors import NotFoundException, ForbiddenException, BadRequestException, AppException

def generate_next_ticket_number(db: Session) -> str:
    """
    Generates human-readable sequential ticket number e.g. TKT-000001
    Concurrency-safe using PostgreSQL sequence when available, with atomic fallback.
    """
    bind = db.get_bind()
    if bind and bind.dialect.name == "postgresql":
        try:
            # Atomic sequence fetch from PostgreSQL
            seq_val = db.execute(text("SELECT nextval('support_ticket_number_seq')")).scalar()
            if seq_val is not None:
                return f"TKT-{int(seq_val):06d}"
        except Exception:
            try:
                db.execute(text("CREATE SEQUENCE IF NOT EXISTS support_ticket_number_seq START WITH 1 INCREMENT BY 1;"))
                # Synchronize sequence with current max ticket number
                db.execute(text("""
                    SELECT setval('support_ticket_number_seq', COALESCE((
                        SELECT MAX(NULLIF(regexp_replace(ticket_number, '[^0-9]', '', 'g'), '')::integer)
                        FROM support_tickets
                    ), 0) + 1, false);
                """))
                seq_val = db.execute(text("SELECT nextval('support_ticket_number_seq')")).scalar()
                if seq_val is not None:
                    return f"TKT-{int(seq_val):06d}"
            except Exception:
                pass

    # Fallback for SQLite / Tests / initial migrations
    try:
        last_tickets = db.query(SupportTicket.ticket_number).order_by(desc(SupportTicket.created_at)).limit(50).all()
        max_num = 0
        for (t_num,) in last_tickets:
            if t_num and t_num.startswith("TKT-"):
                try:
                    num = int(t_num.split("-")[1])
                    if num > max_num:
                        max_num = num
                except Exception:
                    pass
        if max_num > 0:
            return f"TKT-{max_num + 1:06d}"
    except Exception:
        pass

    count = db.query(SupportTicket).count()
    return f"TKT-{count + 1:06d}"

def record_ticket_history(
    db: Session,
    ticket_id: str,
    action: str,
    previous_value: Optional[str] = None,
    new_value: Optional[str] = None,
    admin_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> TicketHistory:
    history = TicketHistory(
        ticket_id=ticket_id,
        action=action,
        previous_value=previous_value,
        new_value=new_value,
        admin_id=admin_id,
        user_id=user_id,
        created_at=utc_now()
    )
    db.add(history)
    return history

def record_admin_audit(
    db: Session,
    admin: AdminUser,
    action: str,
    ticket_id: str,
    meta_data: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
):
    audit = AdminAuditLog(
        admin_id=admin.id,
        admin_email=admin.email,
        action=action,
        resource_type="support_ticket",
        resource_id=ticket_id,
        meta_data=meta_data or {},
        ip_address=ip_address,
        created_at=utc_now()
    )
    db.add(audit)

def create_ticket(
    db: Session,
    app_id: str,
    subject: str,
    description: str,
    category: str = "OTHER",
    priority: str = "NORMAL",
    user_id: Optional[str] = None,
    guest_email: Optional[str] = None,
    guest_name: Optional[str] = None
) -> SupportTicket:
    valid_categories = ["TECHNICAL", "ACCOUNT", "PREMIUM_PAYMENT", "ADS", "CONTENT", "SUGGESTION", "OTHER"]
    valid_priorities = ["LOW", "NORMAL", "HIGH", "URGENT"]
    
    category = category.upper() if category.upper() in valid_categories else "OTHER"
    priority = priority.upper() if priority.upper() in valid_priorities else "NORMAL"

    user_name = None
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user_name = user.name or user.email

    max_retries = 5
    for attempt in range(max_retries):
        try:
            ticket_number = generate_next_ticket_number(db)
            
            ticket = SupportTicket(
                ticket_number=ticket_number,
                app_id=app_id,
                user_id=user_id,
                guest_email=guest_email,
                guest_name=guest_name,
                subject=subject.strip(),
                description=description.strip(),
                category=category,
                priority=priority,
                status="OPEN",
                created_at=utc_now(),
                updated_at=utc_now()
            )
            db.add(ticket)
            db.flush()

            # Initial message
            init_msg = TicketMessage(
                ticket_id=ticket.id,
                sender_type="USER" if user_id or guest_email else "SYSTEM",
                sender_user_id=user_id,
                sender_name=user_name or guest_name or "Usuário",
                message=description.strip(),
                is_internal_note=False,
                created_at=utc_now(),
                updated_at=utc_now()
            )
            db.add(init_msg)

            # Record history
            record_ticket_history(
                db=db,
                ticket_id=ticket.id,
                action="created",
                new_value=ticket.status,
                user_id=user_id
            )

            db.commit()
            db.refresh(ticket)
            return ticket
        except Exception as e:
            db.rollback()
            if attempt == max_retries - 1:
                raise e

def add_ticket_message(
    db: Session,
    ticket: SupportTicket,
    sender_type: str,  # USER, ADMIN, SYSTEM
    message: str,
    is_internal_note: bool = False,
    sender_user_id: Optional[str] = None,
    sender_admin_id: Optional[str] = None,
    sender_name: Optional[str] = None
) -> TicketMessage:
    if not message or not message.strip():
        raise BadRequestException("A mensagem não pode estar vazia.")

    msg = TicketMessage(
        ticket_id=ticket.id,
        sender_type=sender_type,
        sender_user_id=sender_user_id,
        sender_admin_id=sender_admin_id,
        sender_name=sender_name,
        message=message.strip(),
        is_internal_note=is_internal_note,
        created_at=utc_now(),
        updated_at=utc_now()
    )
    db.add(msg)

    ticket.updated_at = utc_now()

    # State transitions
    if sender_type == "ADMIN" and not is_internal_note:
        if not ticket.first_response_at:
            ticket.first_response_at = utc_now()
        # If open or in progress, set to waiting user
        if ticket.status in ["OPEN", "IN_PROGRESS"]:
            ticket.status = "WAITING_USER"
            record_ticket_history(
                db=db,
                ticket_id=ticket.id,
                action="status_changed",
                previous_value="OPEN",
                new_value="WAITING_USER",
                admin_id=sender_admin_id
            )
        record_ticket_history(
            db=db,
            ticket_id=ticket.id,
            action="admin_reply",
            admin_id=sender_admin_id
        )
    elif sender_type == "ADMIN" and is_internal_note:
        record_ticket_history(
            db=db,
            ticket_id=ticket.id,
            action="internal_note",
            admin_id=sender_admin_id
        )
    elif sender_type == "USER":
        if ticket.status == "CLOSED":
            raise AppException(
                code="TICKET_CLOSED",
                message="Este chamado foi encerrado e não aceita novas interações.",
                status_code=400
            )

        # User replied back
        if ticket.status == "WAITING_USER":
            ticket.status = "IN_PROGRESS"
            record_ticket_history(
                db=db,
                ticket_id=ticket.id,
                action="status_changed",
                previous_value="WAITING_USER",
                new_value="IN_PROGRESS",
                user_id=sender_user_id
            )
        elif ticket.status == "RESOLVED":
            ticket.status = "OPEN"
            record_ticket_history(
                db=db,
                ticket_id=ticket.id,
                action="reopened",
                new_value="OPEN",
                user_id=sender_user_id
            )
        record_ticket_history(
            db=db,
            ticket_id=ticket.id,
            action="user_reply",
            user_id=sender_user_id
        )

    db.commit()
    db.refresh(msg)
    return msg

def get_ticket_metrics(db: Session, app_id: Optional[str] = None) -> Dict[str, Any]:
    query = db.query(SupportTicket)
    if app_id:
        query = query.filter(SupportTicket.app_id == app_id)

    total_open = query.filter(SupportTicket.status == "OPEN").count()
    total_urgent = query.filter(SupportTicket.priority == "URGENT", SupportTicket.status.in_(["OPEN", "IN_PROGRESS", "WAITING_USER"])).count()
    total_in_progress = query.filter(SupportTicket.status == "IN_PROGRESS").count()
    total_waiting_user = query.filter(SupportTicket.status == "WAITING_USER").count()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    resolved_today = query.filter(
        SupportTicket.status == "RESOLVED",
        SupportTicket.resolved_at >= today_start
    ).count()

    closed_total = query.filter(SupportTicket.status == "CLOSED").count()

    # Calculate average first response time
    responded_tickets = query.filter(SupportTicket.first_response_at != None).all()
    avg_first_response_minutes = None
    if responded_tickets:
        diffs = [
            (t.first_response_at - t.created_at).total_seconds() / 60.0
            for t in responded_tickets
            if t.first_response_at > t.created_at
        ]
        if diffs:
            avg_first_response_minutes = round(sum(diffs) / len(diffs), 1)

    # Calculate average resolution time
    resolved_tickets = query.filter(SupportTicket.resolved_at != None).all()
    avg_resolution_hours = None
    if resolved_tickets:
        diffs_res = [
            (t.resolved_at - t.created_at).total_seconds() / 3600.0
            for t in resolved_tickets
            if t.resolved_at > t.created_at
        ]
        if diffs_res:
            avg_resolution_hours = round(sum(diffs_res) / len(diffs_res), 1)

    return {
        "open_tickets": total_open,
        "urgent_tickets": total_urgent,
        "in_progress_tickets": total_in_progress,
        "waiting_user_tickets": total_waiting_user,
        "resolved_today": resolved_today,
        "closed_total": closed_total,
        "avg_first_response_minutes": avg_first_response_minutes,
        "avg_resolution_hours": avg_resolution_hours
    }
