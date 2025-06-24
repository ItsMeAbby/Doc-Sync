from typing import List, Optional
import openai
from openai.types import Embedding
from openai import AsyncOpenAI
import json
from app.config import settings

# Configure OpenAI with API key
openai.api_key = settings.OPENAI_API_KEY

openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
async def create_embedding(text: str) -> List[float]| None:
    """
    Create embeddings for the given text using OpenAI's embedding model.
    Returns a 1536-dimensional vector.
    """
    if not text or text.strip() == "":
        # Return a zero vector of the expected dimension if text is empty
        return [0.0] * settings.VECTOR_DIMENSION
    try:
        response = await openai_client.embeddings.create(
            model=settings.OPENAI_EMBEDDING_MODEL,
            input=text,
            dimensions=settings.VECTOR_DIMENSION
        )
    except:
        return None
        
    # Extract the embedding vector
    embedding: Embedding = response.data[0]
    return embedding.embedding


async def extract_keywords(text: str, language: str = "en") -> List[str]:
    """
    Extract keywords from the text using OpenAI's model.
    Returns a list of keywords.
    """
    if not text or text.strip() == "":
        return []
    
    prompt = f"""
Extract the 10 most important keywords or key phrases from the following text.
The text is a documentation of page in markdown format.
The keywords will be used to match with user queries and improve search results.
Return them as a JSON array of strings. Focus on technical terms, concepts, and names.
Do not include common words or stop words. The text is in {language} language.
    
TEXT:
{text}

KEYWORDS (JSON array only, no explanation):
    """
    
    try:
        response = await openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        result = response.choices[0].message.content
        

        try:
            keywords_data = json.loads(result)
            if "keywords" in keywords_data:
                return keywords_data["keywords"]
            else:
                # Try to find the first array in the response
                for key, value in keywords_data.items():
                    if isinstance(value, list):
                        return value
                
                # If all else fails, try to parse the entire response as an array
                if isinstance(keywords_data, list):
                    return keywords_data
                
                return []
        except json.JSONDecodeError:
            return []
            
    except Exception as e:
        print(f"Error extracting keywords with OpenAI: {str(e)}")
        return []


async def generate_summary(text: str, language: str = "en", max_length: int = 400) -> str:
    """
    Generate a summary of the text using OpenAI's model.
    Returns a summary string.
    """
    if not text or text.strip() == "":
        return "No content available"
    
    # If text is already short, just return it
    if len(text) <= max_length:
        return text
    
    prompt = f"""
    Summarize the following text in {language} language. 
    The summary should be concise (maximum {max_length} characters) and capture the main points.
    The summary should be about what the current documentation page is talking about. so that the user can understand the main topic of the page.
    
    TEXT:
    {text}
    
    SUMMARY:
    """
    
    try:
        print(f"Generating summary for text of length {len(text.split(" "))} with OpenAI... using model {settings.OPENAI_MODEL}")
        response = await openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}]
        )
        summary = response.choices[0].message.content.strip()
            
        return summary
        
    except Exception as e:
        print(f"Error generating summary with OpenAI: {str(e)}")
        # Fallback to a simple summary
        words = text.split()
        if len(words) > 30:
            return " ".join(words[:30]) + "..."
        return text
    