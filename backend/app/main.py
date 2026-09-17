import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.errors import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    global_exception_handler
)
from app.core.database import init_db, check_database_health
from app.db.seed import run_seed

# Public Routers
from app.api.public.config import router as public_config_router
from app.api.public.verses import router as public_verses_router
from app.api.public.auth import router as public_auth_router, user_router as public_me_router
from app.api.public.user_data import router as public_user_data_router
from app.api.public.analytics import router as public_analytics_router
from app.api.public.billing import router as public_billing_router
from app.api.public.support import router as public_support_router
from app.api.public.notifications import router as public_notifications_router, device_router as public_devices_router
from app.api.public.banners import router as public_banners_router

# Admin Routers
from app.api.admin.auth import router as admin_auth_router
from app.api.admin.dashboard import router as admin_dashboard_router
from app.api.admin.verses import router as admin_verses_router
from app.api.admin.daily_verses import router as admin_daily_verses_router
from app.api.admin.themes import router as admin_themes_router
from app.api.admin.emotions import router as admin_emotions_router
from app.api.admin.reflections import router as admin_reflections_router
from app.api.admin.devotionals import router as admin_devotionals_router
from app.api.admin.content_meta import router as admin_content_meta_router
from app.api.admin.users import router as admin_users_router
from app.api.admin.apps import router as admin_apps_router
from app.api.admin.feature_flags import router as admin_feature_flags_router
from app.api.admin.monetization import router as admin_monetization_router
from app.api.admin.analytics import router as admin_analytics_router
from app.api.admin.notifications import router as admin_notifications_router
from app.api.admin.experiments import router as admin_experiments_router
from app.api.admin.health import router as admin_health_router
from app.api.admin.audit import router as admin_audit_router
from app.api.admin.admins import router as admin_admins_router
from app.api.admin.tickets import router as admin_tickets_router
from app.api.admin.banners import router as admin_banners_router
from app.api.admin.registration_fields import router as admin_registration_fields_router

logger = logging.getLogger("api_main")

async def scheduled_push_worker():
    """
    Background worker that continuously scans for and dispatches scheduled FCM push notifications.
    """
    from app.core.database import SessionLocal
    from app.services.fcm_user_push_service import process_due_scheduled_campaigns

    interval = max(10, getattr(settings, "NOTIFICATION_SCHEDULER_INTERVAL_SECONDS", 60))
    logger.info(f"[FCM WORKER] Background scheduled push worker running every {interval}s")

    while True:
        try:
            await asyncio.sleep(interval)
            db = SessionLocal()
            try:
                process_due_scheduled_campaigns(db)
            finally:
                db.close()
        except asyncio.CancelledError:
            logger.info("[FCM WORKER] Scheduled push worker stopped gracefully")
            break
        except Exception as e:
            logger.error(f"[FCM WORKER] Unexpected exception in scheduled worker loop: {e}", exc_info=True)
            await asyncio.sleep(10)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB & Seed Data on startup
    init_db()
    try:
        run_seed()
    except Exception as e:
        print(f"Notice on seed startup: {e}")

    # Start background worker for scheduled user push campaigns
    worker_task = asyncio.create_task(scheduled_push_worker())

    yield

    # Clean shutdown of worker task
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Backend Central e API Administrativa para o ecossistema de Versículo do Dia & Bíblia",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    lifespan=lifespan
)

# CORS Configuration
origins = settings.cors_origins
if "*" in origins or not origins:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Root endpoint
@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "status": "online",
        "version": "1.0.0",
        "docs": f"{settings.API_V1_PREFIX}/docs",
        "admin_api": f"{settings.API_V1_PREFIX}/admin"
    }

@app.get("/health")
@app.get(f"{settings.API_V1_PREFIX}/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "version": "1.0.0"
    }

@app.get("/health/ready")
@app.get(f"{settings.API_V1_PREFIX}/health/ready")
@app.get("/ready")
def readiness_check():
    """
    Readiness probe endpoint:
    Executa 'SELECT 1' no banco de dados para verificar prontidão do serviço.
    Retorna 200 OK quando o banco de dados está disponível.
    Retorna 503 Service Unavailable quando o banco está indisponível.
    Preserva segurança estrita: nenhuma credencial, segredo ou URL é exposta.
    """
    health = check_database_health()
    if not health.get("healthy", False):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unavailable",
                "database": "unavailable",
                "ready": False,
                "error": health.get("error", "Database connection failed or timed out.")
            }
        )
    return {
        "status": "ready",
        "database": "available",
        "ready": True,
        "response_time_ms": health.get("response_time_ms", 1)
    }

# Public API routes
app.include_router(public_config_router, prefix=settings.API_V1_PREFIX)
app.include_router(public_verses_router, prefix=settings.API_V1_PREFIX)
app.include_router(public_auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(public_me_router, prefix=settings.API_V1_PREFIX)
app.include_router(public_user_data_router, prefix=settings.API_V1_PREFIX)
app.include_router(public_analytics_router, prefix=settings.API_V1_PREFIX)
app.include_router(public_billing_router, prefix=settings.API_V1_PREFIX)
app.include_router(public_support_router, prefix=settings.API_V1_PREFIX)
app.include_router(public_notifications_router, prefix=settings.API_V1_PREFIX)
app.include_router(public_devices_router, prefix=settings.API_V1_PREFIX)
app.include_router(public_banners_router, prefix=settings.API_V1_PREFIX)

# Admin API routes (under /api/v1/admin)
admin_prefix = f"{settings.API_V1_PREFIX}/admin"
app.include_router(admin_auth_router, prefix=admin_prefix)
app.include_router(admin_dashboard_router, prefix=admin_prefix)
app.include_router(admin_verses_router, prefix=admin_prefix)
app.include_router(admin_daily_verses_router, prefix=admin_prefix)
app.include_router(admin_themes_router, prefix=admin_prefix)
app.include_router(admin_emotions_router, prefix=admin_prefix)
app.include_router(admin_reflections_router, prefix=admin_prefix)
app.include_router(admin_devotionals_router, prefix=admin_prefix)
app.include_router(admin_content_meta_router, prefix=admin_prefix)
app.include_router(admin_users_router, prefix=admin_prefix)
app.include_router(admin_apps_router, prefix=admin_prefix)
app.include_router(admin_feature_flags_router, prefix=admin_prefix)
app.include_router(admin_monetization_router, prefix=admin_prefix)
app.include_router(admin_analytics_router, prefix=admin_prefix)
app.include_router(admin_notifications_router, prefix=admin_prefix)
app.include_router(admin_experiments_router, prefix=admin_prefix)
app.include_router(admin_health_router, prefix=admin_prefix)
app.include_router(admin_audit_router, prefix=admin_prefix)
app.include_router(admin_admins_router, prefix=admin_prefix)
app.include_router(admin_tickets_router, prefix=admin_prefix)
app.include_router(admin_banners_router, prefix=admin_prefix)
app.include_router(admin_registration_fields_router, prefix=admin_prefix)
