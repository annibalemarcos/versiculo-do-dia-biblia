"""Initial comprehensive schema for Versículo do Dia ecosystem

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-30 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Apps
    op.create_table(
        'apps',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('package_id', sa.String(length=150), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('default_language', sa.String(length=10), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. App Config
    op.create_table(
        'app_configs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('maintenance_mode', sa.Boolean(), nullable=False),
        sa.Column('maintenance_message', sa.String(length=255), nullable=False),
        sa.Column('minimum_supported_version', sa.Integer(), nullable=False),
        sa.Column('latest_version', sa.Integer(), nullable=False),
        sa.Column('force_update', sa.Boolean(), nullable=False),
        sa.Column('store_url', sa.String(length=255), nullable=True),
        sa.Column('custom_settings', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('app_id')
    )

    # 3. Feature Flags
    op.create_table(
        'feature_flags',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('rules', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('app_id', 'key', name='uq_app_flag_key')
    )

    # 4. Admin Auth
    op.create_table(
        'admin_users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_super_admin', sa.Boolean(), nullable=False),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )

    op.create_table(
        'roles',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'permissions',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('module', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'role_permissions',
        sa.Column('role_id', sa.String(length=50), nullable=False),
        sa.Column('permission_id', sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('role_id', 'permission_id')
    )

    op.create_table(
        'admin_user_roles',
        sa.Column('admin_user_id', sa.String(length=36), nullable=False),
        sa.Column('role_id', sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(['admin_user_id'], ['admin_users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('admin_user_id', 'role_id')
    )

    op.create_table(
        'admin_audit_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('admin_id', sa.String(length=36), nullable=True),
        sa.Column('admin_email', sa.String(length=255), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('resource_type', sa.String(length=50), nullable=False),
        sa.Column('resource_id', sa.String(length=100), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('meta_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 5. Bible Content
    op.create_table(
        'bible_translations',
        sa.Column('id', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False),
        sa.Column('is_public_domain', sa.Boolean(), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'books',
        sa.Column('id', sa.String(length=10), nullable=False),
        sa.Column('number', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('testament', sa.String(length=2), nullable=False),
        sa.Column('chapters_count', sa.Integer(), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('number')
    )

    op.create_table(
        'themes',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon_name', sa.String(length=50), nullable=False),
        sa.Column('color_hex', sa.String(length=10), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'emotions',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon_name', sa.String(length=50), nullable=False),
        sa.Column('color_hex', sa.String(length=10), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'verses',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('book_id', sa.String(length=10), nullable=False),
        sa.Column('translation', sa.String(length=20), nullable=False),
        sa.Column('chapter', sa.Integer(), nullable=False),
        sa.Column('verse_number', sa.Integer(), nullable=False),
        sa.Column('reference', sa.String(length=100), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['book_id'], ['books.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['translation'], ['bible_translations.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'verse_themes',
        sa.Column('verse_id', sa.String(length=36), nullable=False),
        sa.Column('theme_id', sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(['theme_id'], ['themes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['verse_id'], ['verses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('verse_id', 'theme_id')
    )

    op.create_table(
        'verse_emotions',
        sa.Column('verse_id', sa.String(length=36), nullable=False),
        sa.Column('emotion_id', sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(['emotion_id'], ['emotions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['verse_id'], ['verses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('verse_id', 'emotion_id')
    )

    op.create_table(
        'daily_verses',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('target_date', sa.Date(), nullable=False),
        sa.Column('verse_id', sa.String(length=36), nullable=False),
        sa.Column('reflection_title', sa.String(length=200), nullable=True),
        sa.Column('reflection_text', sa.Text(), nullable=True),
        sa.Column('prayer_text', sa.Text(), nullable=True),
        sa.Column('theme_id', sa.String(length=50), nullable=True),
        sa.Column('background_image_url', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['theme_id'], ['themes.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['verse_id'], ['verses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('app_id', 'target_date', name='uq_app_target_date_daily')
    )

    op.create_table(
        'reflections',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('verse_id', sa.String(length=36), nullable=True),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('prayer', sa.Text(), nullable=True),
        sa.Column('author', sa.String(length=100), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['verse_id'], ['verses.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'devotionals',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('slug', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('cover_image_url', sa.String(length=255), nullable=True),
        sa.Column('total_days', sa.Integer(), nullable=False),
        sa.Column('is_premium', sa.Boolean(), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('publication_date', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'devotional_days',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('devotional_id', sa.String(length=50), nullable=False),
        sa.Column('day_number', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('verse_reference', sa.String(length=100), nullable=False),
        sa.Column('verse_text', sa.Text(), nullable=False),
        sa.Column('reflection', sa.Text(), nullable=False),
        sa.Column('prayer', sa.Text(), nullable=True),
        sa.Column('reading_passage', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['devotional_id'], ['devotionals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('devotional_id', 'day_number', name='uq_devotional_day_num')
    )

    # 6. Users and Preferences
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=True),
        sa.Column('name', sa.String(length=150), nullable=True),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('is_anonymous', sa.Boolean(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_premium', sa.Boolean(), nullable=False),
        sa.Column('premium_expires_at', sa.DateTime(), nullable=True),
        sa.Column('last_seen_at', sa.DateTime(), nullable=False),
        sa.Column('device_id', sa.String(length=150), nullable=True),
        sa.Column('fcm_token', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'favorites',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('verse_id', sa.String(length=36), nullable=False),
        sa.Column('reference', sa.String(length=100), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('translation', sa.String(length=20), nullable=False),
        sa.Column('reflection', sa.Text(), nullable=True),
        sa.Column('theme', sa.String(length=100), nullable=True),
        sa.Column('saved_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['verse_id'], ['verses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'verse_id', name='uq_user_verse_favorite')
    )

    op.create_table(
        'reading_history',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('verse_id', sa.String(length=36), nullable=True),
        sa.Column('reference', sa.String(length=100), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('translation', sa.String(length=20), nullable=False),
        sa.Column('read_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['verse_id'], ['verses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'user_preferences',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('theme_mode', sa.String(length=20), nullable=False),
        sa.Column('text_scale', sa.String(length=20), nullable=False),
        sa.Column('preferred_translation', sa.String(length=20), nullable=False),
        sa.Column('notifications_enabled', sa.Boolean(), nullable=False),
        sa.Column('notification_hour', sa.Integer(), nullable=False),
        sa.Column('notification_minute', sa.Integer(), nullable=False),
        sa.Column('custom_prefs', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )

    # 7. Monetization & Ads
    op.create_table(
        'entitlements',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'premium_products',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('product_id', sa.String(length=100), nullable=False),
        sa.Column('base_plan_id', sa.String(length=100), nullable=True),
        sa.Column('offer_id', sa.String(length=100), nullable=True),
        sa.Column('product_type', sa.String(length=20), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('reference_price', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('entitlements', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'subscriptions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('product_id', sa.String(length=50), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('order_id', sa.String(length=150), nullable=True),
        sa.Column('purchase_token_masked', sa.String(length=30), nullable=False),
        sa.Column('starts_at', sa.DateTime(), nullable=False),
        sa.Column('renews_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('is_auto_renewing', sa.Boolean(), nullable=False),
        sa.Column('cancel_reason', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['premium_products.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'purchases',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('product_id', sa.String(length=50), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('order_id', sa.String(length=150), nullable=True),
        sa.Column('purchase_token_masked', sa.String(length=30), nullable=False),
        sa.Column('amount_cents', sa.Integer(), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('purchased_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['premium_products.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'ad_placements',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('ad_unit_id_masked', sa.String(length=100), nullable=True),
        sa.Column('format', sa.String(length=50), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('min_interval_seconds', sa.Integer(), nullable=False),
        sa.Column('max_per_session', sa.Integer(), nullable=False),
        sa.Column('free_only', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('app_id', 'name', 'platform', name='uq_app_placement_platform')
    )

    op.create_table(
        'ad_configs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('ads_global_enabled', sa.Boolean(), nullable=False),
        sa.Column('admob_app_id_masked', sa.String(length=100), nullable=True),
        sa.Column('adsense_client_id_masked', sa.String(length=100), nullable=True),
        sa.Column('ump_consent_required', sa.Boolean(), nullable=False),
        sa.Column('test_mode', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('app_id')
    )

    op.create_table(
        'billing_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('payload_masked', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 8. Analytics
    op.create_table(
        'analytics_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('event_name', sa.String(length=100), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('anonymous_session_id', sa.String(length=100), nullable=True),
        sa.Column('properties', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'analytics_daily_aggregates',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('dau', sa.Integer(), nullable=False),
        sa.Column('wau', sa.Integer(), nullable=False),
        sa.Column('mau', sa.Integer(), nullable=False),
        sa.Column('new_users', sa.Integer(), nullable=False),
        sa.Column('active_users', sa.Integer(), nullable=False),
        sa.Column('total_users', sa.Integer(), nullable=False),
        sa.Column('sessions_count', sa.Integer(), nullable=False),
        sa.Column('verse_views', sa.Integer(), nullable=False),
        sa.Column('daily_verse_views', sa.Integer(), nullable=False),
        sa.Column('favorites_added', sa.Integer(), nullable=False),
        sa.Column('favorites_removed', sa.Integer(), nullable=False),
        sa.Column('shares_count', sa.Integer(), nullable=False),
        sa.Column('searches_count', sa.Integer(), nullable=False),
        sa.Column('devotionals_started', sa.Integer(), nullable=False),
        sa.Column('devotionals_completed', sa.Integer(), nullable=False),
        sa.Column('active_subscribers', sa.Integer(), nullable=False),
        sa.Column('new_subscriptions', sa.Integer(), nullable=False),
        sa.Column('canceled_subscriptions', sa.Integer(), nullable=False),
        sa.Column('ad_requests', sa.Integer(), nullable=False),
        sa.Column('ad_impressions', sa.Integer(), nullable=False),
        sa.Column('ad_failures', sa.Integer(), nullable=False),
        sa.Column('revenue_ads_cents', sa.BigInteger(), nullable=False),
        sa.Column('revenue_premium_cents', sa.BigInteger(), nullable=False),
        sa.Column('revenue_total_cents', sa.BigInteger(), nullable=False),
        sa.Column('mrr_cents', sa.BigInteger(), nullable=False),
        sa.Column('arr_cents', sa.BigInteger(), nullable=False),
        sa.Column('top_themes_json', sa.JSON(), nullable=False),
        sa.Column('aggregated_emotions_json', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('date', 'app_id', 'platform', name='uq_daily_aggregate_date_app_platform')
    )

    # 9. Notifications
    op.create_table(
        'notification_templates',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('title_template', sa.String(length=200), nullable=False),
        sa.Column('body_template', sa.Text(), nullable=False),
        sa.Column('deep_link', sa.String(length=255), nullable=True),
        sa.Column('language', sa.String(length=10), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'notification_campaigns',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('deep_link', sa.String(length=255), nullable=True),
        sa.Column('target_audience', sa.String(length=50), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('target_count', sa.Integer(), nullable=False),
        sa.Column('success_count', sa.Integer(), nullable=False),
        sa.Column('failure_count', sa.Integer(), nullable=False),
        sa.Column('error_summary', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 10. Experiments & Health
    op.create_table(
        'experiments',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('app_id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=True),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('target_metric', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'experiment_variants',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('experiment_id', sa.String(length=50), nullable=False),
        sa.Column('key', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('traffic_percentage', sa.Integer(), nullable=False),
        sa.Column('config_json', sa.JSON(), nullable=False),
        sa.Column('impressions_count', sa.Integer(), nullable=False),
        sa.Column('conversions_count', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['experiment_id'], ['experiments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'system_health_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('component', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('response_time_ms', sa.Integer(), nullable=True),
        sa.Column('message', sa.String(length=255), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('checked_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    pass
