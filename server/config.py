import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration."""
    
    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    # JWT
    JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    JWT_ALGORITHM = "HS256"
    
    # Environment
    ENV = os.getenv("ENV", "development")
    DEBUG = ENV == "development"
    
    # Server
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 5000))
    
    # Owner
    OWNER_OPEN_ID = os.getenv("OWNER_OPEN_ID", "")

config = Config()
