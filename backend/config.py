import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # For PostgreSQL Database
    DATABASE_URL: str

    # Secret for signing our own custom JWTs
    JWT_SECRET_KEY: str

    # Algorithm for our custom JWTs
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: str = "http://localhost:3000,https://project-hub-peach.vercel.app"

    class Config:
        env_file = ".env"

settings = Settings()
