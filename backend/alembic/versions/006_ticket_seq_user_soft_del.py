"""Ticket sequence and user soft delete columns

Revision ID: 006_ticket_sequence_and_user_soft_delete
Revises: 005_schema_alignment
Create Date: 2026-09-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006_ticket_seq_user_soft_del'
down_revision = '005_schema_alignment'
branch_labels = None
depends_on = None

def _column_exists(table_name: str, column_name: str) -> bool:
    try:
        bind = op.get_bind()
        if bind is None:
            return False
        insp = sa.inspect(bind)
        cols = [c['name'] for c in insp.get_columns(table_name)]
        return column_name in cols
    except Exception:
        return False

def upgrade() -> None:
    bind = op.get_bind()

    # 1. PostgreSQL sequence for human-readable sequential ticket numbers
    if bind and bind.dialect.name == "postgresql":
        op.execute(sa.text("CREATE SEQUENCE IF NOT EXISTS support_ticket_number_seq START WITH 1 INCREMENT BY 1;"))
        try:
            op.execute(sa.text("""
                SELECT setval('support_ticket_number_seq', COALESCE((
                    SELECT MAX(NULLIF(regexp_replace(ticket_number, '[^0-9]', '', 'g'), '')::integer)
                    FROM support_tickets
                ), 0) + 1, false);
            """))
        except Exception:
            pass

    # 2. Add is_deleted and deleted_at columns to users table for soft-delete support
    if not _column_exists('users', 'is_deleted'):
        op.add_column('users', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'))
        op.create_index('ix_users_is_deleted', 'users', ['is_deleted'])

    if not _column_exists('users', 'deleted_at'):
        op.add_column('users', sa.Column('deleted_at', sa.DateTime(), nullable=True))

def downgrade() -> None:
    bind = op.get_bind()
    if _column_exists('users', 'deleted_at'):
        op.drop_column('users', 'deleted_at')

    if _column_exists('users', 'is_deleted'):
        try:
            op.drop_index('ix_users_is_deleted', table_name='users')
        except Exception:
            pass
        op.drop_column('users', 'is_deleted')

    if bind and bind.dialect.name == "postgresql":
        op.execute(sa.text("DROP SEQUENCE IF EXISTS support_ticket_number_seq;"))
