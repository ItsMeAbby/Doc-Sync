import re
from typing import List, Optional, Dict, Any
import json
import asyncio
from langdetect import detect
import markdown
from bs4 import BeautifulSoup

from app.config import settings
from app.services.openai_service import create_embedding, extract_keywords, generate_summary

def build_tree(documents: List[dict]) -> List[dict]:
    """Convert flat list to nested tree structure."""
    id_to_node = {doc["id"]: {**doc, "children": []} for doc in documents}
    root_nodes = []

    for doc in documents:
        parent_id = doc.get("parent_id")
        if parent_id:
            parent = id_to_node.get(parent_id)
            if parent:
                parent["children"].append(id_to_node[doc["id"]])
        else:
            root_nodes.append(id_to_node[doc["id"]])
    
    return root_nodes

def detect_language(text: str) -> str:
    """
    Detect the language of the given text.
    Returns the language code (e.g., 'en', 'ja', etc.).
    """
    if not text or text.strip() == "":
        return "en"  # Default to English for empty text
        
    try:
        lang = detect(text)
        # Check if detected language is in our supported languages
        if lang in settings.languages_list:
            return lang
        return "en"  # Default to English if not supported
    except Exception:
        return "en"  # Default to English on detection failure


def extract_urls_from_markdown(markdown_content: str) -> List[str]:
    """
    Extract URLs from markdown content using BeautifulSoup.
    This handles both markdown links and plain URLs.
    """
    if not markdown_content:
        return []
        
    # First, extract URLs using regex for plain URLs
    url_pattern = r'https?://[^\s)"\']+'
    plain_urls = re.findall(url_pattern, markdown_content)
    
    # Then, convert markdown to HTML and extract links
    html = markdown.markdown(markdown_content)
    soup = BeautifulSoup(html, 'html.parser')
    
    # Extract all href attributes from anchor tags
    markdown_urls = [a.get('href') for a in soup.find_all('a') if a.get('href', '').startswith('http')]
    
    # Combine and remove duplicates
    all_urls = list(set(plain_urls + markdown_urls))
    return all_urls


async def process_document_content(markdown_content: str, language: Optional[str] = None) -> Dict[str, Any]:
    """
    Process document content to:
    1. Detect language if not provided
    2. Extract URLs from markdown
    3. Generate embeddings using OpenAI
    4. Extract keywords using OpenAI
    5. Generate summary using OpenAI
    """
    # Handle empty content
    if not markdown_content:
        return {
            "markdown_content": "",
            "language": language or "en",
            "keywords_array": [],
            "urls_array": [],
            "summary": "No content available",
            "embedding": [0.0] * settings.VECTOR_DIMENSION  # Zero embedding for empty content
        }
    
    # Detect language if not provided
    detected_language = language or detect_language(markdown_content)
    
    # Extract URLs
    urls = extract_urls_from_markdown(markdown_content)
    
    # Run OpenAI operations concurrently
    embedding_task = create_embedding(markdown_content)
    keywords_task = extract_keywords(markdown_content, detected_language)
    summary_task = generate_summary(markdown_content, detected_language)
    
    # Wait for all tasks to complete
    embedding, keywords, summary = await asyncio.gather(
        embedding_task, keywords_task, summary_task
    )
    if embedding is None:
        # geenerate embeing in suummary
        if summary:
            embedding = await create_embedding(summary)
        elif keywords:
            embedding = await create_embedding(" ".join(keywords))
        else:
            embedding = [0.0] * settings.VECTOR_DIMENSION
    
    return {
        "language": detected_language,
        "keywords_array": keywords,
        "urls_array": urls,
        "summary": summary,
        "embedding": embedding
    }