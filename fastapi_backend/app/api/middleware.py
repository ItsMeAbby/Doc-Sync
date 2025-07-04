import os
import openai
from app.config import settings


def setup_openai_config():
    """Initialize OpenAI client configuration"""
    openai.api_key = settings.OPENAI_API_KEY
    os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY