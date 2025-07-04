import pytest
import json
import os
from unittest.mock import patch
from pydantic import ValidationError
from app.config import Settings


class TestSettings:
    """Test the Settings configuration class"""
    
    def test_default_values(self):
        """Test default configuration values"""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_KEY": "test-key",
            "OPENAI_API_KEY": "test-openai-key",
            "CORS_ORIGINS": '["http://localhost:3000"]'
        }, clear=True):
            settings = Settings()
            
            assert settings.OPENAPI_URL == "/openapi.json"
            assert settings.FRONTEND_URL == "http://localhost:3000"
            assert settings.OPENAI_MODEL == "gpt-4.1"
            assert settings.OPENAI_EMBEDDING_MODEL == "text-embedding-3-large"
            assert settings.VECTOR_DIMENSION == 1536
            # The .env file sets LANGUAGES=["en", "ja"]
            assert settings.LANGUAGES == ["en", "ja"]
    
    def test_required_fields_supabase(self):
        """Test that required Supabase fields are validated"""
        with patch.dict(os.environ, {
            "OPENAI_API_KEY": "test-openai-key",
            "CORS_ORIGINS": '["http://localhost:3000"]'
        }, clear=True):
            # Temporarily patch the model_config to disable .env file loading
            original_config = Settings.model_config
            new_config = original_config.copy()
            new_config['env_file'] = None
            Settings.model_config = new_config
            try:
                with pytest.raises(ValidationError):  # Should raise validation error
                    Settings()
            finally:
                # Restore original config
                Settings.model_config = original_config
    
    def test_required_fields_openai(self):
        """Test that required OpenAI fields are validated"""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_KEY": "test-key",
            "CORS_ORIGINS": '["http://localhost:3000"]'
        }, clear=True):
            # Temporarily patch the model_config to disable .env file loading
            original_config = Settings.model_config
            new_config = original_config.copy()
            new_config['env_file'] = None
            Settings.model_config = new_config
            try:
                with pytest.raises(ValidationError):  # Should raise validation error
                    Settings()
            finally:
                # Restore original config
                Settings.model_config = original_config
    
    def test_cors_origins_from_env(self):
        """Test CORS origins configuration from environment"""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_KEY": "test-key",
            "OPENAI_API_KEY": "test-openai-key",
            "CORS_ORIGINS": '["http://localhost:3000", "https://example.com"]'
        }, clear=True):
            settings = Settings()
            
            assert "http://localhost:3000" in settings.CORS_ORIGINS
            assert "https://example.com" in settings.CORS_ORIGINS
    
    def test_custom_values_from_env(self):
        """Test custom configuration values from environment"""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://custom.supabase.co",
            "SUPABASE_KEY": "custom-key",
            "OPENAI_API_KEY": "custom-openai-key",
            "CORS_ORIGINS": '["https://custom.com"]',
            "FRONTEND_URL": "https://custom-frontend.com",
            "OPENAI_MODEL": "gpt-3.5-turbo",
            "OPENAI_EMBEDDING_MODEL": "text-embedding-ada-002",
            "VECTOR_DIMENSION": "512"
        }, clear=True):
            settings = Settings()
            
            assert settings.SUPABASE_URL == "https://custom.supabase.co"
            assert settings.SUPABASE_KEY == "custom-key"
            assert settings.OPENAI_API_KEY == "custom-openai-key"
            assert settings.FRONTEND_URL == "https://custom-frontend.com"
            assert settings.OPENAI_MODEL == "gpt-3.5-turbo"
            assert settings.OPENAI_EMBEDDING_MODEL == "text-embedding-ada-002"
            assert settings.VECTOR_DIMENSION == 512
    
    def test_languages_list_property_with_string(self):
        """Test languages_list property with JSON string"""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_KEY": "test-key",
            "OPENAI_API_KEY": "test-openai-key",
            "CORS_ORIGINS": '["http://localhost:3000"]',
            "LANGUAGES": '["en", "es", "fr"]'
        }, clear=True):
            settings = Settings()
            
            assert settings.languages_list == ["en", "es", "fr"]
    
    def test_languages_list_property_with_list(self):
        """Test languages_list property with list object"""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_KEY": "test-key",
            "OPENAI_API_KEY": "test-openai-key",
            "CORS_ORIGINS": '["http://localhost:3000"]'
        }, clear=True):
            settings = Settings()
            settings.LANGUAGES = ["de", "it"]  # Set as list directly
            
            assert settings.languages_list == ["de", "it"]
    
    def test_languages_list_property_invalid_json(self):
        """Test languages_list property with invalid JSON"""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_KEY": "test-key",
            "OPENAI_API_KEY": "test-openai-key",
            "CORS_ORIGINS": '["http://localhost:3000"]',
            "LANGUAGES": "invalid-json-string"
        }, clear=True):
            settings = Settings()
            
            # Should default to ["en"] when JSON parsing fails
            assert settings.LANGUAGES == ["en"]
            assert settings.languages_list == ["en"]
    
    def test_languages_list_property_empty_string(self):
        """Test languages_list property with empty string"""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_KEY": "test-key",
            "OPENAI_API_KEY": "test-openai-key",
            "CORS_ORIGINS": '["http://localhost:3000"]',
            "LANGUAGES": ""
        }, clear=True):
            settings = Settings()
            
            # Should default to ["en"] when JSON parsing fails
            assert settings.LANGUAGES == ["en"]
            assert settings.languages_list == ["en"]
    
    def test_openai_api_key_environment_variable_set(self):
        """Test that OPENAI_API_KEY is set in environment"""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_KEY": "test-key",
            "OPENAI_API_KEY": "test-api-key",
            "CORS_ORIGINS": '["http://localhost:3000"]'
        }, clear=True):
            settings = Settings()
            
            # After creating settings, the environment variable should be set
            assert os.environ.get("OPENAI_API_KEY") == "test-api-key"
            assert settings.OPENAI_API_KEY == "test-api-key"
    
    def test_settings_extra_ignore(self):
        """Test that extra environment variables are ignored"""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_KEY": "test-key",
            "OPENAI_API_KEY": "test-openai-key",
            "CORS_ORIGINS": '["http://localhost:3000"]',
            "SOME_RANDOM_VAR": "should-be-ignored"
        }, clear=True):
            settings = Settings()
            
            # Should not have the extra variable
            assert not hasattr(settings, "SOME_RANDOM_VAR")
