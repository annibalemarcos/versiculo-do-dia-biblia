"""Staff push devices table for browser/FCM real push notifications

Revision ID: 003_staff_push_devices
Revises: 002_staff_hierarchy_and_notifications
Create Date: 2026-08-30 02:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_staff_push_devices'
down_revision = '002_staff_hierarchy_and_notifications'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'staff_push_devices',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('admin_id', sa.String(length=36), nullable=False),
        sa.Column('token', sa.Text(), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False, server_default='webpush'),
        sa.Column('platform', sa.String(length=50), nullable=False, server_default='web_desktop'),
        sa.Column('browser', sa.String(length=100), nullable=True),
        sa.Column('device_name', sa.String(length=150), nullable=True),
        sa.Column('endpoint', sa.Text(), nullable=True),
        sa.Column('p256dh', sa.String(length=255), nullable=True),
        sa.Column('auth', sa.String(length=255), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_seen_at', sa.DateTime(), nullable=False),
        sa.Column('last_success_at', sa.DateTime(), nullable=True),
        sa.Column('last_failure_at', sa.DateTime(), nullable=True),
        sa.Column('failure_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['admin_id'], ['admin_users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_staff_push_devices_admin_id', 'staff_push_devices', ['admin_id'])
    op.create_index('ix_staff_push_devices_token', 'staff_push_devices', ['token'], unique=True)
    op.create_index('ix_staff_push_devices_active', 'staff_push_devices', ['active'])

def downgrade() -> None:
    op.drop_index('ix_staff_push_devices_active', 'staff_push_devices')
    op.drop_index('ix_staff_push_devices_token', 'staff_push_devices')
    op.drop_index('ix_staff_push_devices_admin_id', 'staff_push_devices')
    op.drop_table('staff_push_devices')
