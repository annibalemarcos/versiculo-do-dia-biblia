import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

Base = declarative_base()

db_url = settings.DATABASE_URL
is_test_env = os.environ.get("USE_SQLITE_TEST", "false").lower() in ("true", "1", "yes")

def get_configured_engine():
    global db_url
    if is_test_env or db_url.startswith("sqlite"):
        return create_engine(
            settings.SQLITE_FALLBACK_URL if is_test_env else db_url,
            connect_args={"check_same_thread": False}
        )
    
    # Try PostgreSQL connection
    try:
        pg_engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20
        )
        # Test connection immediately
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info(f"Connected successfully to PostgreSQL database ({db_url.split('@')[-1] if '@' in db_url else 'configured'}).")
        return pg_engine
    except Exception as e:
        if settings.APP_ENV != "production":
            logger.warning(
                f"[DATABASE WARNING] Não foi possível conectar ao PostgreSQL em '{db_url}'.\n"
                f"Detalhes do erro: {e}\n"
                f"-> Iniciando modo de desenvolvimento com SQLite ({settings.SQLITE_FALLBACK_URL}).\n"
                f"-> Para usar PostgreSQL, inicie o serviço do PostgreSQL ou use Docker: 'docker run --name pg-bible -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=bible_central_db -p 5432:5432 -d postgres:16'"
            )
            return create_engine(
                settings.SQLITE_FALLBACK_URL,
                connect_args={"check_same_thread": False}
            )
        else:
            logger.critical("Fatal: Could not connect to PostgreSQL in production environment.", exc_info=True)
            raise e

engine = get_configured_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """
    Creates tables if they don't exist yet (safe on startup for both SQLite and PostgreSQL).
    """
    import app.models  # Ensure all models are registered with Base metadata
    Base.metadata.create_all(bind=engine)

def get_db():
    """
    FastAPI dependency yielding a SQLAlchemy database session.
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class DatabaseHealthResult(dict):
    """
    Result dictionary representing database health status.
    Supports dictionary access (res['status']), attribute access (res.status),
    and direct boolean evaluation (bool(res) -> True if healthy).
    Guarantees no sensitive credentials or URLs are ever exposed.
    """
    def __init__(self, healthy: bool, status: str, response_time_ms: int = None, error: str = None):
        super().__init__(
            healthy=healthy,
            is_healthy=healthy,
            status=status,
            database=status,
            response_time_ms=response_time_ms,
            error=error
        )
        self.healthy = healthy
        self.is_healthy = healthy
        self.status = status
        self.database = status
        self.response_time_ms = response_time_ms
        self.error = error

    def __bool__(self):
        return self.healthy

def check_database_health(db_or_engine = None) -> DatabaseHealthResult:
    """
    Executes 'SELECT 1' to verify database connectivity.
    Guarantees:
      - Execution of SELECT 1
      - Clear indication of database availability ('available' / 'unavailable')
      - Absolute protection against secrets / credentials exposure in error details
    """
    import time
    start_time = time.time()
    try:
        if db_or_engine is not None:
            if hasattr(db_or_engine, "execute"):
                # Session or Connection object
                db_or_engine.execute(text("SELECT 1"))
            elif hasattr(db_or_engine, "connect"):
                # Engine object
                with db_or_engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
            else:
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
        else:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        duration_ms = max(1, int((time.time() - start_time) * 1000))
        return DatabaseHealthResult(
            healthy=True,
            status="available",
            response_time_ms=duration_ms,
            error=None
        )
    except Exception as e:
        logger.error(f"Database health check failed: {type(e).__name__}")
        # Sanitize error to ensure passwords, URLs, or secrets are NEVER leaked
        sanitized_error = "Database connection failed or timed out."
        return DatabaseHealthResult(
            healthy=False,
            status="unavailable",
            response_time_ms=None,
            error=sanitized_error
        )

