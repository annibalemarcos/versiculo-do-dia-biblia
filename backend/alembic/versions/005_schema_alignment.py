"""Schema alignment with Base.metadata

Revision ID: 005_schema_alignment
Revises: 004_consolidation_updates
Create Date: 2026-09-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005_schema_alignment'
down_revision = '004_consolidation_updates'
branch_labels = None
depends_on = None

def _table_exists(table_name: str) -> bool:
    try:
        bind = op.get_bind()
        if bind is None:
            return False
        insp = sa.inspect(bind)
        return insp.has_table(table_name)
    except Exception:
        return False

def upgrade() -> None:
    # 1. support_tickets
    if not _table_exists('support_tickets'):
        op.create_table(
            'support_tickets',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('ticket_number', sa.String(length=20), nullable=False),
            sa.Column('app_id', sa.String(length=50), nullable=False, server_default='verse_daily'),
            sa.Column('user_id', sa.String(length=36), nullable=True),
            sa.Column('guest_email', sa.String(length=255), nullable=True),
            sa.Column('guest_name', sa.String(length=150), nullable=True),
            sa.Column('subject', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('category', sa.String(length=50), nullable=False, server_default='OTHER'),
            sa.Column('priority', sa.String(length=20), nullable=False, server_default='NORMAL'),
            sa.Column('status', sa.String(length=30), nullable=False, server_default='OPEN'),
            sa.Column('assigned_admin_id', sa.String(length=36), nullable=True),
            sa.Column('first_response_at', sa.DateTime(), nullable=True),
            sa.Column('resolved_at', sa.DateTime(), nullable=True),
            sa.Column('closed_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['assigned_admin_id'], ['admin_users.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('ticket_number')
        )
        op.create_index('ix_support_tickets_app_id', 'support_tickets', ['app_id'])
        op.create_index('ix_support_tickets_assigned_admin_id', 'support_tickets', ['assigned_admin_id'])
        op.create_index('ix_support_tickets_category', 'support_tickets', ['category'])
        op.create_index('ix_support_tickets_guest_email', 'support_tickets', ['guest_email'])
        op.create_index('ix_support_tickets_priority', 'support_tickets', ['priority'])
        op.create_index('ix_support_tickets_status', 'support_tickets', ['status'])
        op.create_index('ix_support_tickets_ticket_number', 'support_tickets', ['ticket_number'])
        op.create_index('ix_support_tickets_user_id', 'support_tickets', ['user_id'])

    # 2. ticket_messages
    if not _table_exists('ticket_messages'):
        op.create_table(
            'ticket_messages',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('ticket_id', sa.String(length=36), nullable=False),
            sa.Column('sender_type', sa.String(length=20), nullable=False),
            sa.Column('sender_user_id', sa.String(length=36), nullable=True),
            sa.Column('sender_admin_id', sa.String(length=36), nullable=True),
            sa.Column('sender_name', sa.String(length=150), nullable=True),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('is_internal_note', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['sender_admin_id'], ['admin_users.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['sender_user_id'], ['users.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_ticket_messages_is_internal_note', 'ticket_messages', ['is_internal_note'])
        op.create_index('ix_ticket_messages_sender_type', 'ticket_messages', ['sender_type'])
        op.create_index('ix_ticket_messages_ticket_id', 'ticket_messages', ['ticket_id'])

    # 3. ticket_attachments
    if not _table_exists('ticket_attachments'):
        op.create_table(
            'ticket_attachments',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('ticket_id', sa.String(length=36), nullable=False),
            sa.Column('message_id', sa.String(length=36), nullable=True),
            sa.Column('file_name', sa.String(length=255), nullable=False),
            sa.Column('mime_type', sa.String(length=100), nullable=False),
            sa.Column('file_size', sa.Integer(), nullable=False),
            sa.Column('storage_reference', sa.Text(), nullable=False),
            sa.Column('uploaded_by', sa.String(length=50), nullable=False, server_default='USER'),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['message_id'], ['ticket_messages.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_ticket_attachments_message_id', 'ticket_attachments', ['message_id'])
        op.create_index('ix_ticket_attachments_ticket_id', 'ticket_attachments', ['ticket_id'])

    # 4. ticket_history
    if not _table_exists('ticket_history'):
        op.create_table(
            'ticket_history',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('ticket_id', sa.String(length=36), nullable=False),
            sa.Column('action', sa.String(length=100), nullable=False),
            sa.Column('previous_value', sa.String(length=255), nullable=True),
            sa.Column('new_value', sa.String(length=255), nullable=True),
            sa.Column('admin_id', sa.String(length=36), nullable=True),
            sa.Column('user_id', sa.String(length=36), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['admin_id'], ['admin_users.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['ticket_id'], ['support_tickets.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_ticket_history_ticket_id', 'ticket_history', ['ticket_id'])

    # 5. devotional_progress
    if not _table_exists('devotional_progress'):
        op.create_table(
            'devotional_progress',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=36), nullable=False),
            sa.Column('devotional_id', sa.String(length=50), nullable=False),
            sa.Column('current_day', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('completed_days', sa.JSON(), nullable=False),
            sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('completed_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['devotional_id'], ['devotionals.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id', 'devotional_id', name='uq_user_devotional_progress')
        )
        op.create_index('ix_devotional_progress_devotional_id', 'devotional_progress', ['devotional_id'])
        op.create_index('ix_devotional_progress_user_id', 'devotional_progress', ['user_id'])

    # 6. experiment_assignments
    if not _table_exists('experiment_assignments'):
        op.create_table(
            'experiment_assignments',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('experiment_id', sa.String(length=50), nullable=False),
            sa.Column('user_id', sa.String(length=36), nullable=True),
            sa.Column('anonymous_id', sa.String(length=100), nullable=False),
            sa.Column('variant_key', sa.String(length=50), nullable=False),
            sa.Column('assigned_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['experiment_id'], ['experiments.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_experiment_assignments_anonymous_id', 'experiment_assignments', ['anonymous_id'])
        op.create_index('ix_experiment_assignments_experiment_id', 'experiment_assignments', ['experiment_id'])
        op.create_index('ix_experiment_assignments_user_id', 'experiment_assignments', ['user_id'])

    # 7. notification_deliveries
    if not _table_exists('notification_deliveries'):
        op.create_table(
            'notification_deliveries',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('campaign_id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=36), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='sent'),
            sa.Column('delivered_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['campaign_id'], ['notification_campaigns.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_notification_deliveries_campaign_id', 'notification_deliveries', ['campaign_id'])
        op.create_index('ix_notification_deliveries_user_id', 'notification_deliveries', ['user_id'])

def downgrade() -> None:
    op.drop_table('notification_deliveries')
    op.drop_table('experiment_assignments')
    op.drop_table('devotional_progress')
    op.drop_table('ticket_history')
    op.drop_table('ticket_attachments')
    op.drop_table('ticket_messages')
    op.drop_table('support_tickets')
