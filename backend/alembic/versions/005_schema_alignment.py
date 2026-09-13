"""Schema alignment: devotional_progress, notification_deliveries, experiment_assignments, missing timestamp columns

Revision ID: 005_schema_alignment
Revises: 004_consolidation_updates
Create Date: 2026-09-13 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005_schema_alignment'
down_revision = '004_consolidation_updates'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Table: devotional_progress
    op.create_table(
        'devotional_progress',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('devotional_id', sa.String(length=50), nullable=False),
        sa.Column('current_day', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('completed_days', sa.JSON(), nullable=False),
        sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['devotional_id'], ['devotionals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'devotional_id', name='uq_user_devotional_progress')
    )
    op.create_index('ix_devotional_progress_user_id', 'devotional_progress', ['user_id'])
    op.create_index('ix_devotional_progress_devotional_id', 'devotional_progress', ['devotional_id'])

    # 2. Table: notification_deliveries
    op.create_table(
        'notification_deliveries',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('campaign_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='sent'),
        sa.Column('delivered_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['campaign_id'], ['notification_campaigns.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_notification_deliveries_campaign_id', 'notification_deliveries', ['campaign_id'])
    op.create_index('ix_notification_deliveries_user_id', 'notification_deliveries', ['user_id'])

    # 3. Table: experiment_assignments
    op.create_table(
        'experiment_assignments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('experiment_id', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('anonymous_id', sa.String(length=100), nullable=False),
        sa.Column('variant_key', sa.String(length=50), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['experiment_id'], ['experiments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_experiment_assignments_experiment_id', 'experiment_assignments', ['experiment_id'])
    op.create_index('ix_experiment_assignments_user_id', 'experiment_assignments', ['user_id'])
    op.create_index('ix_experiment_assignments_anonymous_id', 'experiment_assignments', ['anonymous_id'])

    # 4. Add missing columns to existing tables
    with op.batch_alter_table('app_configs') as batch_op:
        batch_op.add_column(sa.Column('app_mode', sa.String(length=20), server_default='PRODUCTION', nullable=False))

    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False))
        batch_op.add_column(sa.Column('deleted_at', sa.DateTime(), nullable=True))
        batch_op.create_index('ix_users_is_deleted', ['is_deleted'])

    # Timestamps for child/association tables
    with op.batch_alter_table('bible_translations') as batch_op:
        batch_op.add_column(sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))

    with op.batch_alter_table('devotional_days') as batch_op:
        batch_op.add_column(sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))

    with op.batch_alter_table('permissions') as batch_op:
        batch_op.add_column(sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))

    with op.batch_alter_table('role_permissions') as batch_op:
        batch_op.add_column(sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))

    with op.batch_alter_table('admin_user_roles') as batch_op:
        batch_op.add_column(sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))

    with op.batch_alter_table('verse_themes') as batch_op:
        batch_op.add_column(sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))

    with op.batch_alter_table('verse_emotions') as batch_op:
        batch_op.add_column(sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))

def downgrade() -> None:
    with op.batch_alter_table('verse_emotions') as batch_op:
        batch_op.drop_column('created_at')
    with op.batch_alter_table('verse_themes') as batch_op:
        batch_op.drop_column('created_at')
    with op.batch_alter_table('admin_user_roles') as batch_op:
        batch_op.drop_column('created_at')
    with op.batch_alter_table('role_permissions') as batch_op:
        batch_op.drop_column('created_at')
    with op.batch_alter_table('permissions') as batch_op:
        batch_op.drop_column('created_at')
    with op.batch_alter_table('devotional_days') as batch_op:
        batch_op.drop_column('updated_at')
        batch_op.drop_column('created_at')
    with op.batch_alter_table('bible_translations') as batch_op:
        batch_op.drop_column('updated_at')
        batch_op.drop_column('created_at')
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_index('ix_users_is_deleted')
        batch_op.drop_column('deleted_at')
        batch_op.drop_column('is_deleted')
    with op.batch_alter_table('app_configs') as batch_op:
        batch_op.drop_column('app_mode')
    op.drop_table('experiment_assignments')
    op.drop_table('notification_deliveries')
    op.drop_table('devotional_progress')
