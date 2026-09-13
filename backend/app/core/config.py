import os
from typing import List

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    from pydantic import Field

    class Settings(BaseSettings):
        APP_NAME: str = "Bible Central Backend"
        APP_ENV: str = "development"
        DEBUG: bool = True
        API_V1_PREFIX: str = "/api/v1"
        
        # Secret Key for JWT Signing
        SECRET_KEY: str = "dev_secret_key_change_in_production_min_32_chars_long!"
        JWT_ALGORITHM: str = "HS256"
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
        REFRESH_TOKEN_EXPIRE_DAYS: int = 30

        # PostgreSQL Database URL
        DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/bible_central_db"
        
        # Fallback to SQLite if PostgreSQL is not available in local test env
        SQLITE_FALLBACK_URL: str = "sqlite:///./bible_central_local.db"
        
        # CORS
        ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8000"
        
        # Multi-App
        DEFAULT_APP_ID: str = "verse_daily"
        
        # Google Play Developer API (Billing)
        GOOGLE_PLAY_PACKAGE_NAME: str = "com.aistudio.biblia.qxudqu"
        GOOGLE_PLAY_CREDENTIALS_JSON_PATH: str = ""
        GOOGLE_PLAY_RTDN_TOPIC: str = ""
        
        # FCM / Push
        FCM_SERVER_KEY: str = ""
        FCM_SERVICE_ACCOUNT_PATH: str = ""
        
        # AdMob / AdSense
        ADMOB_APP_ID_ANDROID: str = ""
        ADSENSE_CLIENT_ID: str = ""
        
        # Rate Limiting
        RATE_LIMIT_PER_MINUTE: int = 120

        @property
        def cors_origins(self) -> List[str]:
            return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            extra="ignore"
        )

    settings = Settings()

except Exception:
    # Safe fallback if pydantic-settings has version mismatch
    class SimpleSettings:
        APP_NAME: str = os.getenv("APP_NAME", "Bible Central Backend")
        APP_ENV: str = os.getenv("APP_ENV", "development")
        DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
        API_V1_PREFIX: str = "/api/v1"
        SECRET_KEY: str = os.getenv("SECRET_KEY", "dev_secret_key_change_in_production_min_32_chars_long!")
        JWT_ALGORITHM: str = "HS256"
        ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
        REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
        DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/bible_central_db")
        SQLITE_FALLBACK_URL: str = "sqlite:///./bible_central_local.db"
        ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8000")
        DEFAULT_APP_ID: str = "verse_daily"
        GOOGLE_PLAY_PACKAGE_NAME: str = "com.aistudio.biblia.qxudqu"
        GOOGLE_PLAY_CREDENTIALS_JSON_PATH: str = ""
        GOOGLE_PLAY_RTDN_TOPIC: str = ""
        FCM_SERVER_KEY: str = ""
        FCM_SERVICE_ACCOUNT_PATH: str = ""
        ADMOB_APP_ID_ANDROID: str = ""
        ADSENSE_CLIENT_ID: str = ""
        RATE_LIMIT_PER_MINUTE: int = 120

        @property
        def cors_origins(self) -> List[str]:
            return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    settings = SimpleSettings()

