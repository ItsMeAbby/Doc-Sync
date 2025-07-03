import pytest
from unittest.mock import patch

from app.services.content_processor import (
    detect_language,
    extract_urls_from_markdown,
    process_document_content
)


class TestContentProcessor:
    def test_detect_language(self):
        """Test language detection for different languages."""
        # English text
        english_text = "This is a sample English text for testing language detection."
        assert detect_language(english_text) == "en"
        
        # Empty text should default to English
        assert detect_language("") == "en"
        assert detect_language(None) == "en"
    
    def test_extract_urls_from_markdown(self):
        """Test URL extraction from markdown content."""
        # Test with plain URLs
        text_with_plain_urls = "Check out https://example.com and http://test.org/page"
        urls = extract_urls_from_markdown(text_with_plain_urls)
        assert len(urls) == 2
        assert "https://example.com" in urls
        assert "http://test.org/page" in urls
        
        # Test with markdown links
        text_with_md_links = "Here's a [link](https://example.com/link) and another [one](https://test.com)"
        urls = extract_urls_from_markdown(text_with_md_links)
        assert len(urls) == 2
        assert "https://example.com/link" in urls
        assert "https://test.com" in urls
        
        # Test with both types
        mixed_text = "Plain URL: https://plain.com and [Markdown URL](https://markdown.org)"
        urls = extract_urls_from_markdown(mixed_text)
        assert len(urls) == 2
        assert "https://plain.com" in urls
        assert "https://markdown.org" in urls
        
        # Test with duplicate URLs
        text_with_duplicates = "URL: https://example.com and [link](https://example.com)"
        urls = extract_urls_from_markdown(text_with_duplicates)
        assert len(urls) == 1
        assert "https://example.com" in urls
        
        # Test with empty content
        assert extract_urls_from_markdown("") == []
        assert extract_urls_from_markdown(None) == []
    
    @pytest.mark.asyncio
    async def test_process_document_content_empty(self):
        """Test processing empty document content."""
        # Create mocks for OpenAI functions
        with patch('app.services.content_processor.create_embedding') as mock_embedding, \
             patch('app.services.content_processor.extract_keywords') as mock_keywords, \
             patch('app.services.content_processor.generate_summary') as mock_summary:
            
            # Set up async mocks
            mock_embedding.return_value = [0.0] * 1536
            mock_keywords.return_value = []
            mock_summary.return_value = "No content available"
            
            # Process empty content
            result = await process_document_content("")
            
            # Check that OpenAI functions were not called for empty content
            assert result["language"] == "en"
            assert result["keywords_array"] == []
            assert result["urls_array"] == []
            assert result["summary"] == "No content available"
            assert len(result["embedding"]) == 1536
            assert all(v == 0.0 for v in result["embedding"])
    
    @pytest.mark.asyncio
    async def test_process_document_content(self):
        """Test processing document content with mocked OpenAI functions."""
        # Test content
        markdown_content = """# Test Document
        
        This is a test document with a [link](https://example.com).
        
        ## Section
        
        More content here: https://test.org
        """
        
        # Create mocks for OpenAI functions
        with patch('app.services.content_processor.create_embedding') as mock_embedding, \
             patch('app.services.content_processor.extract_keywords') as mock_keywords, \
             patch('app.services.content_processor.generate_summary') as mock_summary, \
             patch('app.services.content_processor.detect_language') as mock_detect_language:
            
            # Set up mocks
            mock_embedding.return_value = [0.1] * 1536
            mock_keywords.return_value = ["test", "document", "link"]
            mock_summary.return_value = "A test document with links."
            mock_detect_language.return_value = "en"
            
            # Process content
            result = await process_document_content(markdown_content)
            
            # Check results
            assert result["language"] == "en"
            assert result["keywords_array"] == ["test", "document", "link"]
            assert len(result["urls_array"]) == 2
            assert "https://example.com" in result["urls_array"]
            assert "https://test.org" in result["urls_array"]
            assert result["summary"] == "A test document with links."
            assert len(result["embedding"]) == 1536
            
            # Verify mocks were called appropriately
            mock_embedding.assert_called_once_with(markdown_content)
            mock_keywords.assert_called_once_with(markdown_content, "en")
            mock_summary.assert_called_once_with(markdown_content, "en")