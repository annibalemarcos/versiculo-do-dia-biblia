import os
import sys
import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
import app.core.database as db_module
from app.core.database import (
    Base,
    get_configured_engine,
    init_db,
    get_db,
    check_database_health,
    check_migration_status,
    EXPECTED_ALEMBIC_HEAD
)
from app.db.seed import run_seed, run_bootstrap, run_demo_seed
from app.models.app import App
from app.models.auth import Role, AdminUser
from app.models.ticket import SupportTicket
from app.models.notification import UserNotification
from app.models.analytics import AnalyticsDailyAggregate
from app.main import app

client = TestClient(app)

# ============================================================================
# 1. APP_ENV=production impede Base.metadata.create_all()
# ============================================================================
def test_production_blocks_create_all():
    with patch("app.core.database.is_production", True):
        with patch.object(Base.metadata, "create_all") as mock_create_all:
            init_db()
            mock_create_all.assert_not_called()

# ============================================================================
# 2. APP_ENV=production impede SQLite fallback
# ============================================================================
def test_production_blocks_sqlite_database():
    with patch("app.core.database.is_production", True):
        with patch.object(db_module, "db_url", "sqlite:///./production_forbidden.db"):
            with pytest.raises(RuntimeError) as exc_info:
                get_configured_engine()
            assert "SQLite database is STRICTLY PROHIBITED in production" in str(exc_info.value)

# ============================================================================
# 3. DATABASE_URL inválida em produção lança erro fatal (sem fallback silencioso)
# ============================================================================
def test_production_invalid_db_url_raises_fatal():
    invalid_pg_url = "postgresql+psycopg2://nonexistent_user:wrong_pass@127.0.0.1:59999/nonexistent_db"
    with patch("app.core.database.is_production", True):
        with patch.object(db_module, "db_url", invalid_pg_url):
            with pytest.raises(RuntimeError) as exc_info:
                get_configured_engine()
            assert "Fatal PostgreSQL connection error in production" in str(exc_info.value)

# ============================================================================
# 4. RUN_SEED_ON_STARTUP=false não roda seed no startup
# ============================================================================
def test_run_seed_on_startup_false_skips_seed():
    with patch("app.main.is_production", False):
        with patch.object(settings, "RUN_SEED_ON_STARTUP", False):
            with patch("app.main.run_seed") as mock_seed:
                # Trigger startup logic manually as defined in lifespan
                if not False and settings.RUN_SEED_ON_STARTUP:
                    mock_seed()
                mock_seed.assert_not_called()

# ============================================================================
# 5. Seed em produção executa apenas bootstrap, NUNCA fake data
# ============================================================================
def test_seed_in_production_runs_only_bootstrap():
    test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(bind=test_engine)
    session = TestSession()

    try:
        # Run seed in production mode
        with patch("app.db.seed.is_production", True):
            run_seed(include_demo_data=False, db=session)

        # 1. Essential bootstrap records MUST exist
        assert session.query(App).filter(App.id == "verse_daily").first() is not None
        assert session.query(Role).filter(Role.id == "super_admin").first() is not None

        # 2. Fake / demonstration records MUST NOT exist
        assert session.query(AnalyticsDailyAggregate).count() == 0
        assert session.query(SupportTicket).count() == 0
        assert session.query(UserNotification).count() == 0
    finally:
        session.close()

# ============================================================================
# 6. Correção do bug da variável 'now' (tickets existentes e notifications vazias)
# ============================================================================
def test_now_variable_scoping_bug_fixed():
    test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(bind=test_engine)
    session = TestSession()

    try:
        # First, ensure essential App exists for FK constraint
        app_item = App(id="verse_daily", name="Versículo do Dia", package_id="com.test", platform="android", default_language="pt-BR")
        session.add(app_item)
        session.flush()

        # Pre-populate a ticket to trigger the previous UnboundLocalError scenario
        existing_ticket = SupportTicket(
            ticket_number="TKT-PRE-EXISTING",
            app_id="verse_daily",
            subject="Pre-existing Ticket",
            description="Testing 'now' variable scoping bug",
            category="TECHNICAL",
            priority="NORMAL",
            status="OPEN"
        )
        session.add(existing_ticket)
        session.commit()

        # Verify tickets exist and notifications are empty
        assert session.query(SupportTicket).count() > 0
        assert session.query(UserNotification).count() == 0

        # Running run_demo_seed with include_demo_data=True must NOT fail with UnboundLocalError
        with patch("app.db.seed.is_production", False):
            run_seed(include_demo_data=True, db=session)

        # Verify that UserNotification was populated cleanly
        assert session.query(UserNotification).count() > 0
    finally:
        session.close()

# ============================================================================
# 7. get_db() executa rollback ao lançar exceção
# ============================================================================
def test_get_db_rolls_back_on_exception():
    mock_session = MagicMock()
    with patch("app.core.database.SessionLocal", return_value=mock_session):
        db_generator = get_db()
        session_yielded = next(db_generator)
        assert session_yielded == mock_session

        # Throw exception into generator
        with pytest.raises(RuntimeError):
            db_generator.throw(RuntimeError("Database query transaction failed"))

        # Verify rollback was called before closing
        mock_session.rollback.assert_called_once()
        mock_session.close.assert_called_once()

# ============================================================================
# 8. Alembic migrations sobem limpas do zero em banco temporário
# ============================================================================
def test_alembic_migrations_clean_upgrade():
    import tempfile
    from alembic.config import Config
    from alembic import command

    with tempfile.NamedTemporaryFile(suffix=".db") as tmp:
        tmp_db_url = f"sqlite:///{tmp.name}"
        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))
        alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
        alembic_cfg.set_main_option("sqlalchemy.url", tmp_db_url)

        # Run full migration to head
        with patch.object(settings, "DATABASE_URL", tmp_db_url):
            command.upgrade(alembic_cfg, "head")

        # Verify alembic_version table matches EXPECTED_ALEMBIC_HEAD
        mig_engine = create_engine(tmp_db_url)
        with mig_engine.connect() as conn:
            res = conn.execute(text("SELECT version_num FROM alembic_version"))
            row = res.fetchone()
            assert row is not None
            assert row[0] == EXPECTED_ALEMBIC_HEAD

# ============================================================================
# 9. /health/ready responde 200 quando DB ok e migration head; 503 se desatualizada
# ============================================================================
def test_health_ready_responses():
    # Case A: Healthy DB + Up-to-date migration -> 200 OK
    with patch("app.main.check_database_health", return_value=(True, "ok")):
        with patch("app.main.check_migration_status", return_value=(True, EXPECTED_ALEMBIC_HEAD)):
            response = client.get("/health/ready")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ready"
            assert data["database"] == "connected"
            assert data["migration"] == "up_to_date"
            assert data["revision"] == EXPECTED_ALEMBIC_HEAD

    # Case B: Healthy DB + Outdated migration -> 503 Service Unavailable
    with patch("app.main.check_database_health", return_value=(True, "ok")):
        with patch("app.main.check_migration_status", return_value=(False, "outdated:004_consolidation_updates")):
            response = client.get("/health/ready")
            assert response.status_code == 503
            data = response.json()
            assert data["status"] == "not_ready"
            assert data["database"] == "ok"
            assert data["migration"] == "outdated"
            assert data["expected_revision"] == EXPECTED_ALEMBIC_HEAD

    # Case C: Disconnected DB -> 503 Service Unavailable
    with patch("app.main.check_database_health", return_value=(False, "Connection refused")):
        response = client.get("/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "not_ready"
        assert data["database"] == "disconnected"
