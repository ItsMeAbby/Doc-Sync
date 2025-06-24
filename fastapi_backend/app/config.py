from typing import Set, List
import json

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # OpenAPI docs
    OPENAPI_URL: str = "/openapi.json"

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    # CORS
    CORS_ORIGINS: Set[str]

    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    
    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4.1"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-large"
    
    # DocSync settings
    VECTOR_DIMENSION: int = 1536
    LANGUAGES: List[str] = ["en"]
    
    @property
    def languages_list(self) -> List[str]:
        """Parse the LANGUAGES environment variable as a JSON list."""
        if isinstance(self.LANGUAGES, str):
            try:
                return json.loads(self.LANGUAGES)
            except json.JSONDecodeError:
                return ["en"]  # Default to English if there's a parsing error
        return self.LANGUAGES

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()