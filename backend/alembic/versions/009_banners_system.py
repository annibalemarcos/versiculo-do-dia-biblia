"""Banners system for placements, target audience, priority and scheduling

Revision ID: 009_banners_system
Revises: 008_auth_governance_and_username
Create Date: 2026-09-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '009_banners_system'
down_revision = '008_auth_governance_and_username'
branch_labels = None
depends_on = None

def _table_exists(table_name: str) -> bool:
    try:
        bind = op.get_bind()
        if bind is None:
            return False
        insp = sa.inspect(bind)
        return table_name in insp.get_table_names()
    except Exception:
        return False

def upgrade() -> None:
    if not _table_exists("banners"):
        op.create_table(
            "banners",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("app_id", sa.String(length=50), sa.ForeignKey("apps.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("subtitle", sa.String(length=300), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("image_url", sa.String(length=500), nullable=True),
            sa.Column("badge_text", sa.String(length=50), nullable=True),
            sa.Column("placement", sa.String(length=100), server_default="home_top", nullable=False),
            sa.Column("target_audience", sa.String(length=50), server_default="all", nullable=False),
            sa.Column("action_type", sa.String(length=50), server_default="open_url", nullable=False),
            sa.Column("action_url", sa.String(length=500), nullable=True),
            sa.Column("action_label", sa.String(length=100), server_default="Saiba Mais", nullable=True),
            sa.Column("secondary_action_label", sa.String(length=100), nullable=True),
            sa.Column("priority", sa.Integer(), server_default="10", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.Column("starts_at", sa.DateTime(), nullable=True),
            sa.Column("expires_at", sa.DateTime(), nullable=True),
            sa.Column("dismissible", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.Column("bg_color", sa.String(length=50), nullable=True),
            sa.Column("text_color", sa.String(length=50), nullable=True),
            sa.Column("max_impressions", sa.Integer(), nullable=True),
            sa.Column("impression_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("click_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("created_by", sa.String(length=100), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False)
        )
        try:
            op.create_index("ix_banners_app_id", "banners", ["app_id"])
            op.create_index("ix_banners_placement", "banners", ["placement"])
            op.create_index("ix_banners_target_audience", "banners", ["target_audience"])
            op.create_index("ix_banners_priority", "banners", ["priority"])
            op.create_index("ix_banners_is_active", "banners", ["is_active"])
            op.create_index("ix_banners_starts_at", "banners", ["starts_at"])
            op.create_index("ix_banners_expires_at", "banners", ["expires_at"])
        except Exception:
            pass

def downgrade() -> None:
    if _table_exists("banners"):
        op.drop_table("banners")
