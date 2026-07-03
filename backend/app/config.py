from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    postgres_user: str = "hdauser"
    postgres_password: str = "hdapass"
    postgres_db: str = "homedesignapp"

    environment: str = "development"
    cors_origins: str = "http://localhost:5173"

    # PostgreSQL connection pool
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_timeout: int = 30

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    model_config = {"env_file": ".env"}


settings = Settings()
