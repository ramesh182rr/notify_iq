from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "NotifyIQ API"
    log_level: str = "INFO"
    database_url: str | None = None
    cloud_ai_enabled: bool = False
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
