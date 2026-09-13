import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

Base = declarative_base()

db_url = settings.DATABASE_URL
is_production = settings.APP_ENV.lower() in ("production", "prod") or os.environ.get("ENVIRONMENT", "").lower() in ("production", "prod")
is_test_env = os.environ.get("USE_SQLITE_TEST", "false").lower() in ("true", "1", "yes")

# Normalize DATABASE_URL for SQLAlchemy 2.0 / psycopg2 compatibility
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

def get_configured_engine():
    global db_url

    if is_production:
        # STRICT PRODUCTION RULES: SQLite is strictly forbidden in production!
        if db_url.startswith("sqlite"):
            error_msg = (
                "FATAL CONFIGURATION ERROR: SQLite database is STRICTLY PROHIBITED in production! "
                "DATABASE_URL must point to an active PostgreSQL 15+ instance."
            )
            logger.critical(error_msg)
            raise RuntimeError(error_msg)

        try:
            logger.info("Connecting to production PostgreSQL database...")
            pg_engine = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
                pool_timeout=30
            )
            # Test connection immediately
            with pg_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Connected successfully to PostgreSQL database.")
            return pg_engine
        except Exception as e:
            logger.critical(
                f"FATAL: Could not connect to PostgreSQL in production environment! "
                f"Database connection error: {e}",
                exc_info=True
            )
            raise RuntimeError(f"Fatal PostgreSQL connection error in production: {e}")

    # Non-production (development / test)
    if is_test_env or db_url.startswith("sqlite"):
        logger.info(f"Using SQLite for development/testing: {settings.SQLITE_FALLBACK_URL}")
        return create_engine(
            settings.SQLITE_FALLBACK_URL if is_test_env else db_url,
            connect_args={"check_same_thread": False}
        )
    
    # Try PostgreSQL connection in development, fallback to SQLite if unavailable
    try:
        pg_engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10
        )
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info(f"Connected successfully to development PostgreSQL database.")
        return pg_engine
    except Exception as e:
        logger.warning(
            f"[DEVELOPMENT DATABASE WARNING] Não foi possível conectar ao PostgreSQL em '{db_url}'.\n"
            f"Detalhes: {e}\n"
            f"-> Iniciando modo de desenvolvimento local com SQLite ({settings.SQLITE_FALLBACK_URL}).\n"
            f"-> Em ambiente de produção (APP_ENV=production), essa inicialização falhará obrigatoriamente."
        )
        return create_engine(
            settings.SQLITE_FALLBACK_URL,
            connect_args={"check_same_thread": False}
        )

engine = get_configured_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

EXPECTED_ALEMBIC_HEAD = "005_schema_alignment"

def check_database_health() -> tuple:
    """
    Executes 'SELECT 1' to verify database connectivity.
    Returns (True, 'ok') or (False, 'error message').
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "Database connection healthy"
    except Exception as e:
        return False, str(e)

def check_migration_status() -> tuple:
    """
    Checks the current Alembic revision in the database against EXPECTED_ALEMBIC_HEAD.
    Returns (True, current_rev) if at HEAD, or (False, status_detail).
    """
    try:
        with engine.connect() as conn:
            res = conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1"))
            row = res.fetchone()
            if not row:
                return False, "no_version_record"
            current_rev = row[0]
            if current_rev == EXPECTED_ALEMBIC_HEAD:
                return True, current_rev
            return False, f"outdated:{current_rev}"
    except Exception as e:
        return False, f"table_missing_or_error:{str(e)}"

def init_db():
    """
    Creates tables for development and testing only.
    In production, Base.metadata.create_all() is strictly prohibited;
    schema creation and evolution must be managed exclusively by 'alembic upgrade head'.
    """
    if is_production:
        logger.info("Production mode detected: skipping Base.metadata.create_all(). Schema is managed by Alembic migrations.")
        return

    import app.models  # Ensure all models are registered with Base metadata
    Base.metadata.create_all(bind=engine)

def get_db():
    """
    FastAPI dependency yielding a SQLAlchemy database session.
    Rolls back automatically on unhandled exceptions to prevent leaking failed transactions.
    """
    db: Session = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
