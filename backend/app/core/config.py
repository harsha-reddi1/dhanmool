import os

class Settings:
    PROJECT_NAME: str = "DhanMool"
    PROJECT_TAGLINE: str = "Your wealth, rooted right."
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://mmeddnoitjmoegurtafe.supabase.co")
    SUPABASE_KEY: str = os.getenv(
        "SUPABASE_KEY",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZWRkbm9pdGptb2VndXJ0YWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzODY4NzEsImV4cCI6MjEwODk2Mjg3MX0.Hz3HsXEI3hfwxUbdVNECDNm-GgNG9U5emKwUrLJaG1s"
    )
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "dhanmool_secure_jwt_secret_key_2026_@root_right")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()
