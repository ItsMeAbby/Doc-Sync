import requests
import json
import os

path=r"/Users/itsmeabby/Desktop/WorkSpace/PlunoProject/Doc-Sync/fastapi_backend/documentation_openai_sdk"

url= "http://localhost:8000/api/documents/"
"""{
    "markdown": "",
    "metadata": {
        "favicon": "https://openai.github.io/openai-agents-python/images/favicon-platform.svg",
        "title": "Quickstart - OpenAI Agents SDK",
        "viewport": "width=device-width,initial-scale=1",
        "generator": "mkdocs-1.6.1, mkdocs-material-9.6.11",
        "language": "en",
        "scrapeId": "e6b06901-38c7-43df-83e6-5cd900403260",
        "sourceURL": "https://openai.github.io/openai-agents-python/voice/quickstart/",
        "url": "https://openai.github.io/openai-agents-python/voice/quickstart/",
        "statusCode": 200,
        "contentType": "text/html; charset=utf-8",
        "proxyUsed": "basic"
    },
    "parent": "voice",
    "endpoint": "quickstart"
}"""

"""payload={
  "document": {
    "path": "string",
    "name": "string",
    "title": "string",
    "is_api_ref": false,
    "parent_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  },
  "content": {
    "markdown_content": "string",
    "language": "string",
    "keywords_array": [
      "string"
    ],
    "urls_array": [
      "string"
    ],
    "summary": "string"
  }
}"""
def get_parents(base_path:str):
    parents={}
    for file in os.listdir(base_path):
        if file.endswith(".json"):
            data= json.load(open(os.path.join(base_path, file), "r"))
            if "parent" in data and data["parent"]:
                is_api_ref= "_ref_" in file
                key= data["parent"]+str(is_api_ref)
                parents[key]={
                    "name": data["parent"],
                    "is_api_ref": is_api_ref,
                    "path": data["parent"]+"/",
                }
    return parents
                    
            

def create_parents(payload:dict):

    response = requests.post(url, json={"document": payload})
    print(response.text)
parent_ids={
    "voiceFalse": "50cf57a1-7abc-4a24-a6c3-ef15a37a0236",
    "voiceTrue": "8f0441c3-6a54-4804-bc47-ef50fe8f498c",
    "extensionsTrue": "a443ead4-3e1f-4770-a74d-ed6d4671ea3f",
    "tracingTrue": "cf4c6628-1fdb-43f5-8ef1-c210278917d4",
    "modelsFalse": "d59e03ec-3847-4f24-a89c-69bc6d58d7f1"

}

def add_content(file_path:str):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print("Processing file:", file_path)
    if "parent" not in data or not data["parent"]:
        parent_id=None
        _path=data.get("endpoint", "")+"/"
        is_api_ref = "_ref_" in file_path
    else:
        parent_name = data["parent"]
        is_api_ref = "_ref_" in file_path
        key = parent_name + str(is_api_ref)
        parent_id = parent_ids.get(key, None)
        _path=f"{parent_name}/{data.get('endpoint', '')}/"

    payload={
        "document": {
            "path": _path,
            "name": data.get("metadata", {}).get("title", "").split("-")[0].strip(),
            "title": data.get("metadata", {}).get("title", ""),
            "is_api_ref": is_api_ref,
            "parent_id": parent_id,

        },
        "content": {
            "markdown_content": data.get("markdown", ""),
            "language": data.get("metadata", {}).get("language", ""),
        }
    }
    # print("Payload to create document:", json.dumps(payload, indent=4))
    response = requests.post(url, json=payload)
    print(response.text)
if __name__ == "__main__":
    # list_of_parents=get_parents(path)
    # print("Parents found:", list_of_parents)
    # for k,v in list_of_parents.items():
    #     if k=="modelsFalse":
    #         continue
    #     create_parents(v)
    #     print(f"Created parent: {v['name']} (is_api_ref: {v['is_api_ref']})")
    for file in os.listdir(path):
        if file.endswith(".json"):
            file_path = os.path.join(path, file)
            add_content(file_path)
            import time
            time.sleep(1)  # To avoid hitting the server too fast
    print("All documents processed.")

    