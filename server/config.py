import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

class Config:
    """Application configuration."""

    # =========================
    # Supabase Configuration
    # =========================
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

    # =========================
    # JWT Configuration
    # =========================
    JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    JWT_ALGORITHM = "HS256"

    # =========================
    # Environment Settings
    # =========================
    ENV = os.getenv("ENV", "development")
    DEBUG = ENV == "development"

    # =========================
    # Server Configuration
    # =========================
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 5000))

    # =========================
    # Admin / Owner Config
    # =========================
    OWNER_OPEN_ID = os.getenv("OWNER_OPEN_ID", "")

# Create config instance
config = Config()