#!/usr/bin/env python3
"""
Test script for the create document functionality
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.editor import MainEditor

async def test_create_intent():
    """Test the create document functionality"""
    
    test_queries = [
        "Create a new guide about authentication in the agents section",
        "Add documentation for the new Tool class in the API reference",
        "Create a tutorial on how to use handoffs between agents"
    ]
    
    for query in test_queries:
        print(f"\n{'='*60}")
        print(f"Testing query: {query}")
        print('='*60)
        
        try:
            editor = MainEditor(query=query)
            result = await editor.run()
            
            print("\nResult:")
            if "create" in result:
                create_result = result["create"]
                print(f"Created documents: {len(create_result.get('created_documents', []))}")
                print(f"Failed documents: {len(create_result.get('failed_documents', []))}")
                print(f"Summary: {create_result.get('summary', 'No summary')}")
                
                for doc in create_result.get('created_documents', []):
                    print(f"\n  - Document: {doc.get('path', 'Unknown path')}")
                    print(f"    ID: {doc.get('document_id', 'Unknown ID')}")
                    print(f"    Language: {doc.get('language', 'Unknown')}")
                    print(f"    Type: {'API Reference' if doc.get('is_api_ref') else 'Documentation'}")
            else:
                print("No create intent detected or no documents created")
                
        except Exception as e:
            print(f"Error: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_create_intent())