'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, Eye } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchDocumentsWithCache, invalidateDocumentCache } from '@/app/utils/documentCache';
import { ChangeTypeFilter, ChangeType } from '@/components/ChangeTypeFilter';
import { DocumentChangeCard } from '@/components/DocumentChangeCard';
import type { EditDocumentationResponse, DocumentEdit, GeneratedDocument, DocumentToDelete, OriginalContent, ChangeRequest, DocumentEditWithOriginal, UpdateDocumentationResponse } from '@/lib/edit-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import DocumentMentionInput from '@/components/DocumentMentionInput';

export default function DocumentationChangePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState<string>('');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentDetails, setDocumentDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingDoc, setLoadingDoc] = useState<boolean>(false);
  const [response, setResponse] = useState<EditDocumentationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ChangeType>('all');
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set());
  const [applyingChanges, setApplyingChanges] = useState(false);
  const [documentContents, setDocumentContents] = useState<Map<string, OriginalContent>>(new Map());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'selected' | 'ignore' | null>(null);

  useEffect(() => {
    const queryParam = searchParams.get('query');
    const docIdParam = searchParams.get('documentId');
    if (queryParam) {
      setQuery(queryParam);
    }
    if (docIdParam) {
      setDocumentId(docIdParam);
      fetchDocumentDetails(docIdParam);
    }
  }, [searchParams]);

  const fetchDocumentDetails = async (docId: string) => {
    try {
      setLoadingDoc(true);
      const data = await fetchDocumentsWithCache(process.env.NEXT_PUBLIC_API_BASE_URL || '');
      
      // Search for the document in all languages and categories
      let foundDoc = null;
      for (const lang in data) {
        // Search in documentation
        const searchInDocs = (docs: any[]): any => {
          for (const doc of docs) {
            if (doc.id === docId) {
              return { ...doc, language: lang };
            }
            if (doc.children) {
              const found = searchInDocs(doc.children);
              if (found) return found;
            }
          }
          return null;
        };

        foundDoc = searchInDocs(data[lang].documentation);
        if (!foundDoc) {
          foundDoc = searchInDocs(data[lang].api_references);
        }
        if (foundDoc) break;
      }

      if (foundDoc) {
        setDocumentDetails(foundDoc);
      }
    } catch (err) {
      console.error('Error fetching document details:', err);
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleViewDocument = () => {
    if (documentDetails && documentId) {
      // Store the document details in sessionStorage to select it on the documentation page
      sessionStorage.setItem('selectedDocumentId', documentId);
      sessionStorage.setItem('selectedLanguage', documentDetails.language || 'en');
      sessionStorage.setItem('selectedTab', documentDetails.is_api_ref ? 'api_references' : 'documentation');
      router.push('/documentation');
    }
  };

  const handleSubmit = async () => {
    if (!query.trim()) {
      alert('Please enter a description of the documentation changes');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResponse(null);

      const payload: any = {
        query: query.trim(),
      };
      
      if (documentId) {
        payload.document_id = documentId;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/edit/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`API request failed: ${res.status} ${res.statusText}`);
      }

      const data: EditDocumentationResponse = await res.json();
      // Simulate API response for demonstration purposes
//       const data: EditDocumentationResponse = {
//   "edit": [
//     {
//       "document_id": "a1d44224-d450-4278-861e-50878445f82b",
//       "changes": [
//         {
//           "old_string": "# Agents\n\nAgents are the core building block in your apps. An agent is a large language model (LLM), configured with instructions and tools.\n",
//           "new_string": "# Agents\n\n> ⚠️ **Important:** Using agents as tools (via `as_tool`) is deprecated and no longer supported. Agents may only be coordinated or invoked using handoff.\n\nAgents are the core building block in your apps. An agent is a large language model (LLM), configured with instructions and tools.\n"
//         },
//         {
//           "old_string": "- `tools`: Tools that the agent can use to achieve its tasks.\n\n```md-code__content\nfrom agents import Agent, ModelSettings, function_tool\n\n@function_tool\ndef get_weather(city: str) -> str:\n    return f\"The weather in {city} is sunny\"\n\nagent = Agent(\n    name=\"Haiku agent\",\n    instructions=\"Always respond in haiku form\",\n    model=\"o3-mini\",\n    tools=[get_weather],\n)\n\n```\n",
//           "new_string": "- `tools`: Tools that the agent can use to achieve its tasks.\n\n**Note:** Agents can no longer be used as tools via `as_tool`. To invoke other agents, you must use the handoff mechanism.\n\n```md-code__content\nfrom agents import Agent, ModelSettings, function_tool\n\n@function_tool\ndef get_weather(city: str) -> str:\n    return f\"The weather in {city} is sunny\"\n\nagent = Agent(\n    name=\"Haiku agent\",\n    instructions=\"Always respond in haiku form\",\n    model=\"o3-mini\",\n    tools=[get_weather],\n)\n\n```\n"
//         },
//         {
//           "old_string": "## Handoffs\n\nHandoffs are sub-agents that the agent can delegate to. You provide a list of handoffs, and the agent can choose to delegate to them if relevant. This is a powerful pattern that allows orchestrating modular, specialized agents that excel at a single task. Read more in the [handoffs](https://openai.github.io/openai-agents-python/handoffs/) documentation.\n\n```md-code__content\nfrom agents import Agent\n\nbooking_agent = Agent(...)\nrefund_agent = Agent(...)\n\ntriage_agent = Agent(\n    name=\"Triage agent\",\n    instructions=(\n        \"Help the user with their questions.\"\n        \"If they ask about booking, handoff to the booking agent.\"\n        \"If they ask about refunds, handoff to the refund agent.\"\n    ),\n    handoffs=[booking_agent, refund_agent],\n)\n\n```\n",
//           "new_string": "## Handoffs\n\nHandoffs are sub-agents that the agent can delegate to. You provide a list of handoffs, and the agent can choose to delegate to them if relevant. This is a powerful pattern that allows orchestrating modular, specialized agents that excel at a single task. **To invoke other agents, you must use the handoff mechanism.** Read more in the [handoffs](https://openai.github.io/openai-agents-python/handoffs/) documentation.\n\n```md-code__content\nfrom agents import Agent\n\nbooking_agent = Agent(...)\nrefund_agent = Agent(...)\n\ntriage_agent = Agent(\n    name=\"Triage agent\",\n    instructions=(\n        \"Help the user with their questions.\"\n        \"If they ask about booking, handoff to the booking agent.\"\n        \"If they ask about refunds, handoff to the refund agent.\"\n    ),\n    handoffs=[booking_agent, refund_agent],\n)\n\n```\n"
//         }
//       ],
//       "version": "39c34059-97d3-488f-ab79-eca7dbd5fba4"
//     },
//     {
//       "document_id": "e76358db-8837-4715-9488-a139bf680536",
//       "changes": [
//         {
//           "old_string": "## ツールとしてのエージェント\n\n一部のワークフローでは、ハンドオフせずに中央のエージェントが複数の専門エージェントをオーケストレーションしたい場合があります。そのような場合、エージェントをツールとしてモデル化できます。\n\n```md-code__content\nfrom agents import Agent, Runner\nimport asyncio\n\nspanish_agent = Agent(\n    name=\"Spanish agent\",\n    instructions=\"You translate the user's message to Spanish\",\n)\n\nfrench_agent = Agent(\n    name=\"French agent\",\n    instructions=\"You translate the user's message to French\",\n)\n\norchestrator_agent = Agent(\n    name=\"orchestrator_agent\",\n    instructions=(\n        \"You are a translation agent. You use the tools given to you to translate.\"\n        \"If asked for multiple translations, you call the relevant tools.\"\n    ),\n    tools=[\\\n        spanish_agent.as_tool(\\\n            tool_name=\"translate_to_spanish\",\\\n            tool_description=\"Translate the user's message to Spanish\",\\\n        ),\\\n        french_agent.as_tool(\\\n            tool_name=\"translate_to_french\",\\\n            tool_description=\"Translate the user's message to French\",\\\n        ),\\\n    ],\n)\n\nasync def main():\n    result = await Runner.run(orchestrator_agent, input=\"Say 'Hello, how are you?' in Spanish.\")\n    print(result.final_output)\n\n```\n\n### ツールエージェントのカスタマイズ\n\n`agent.as_tool` 関数はエージェントを簡単にツール化するためのヘルパーです。ただし、すべての設定に対応しているわけではありません（例: `max_turns` は設定不可）。高度なユースケースでは、ツール実装内で `Runner.run` を直接使用してください。\n\n```md-code__content\n@function_tool\nasync def run_my_agent() -> str:\n  \"\"\"A tool that runs the agent with custom configs\".\n\n    agent = Agent(name=\"My agent\", instructions=\"...\")\n\n    result = await Runner.run(\n        agent,\n        input=\"...\",\n        max_turns=5,\n        run_config=...\n    )\n\n    return str(result.final_output)\n\n```\n",
//           "new_string": "## エージェントの as_tool メソッドによるツール化は廃止されました。今後は handoff による間接呼び出しのみサポートされます。\n\n以前存在していた「ツールとしてのエージェント（agent.as_tool）」に関する説明・コード例・推奨文は廃止されました。\n\n他エージェントを呼び出す場合には handoff を利用してください。\n"
//         }
//       ],
//       "version": "05514707-3bc2-4298-a4c9-129a303ae2a2"
//     },
//     {
//       "document_id": "d123c732-7f44-4cf0-aafb-13c5bb160bc6",
//       "changes": [
//         {
//           "old_string": "[Skip to content](https://openai.github.io/openai-agents-python/handoffs/#handoffs)\n\n# Handoffs\n\nHandoffs allow an agent to delegate tasks to another agent. This is particularly useful in scenarios where different agents specialize in distinct areas. For example, a customer support app might have agents that each specifically handle tasks like order status, refunds, FAQs, etc.\n",
//           "new_string": "[Skip to content](https://openai.github.io/openai-agents-python/handoffs/#handoffs)\n\n> ⚠️ **Agents can only be invoked using the handoff mechanism. The use of agents as tools (`as_tool`) is no longer supported.**\n\n# Handoffs\n\nHandoffs allow an agent to delegate tasks to another agent. This is particularly useful in scenarios where different agents specialize in distinct areas. For example, a customer support app might have agents that each specifically handle tasks like order status, refunds, FAQs, etc.\n"
//         },
//         {
//           "old_string": "Handoffs are represented as tools to the LLM. So if there's a handoff to an agent named `Refund Agent`, the tool would be called `transfer_to_refund_agent`.\n\n## Creating a handoff\n\nAll agents have a [`handoffs`](https://openai.github.io/openai-agents-python/ref/agent/#agents.agent.Agent.handoffs \"handoffs            class-attribute       instance-attribute   \") param, which can either take an `Agent` directly, or a `Handoff` object that customizes the Handoff.\n\nYou can create a handoff using the [`handoff()`](https://openai.github.io/openai-agents-python/ref/handoffs/#agents.handoffs.handoff \"handoff\") function provided by the Agents SDK. This function allows you to specify the agent to hand off to, along with optional overrides and input filters.\n\n### Basic Usage\n",
//           "new_string": "Handoffs are represented as tools to the LLM. So if there's a handoff to an agent named `Refund Agent`, the tool would be called `transfer_to_refund_agent`.\n\n**When invoking another agent, always use handoff.**\n\n## Creating a handoff\n\nAll agents have a [`handoffs`](https://openai.github.io/openai-agents-python/ref/agent/#agents.agent.Agent.handoffs \"handoffs            class-attribute       instance-attribute   \") param, which can either take an `Agent` directly, or a `Handoff` object that customizes the Handoff.\n\nYou can create a handoff using the [`handoff()`](https://openai.github.io/openai-agents-python/ref/handoffs/#agents.handoffs.handoff \"handoff\") function provided by the Agents SDK. This function allows you to specify the agent to hand off to, along with optional overrides and input filters.\n\n### Basic Usage\n"
//         },
//         {
//           "old_string": "from agents import Agent, handoff\n\nbilling_agent = Agent(name=\"Billing agent\")\nrefund_agent = Agent(name=\"Refund agent\")\n\ntriage_agent = Agent(name=\"Triage agent\", handoffs=[billing_agent, handoff(refund_agent)])\n\n```\n\n### Customizing handoffs via the `handoff()` function\n",
//           "new_string": "from agents import Agent, handoff\n\nbilling_agent = Agent(name=\"Billing agent\")\nrefund_agent = Agent(name=\"Refund agent\")\n\n# When invoking another agent, always use handoff.\ntriage_agent = Agent(name=\"Triage agent\", handoffs=[billing_agent, handoff(refund_agent)])\n\n```\n\n### Customizing handoffs via the `handoff()` function\n"
//         },
//         {
//           "old_string": "from agents import Agent, handoff, RunContextWrapper\n\ndef on_handoff(ctx: RunContextWrapper[None]):\n    print(\"Handoff called\")\n\nagent = Agent(name=\"My agent\")\n\nhandoff_obj = handoff(\n    agent=agent,\n    on_handoff=on_handoff,\n    tool_name_override=\"custom_handoff_tool\",\n    tool_description_override=\"Custom description\",\n)\n\n```\n",
//           "new_string": "from agents import Agent, handoff, RunContextWrapper\n\ndef on_handoff(ctx: RunContextWrapper[None]):\n    print(\"Handoff called\")\n\nagent = Agent(name=\"My agent\")\n\n# When invoking another agent, always use handoff.\nhandoff_obj = handoff(\n    agent=agent,\n    on_handoff=on_handoff,\n    tool_name_override=\"custom_handoff_tool\",\n    tool_description_override=\"Custom description\",\n)\n\n```\n"
//         },
//         {
//           "old_string": "from pydantic import BaseModel\n\nfrom agents import Agent, handoff, RunContextWrapper\n\nclass EscalationData(BaseModel):\n    reason: str\n\nasync def on_handoff(ctx: RunContextWrapper[None], input_data: EscalationData):\n    print(f\"Escalation agent called with reason: {input_data.reason}\")\n\nagent = Agent(name=\"Escalation agent\")\n\nhandoff_obj = handoff(\n    agent=agent,\n    on_handoff=on_handoff,\n    input_type=EscalationData,\n)\n\n```\n",
//           "new_string": "from pydantic import BaseModel\n\nfrom agents import Agent, handoff, RunContextWrapper\n\nclass EscalationData(BaseModel):\n    reason: str\n\nasync def on_handoff(ctx: RunContextWrapper[None], input_data: EscalationData):\n    print(f\"Escalation agent called with reason: {input_data.reason}\")\n\nagent = Agent(name=\"Escalation agent\")\n\n# When invoking another agent, always use handoff.\nhandoff_obj = handoff(\n    agent=agent,\n    on_handoff=on_handoff,\n    input_type=EscalationData,\n)\n\n```\n"
//         },
//         {
//           "old_string": "from agents import Agent, handoff\nfrom agents.extensions import handoff_filters\n\nagent = Agent(name=\"FAQ agent\")\n\nhandoff_obj = handoff(\n    agent=agent,\n    input_filter=handoff_filters.remove_all_tools,\n)\n\n```\n",
//           "new_string": "from agents import Agent, handoff\nfrom agents.extensions import handoff_filters\n\nagent = Agent(name=\"FAQ agent\")\n\n# When invoking another agent, always use handoff.\nhandoff_obj = handoff(\n    agent=agent,\n    input_filter=handoff_filters.remove_all_tools,\n)\n\n```\n"
//         }
//       ],
//       "version": "8e83d392-da47-49eb-8bc8-27a1130e40c7"
//     },
//     {
//       "document_id": "7d59da6f-f949-4d78-92da-9a52b55087ab",
//       "changes": [
//         {
//           "old_string": "# 複数エージェントのオーケストレーション\n\nオーケストレーションとは、アプリ内でエージェントがどのように流れるかを指します。どのエージェントが、どの順序で実行され、その後どう決定するかを制御します。エージェントをオーケストレーションする主な方法は次の 2 つです。",
//           "new_string": "# 複数エージェントのオーケストレーション\n\n⚠️ 注意: エージェント間のオーケストレーションは handoff 機構のみサポートされます。as_tool メソッドによる和訳や他 agent 直接呼び出しは非推奨・非サポートとなりました。\n\nオーケストレーションとは、アプリ内でエージェントがどのように流れるかを指します。どのエージェントが、どの順序で実行され、その後どう決定するかを制御します。エージェントをオーケストレーションする主な方法は次の 2 つです。"
//         },
//         {
//           "old_string": "## LLM によるオーケストレーション\n\nエージェントとは、 instructions、ツール、ハンドオフを備えた LLM です。オープンエンドなタスクが与えられた場合、 LLM はタスクをどのように進めるかを自律的に計画し、ツールを使ってアクションやデータ取得を行い、ハンドオフでサブエージェントへタスクを委譲できます。たとえば、リサーチエージェントには次のようなツールを装備できます。\n\n- Web 検索でオンライン情報を取得する\n- ファイル検索で独自データや接続を調べる\n- コンピュータ操作でコンピュータ上のアクションを実行する\n- コード実行でデータ分析を行う\n- 計画立案やレポート作成などに長けた専門エージェントへのハンドオフ\n\nこのパターンはタスクがオープンエンドで、 LLM の知能に頼りたい場合に最適です。重要な戦術は次のとおりです。",
//           "new_string": "## LLM によるオーケストレーション\n\n『エージェント呼び出しは必ず handoff を通して行ってください。』\n\nエージェントとは、 instructions、ツール、ハンドオフを備えた LLM です。オープンエンドなタスクが与えられた場合、 LLM はタスクをどのように進めるかを自律的に計画し、ツールを使ってアクションやデータ取得を行い、ハンドオフでサブエージェントへタスクを委譲できます。たとえば、リサーチエージェントには次のようなツールを装備できます。\n\n- Web 検索でオンライン情報を取得する\n- ファイル検索で独自データや接続を調べる\n- コンピュータ操作でコンピュータ上のアクションを実行する\n- コード実行でデータ分析を行う\n- 計画立案やレポート作成などに長けた専門エージェントへのハンドオフ\n\nこのパターンはタスクがオープンエンドで、 LLM の知能に頼りたい場合に最適です。重要な戦術は次のとおりです。"
//         }
//       ],
//       "version": "b3e641d8-feea-426d-9475-bb78c80804b9"
//     }
//   ],
//   "create": [
//     {
//       "name": "depreciated-items",
//       "path": "depreciated-items/",
//       "title": "Depreciated Items",
//       "parent_id": null,
//       "is_api_ref": false,
//       "markdown_content_en": "# Depreciated Items in OpenAI Agents SDK\n\nThis page provides a list of features and items in the OpenAI Agents SDK that have been **depreciated** (no longer recommended for use and subject to removal in future releases). Please review this page regularly to ensure your implementation is following the latest recommended practices.\n\n## as_tool Agent Usage (Depreciated)\n\nPreviously, agents could be used with the `as_tool` functionality. **This is no longer supported.**\n\n- **Deprecated Feature**: Using agents as tools via `as_tool`.\n- **Migration Path**: If you need to invoke one agent from another, you should use the `handoff` mechanism.\n\n### Example of Deprecated Pattern\n```python\n# This pattern is no longer supported\nmy_agent = get_agent(...)\nother_agent = get_agent(...)\nresult = my_agent.as_tool(other_agent)\n```\n\n### Recommended Approach\nUse `handoff` to interact between agents:\n```python\nmy_agent = get_agent(...)\nother_agent = get_agent(...)\nresult = my_agent.handoff(other_agent, ...)\n```\n\nFor more on handing off work between agents, see the [Handoffs Guide](handoffs/).\n\n---\n\n## Why Items Are Depreciated\nItems and features may be depreciated due to:\n- Improved or safer alternatives\n- Security vulnerabilities\n- Architectural changes in the SDK\n\n## What to Do If You Are Using a Depreciated Item\n- Update your code as soon as possible to use supported patterns.\n- Reach out via the SDK community or support channels for migration help.",
//       "markdown_content_ja": "# OpenAI Agents SDK における非推奨項目\n\nこのページでは、OpenAI Agents SDK で**非推奨（depreciated）**となった機能・項目の一覧をまとめています。今後のバージョンで削除される可能性があるため、最新の推奨事項に従った実装を行うよう、定期的に本ページをご確認ください。\n\n## as_tool エージェント利用（非推奨）\n\n以前はエージェントを `as_tool` 機能で利用できましたが、**現在はサポートされていません。**\n\n- **非推奨機能**: `as_tool` を使ったエージェントのツール化\n- **移行方法**: 他のエージェントを呼び出す際は `handoff` 機構を利用してください。\n\n### 非推奨パターンの例\n```python\n# このパターンはサポートされていません\nmy_agent = get_agent(...)\nother_agent = get_agent(...)\nresult = my_agent.as_tool(other_agent)\n```\n\n### 推奨される方法\nエージェント間のやり取りには `handoff` を使います：\n```python\nmy_agent = get_agent(...)\nother_agent = get_agent(...)\nresult = my_agent.handoff(other_agent, ...)\n```\n\nエージェント間のハンドオフの詳細については[ハンドオフガイド](handoffs/)をご参照ください。\n\n---\n\n## なぜ非推奨となるのか\n以下の理由などにより項目が非推奨になることがあります：\n- より良い、または安全な代替手段の登場\n- セキュリティ上の脆弱性\n- SDK のアーキテクチャ変更\n\n## 非推奨項目を利用している場合\n- できるだけ早くサポートされている方法にコードを更新してください。\n- 移行サポートが必要な場合はコミュニティやサポート窓口までご連絡ください。"
//     }
//   ],
//   "delete": [
//     {
//       "document_id": "4152bef4-1b77-4213-92bb-0f3bf94916f0",
//       "title": "Handoffs - OpenAI Agents SDK",
//       "path": "handoffs/",
//       "version": "b7eedc4e-d7f5-4565-9f7c-61e1b5e5ea08"
//     },
//     {
//       "document_id": "d3de75f1-cb21-4008-8ab5-87631f1463bd",
//       "title": "Handoffs - OpenAI Agents SDK",
//       "path": "handoffs/",
//       "version": "e48fd93c-f4d8-4192-a887-8a3996b8bff8"
//     },
//     {
//       "document_id": "1dd6408d-5d8f-4a13-b34f-08b02cbbfa3d",
//       "title": "ハンドオフ - OpenAI Agents SDK",
//       "path": "handoffs/",
//       "version": "1766cf1f-136c-46be-8b0f-f352ed829ae7"
//     },
//     {
//       "document_id": "d123c732-7f44-4cf0-aafb-13c5bb160bc6",
//       "title": "Handoffs - OpenAI Agents SDK",
//       "path": "handoffs/",
//       "version": "8e83d392-da47-49eb-8bc8-27a1130e40c7"
//     },
//     {
//       "document_id": "72935889-8865-43ff-9146-61c6959eb4cc",
//       "title": "Handoff prompt - OpenAI Agents SDK",
//       "path": "extensions/handoff_prompt/",
//       "version": "d80cffc8-1b69-4e15-beb6-acd1b6155ac1"
//     },
//     {
//       "document_id": "cf812a85-87b6-45ef-902b-0df222fea272",
//       "title": "Handoff prompt - OpenAI Agents SDK",
//       "path": "extensions/handoff_prompt/",
//       "version": "ffefe82d-8ccf-4654-b3b1-54844ce3fcd1"
//     },
//     {
//       "document_id": "75639e08-1e2a-45d3-8bb7-b6587eaa9413",
//       "title": "Handoff filters - OpenAI Agents SDK",
//       "path": "extensions/handoff_filters/",
//       "version": "596abcdc-7a6b-486f-8f25-e42de9dec90e"
//     },
//     {
//       "document_id": "11b7419e-4ff2-4f5d-bea2-9c3a6253817d",
//       "title": "Handoff filters - OpenAI Agents SDK",
//       "path": "extensions/handoff_filters/",
//       "version": "73628cd3-d344-4eb0-b24f-061aff6f8235"
//     }
//   ]
// }
      setResponse(data);
      
      // Fetch original content for edit changes
      if (data.edit && data.edit.length > 0) {
        const contentMap = new Map<string, OriginalContent>();
        for (const edit of data.edit) {
          try {
            const docRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/documents/${edit.document_id}/versions/${edit.version}`);
            if (docRes.ok) {
              const docData = await docRes.json();
              const originalContent: OriginalContent = {
                  markdown_content: docData.markdown_content,
                  language: docData.language,
                  name: docData.name,
                  title: docData.title,
                  path: docData.path
              }
              contentMap.set(edit.document_id, originalContent);
            }
          } catch (err) {
            console.error(`Failed to fetch content for document ${edit.document_id}:`, err);
          }
        }
        setDocumentContents(contentMap);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Generate stable IDs for create and delete changes
  const createChangeIds = useMemo(() => {
    if (!response?.create) return new Map<GeneratedDocument, string>();
    const ids = new Map<GeneratedDocument, string>();
    response.create.forEach((change, index) => {
      ids.set(change, `create-${index}`);
    });
    return ids;
  }, [response?.create]);

  const deleteChangeIds = useMemo(() => {
    if (!response?.delete) return new Map<DocumentToDelete, string>();
    const ids = new Map<DocumentToDelete, string>();
    response.delete.forEach((change, index) => {
      ids.set(change, `delete-${index}`);
    });
    return ids;
  }, [response?.delete]);

  // Filter changes based on active filter
  const filteredChanges = useMemo(() => {
    if (!response) return [];
    
    const allChanges: (DocumentEdit | GeneratedDocument | DocumentToDelete)[] = [];
    
    if (activeFilter === 'all' || activeFilter === 'edit') {
      if (response.edit) {
        allChanges.push(...response.edit);
      }
    }
    
    if (activeFilter === 'all' || activeFilter === 'create') {
      if (response.create) {
        allChanges.push(...response.create);
      }
    }
    
    if (activeFilter === 'all' || activeFilter === 'delete') {
      if (response.delete) {
        allChanges.push(...response.delete);
      }
    }
    
    return allChanges;
  }, [response, activeFilter]);

  // Get changes to apply based on selection
  const changesToApply = useMemo(() => {
    return filteredChanges.filter((change) => {
      const isEdit = 'changes' in change;
      const isDelete = 'document_id' in change && 'version' in change && !('changes' in change) && !('markdown_content_en' in change);
      let changeId = '';
      
      if (isEdit) {
        changeId = (change as DocumentEdit).document_id;
      } else if (isDelete) {
        changeId = deleteChangeIds.get(change as DocumentToDelete) || '';
      } else {
        changeId = createChangeIds.get(change as GeneratedDocument) || '';
      }
      
      return selectedChanges.has(changeId);
    });
  }, [filteredChanges, selectedChanges, createChangeIds, deleteChangeIds]);

  const getChangeType = (): "edit" | "create" | "delete" | "mixed" => {
    const hasEdits = changesToApply.some(c => 'changes' in c);
    const hasCreates = changesToApply.some(c => 'markdown_content_en' in c);
    const hasDeletes = changesToApply.some(c => 'document_id' in c && 'version' in c && !('changes' in c) && !('markdown_content_en' in c));
    
    const typeCount = [hasEdits, hasCreates, hasDeletes].filter(Boolean).length;
    if (typeCount > 1) return 'mixed';
    
    if (hasEdits) return 'edit';
    if (hasCreates) return 'create';
    return 'delete';
  };

  const handleSelectionChange = (changeId: string, selected: boolean) => {
    setSelectedChanges((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(changeId);
      } else {
        next.delete(changeId);
      }
      return next;
    });
  };

  const handleApply = () => {
    if (selectedChanges.size > 0) {
      setConfirmAction('selected');
      setShowConfirmDialog(true);
    }
  };

  const handleIgnore = () => {
    if (selectedChanges.size > 0) {
      setConfirmAction('ignore');
      setShowConfirmDialog(true);
    }
  };

  const handleIgnoreSelected = () => {
    // Remove selected changes from the response
    if (!response) return;
    
    const newResponse = { ...response };
    
    if (newResponse.edit) {
      newResponse.edit = newResponse.edit.filter(
        (edit: DocumentEdit) => !selectedChanges.has(edit.document_id)
      );
    }
    
    if (newResponse.create) {
      newResponse.create = newResponse.create.filter(
        (createChange: GeneratedDocument) => {
          const createId = createChangeIds.get(createChange) || '';
          return !selectedChanges.has(createId);
        }
      );
    }
    
    if (newResponse.delete) {
      newResponse.delete = newResponse.delete.filter(
        (deleteChange: DocumentToDelete) => {
          const deleteId = deleteChangeIds.get(deleteChange) || '';
          return !selectedChanges.has(deleteId);
        }
      );
    }
    
    setResponse(newResponse);
    setSelectedChanges(new Set());
  };

  const handleSelectAll = () => {
    const allIds = filteredChanges.map((change) => {
      const isEdit = 'changes' in change;
      const isDelete = 'document_id' in change && 'version' in change && !('changes' in change) && !('markdown_content_en' in change);
      
      if (isEdit) {
        return (change as DocumentEdit).document_id;
      } else if (isDelete) {
        return deleteChangeIds.get(change as DocumentToDelete) || '';
      } else {
        return createChangeIds.get(change as GeneratedDocument) || '';
      }
    }).filter(id => id !== '');
    setSelectedChanges(new Set(allIds));
  };

  const handleDeselectAll = () => {
    setSelectedChanges(new Set());
  };

  const handleApplySingle = async (change: DocumentEdit | GeneratedDocument | DocumentToDelete, type: 'edit' | 'create' | 'delete') => {
    setApplyingChanges(true);
    try {
      let changeRequest: ChangeRequest;
      
      if (type === 'edit') {
        const editChange = change as DocumentEdit;
        const originalContent = documentContents.get(editChange.document_id);
        
        const editWithOriginal: DocumentEditWithOriginal = {
          document_id: editChange.document_id,
          changes: editChange.changes,
          version: editChange.version,
          original_content: originalContent
        };
        
        changeRequest = {
          edit: [editWithOriginal],
          create: undefined,
          delete: undefined
        };
      } else if (type === 'create') {
        changeRequest = {
          edit: undefined,
          create: [change as GeneratedDocument],
          delete: undefined
        };
      } else {
        changeRequest = {
          edit: undefined,
          create: undefined,
          delete: [change as DocumentToDelete]
        };
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/edit/update_documentation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changeRequest),
      });

      if (!res.ok) {
        throw new Error(`Failed to apply change: ${res.status} ${res.statusText}`);
      }

      const result: UpdateDocumentationResponse = await res.json();
      
      if (result.failed > 0 && result.failed_items) {
        // Some items failed, preserve unrelated changes and merge failed items
        // Determine the change that was requested (single change)
        let requestedChangeId = '';
        if (type === 'edit') {
          requestedChangeId = (change as DocumentEdit).document_id;
        } else if (type === 'create') {
          requestedChangeId = createChangeIds.get(change as GeneratedDocument) || '';
        } else {
          requestedChangeId = deleteChangeIds.get(change as DocumentToDelete) || '';
        }
        
        const currentResponse = response;
        if (currentResponse) {
          const newResponse = { ...currentResponse };
          
          // Remove successfully applied change or keep failed change
          if (type === 'edit') {
            const isFailed = result.failed_items.edit?.some(failed => failed.document_id === requestedChangeId);
            if (!isFailed && newResponse.edit) {
              // Success: remove from response
              newResponse.edit = newResponse.edit.filter(edit => edit.document_id !== requestedChangeId);
            }
          } else if (type === 'create') {
            const isFailed = result.failed_items.create?.some(failed => {
              const failedId = createChangeIds.get(failed) || '';
              return failedId === requestedChangeId;
            });
            if (!isFailed && newResponse.create) {
              // Success: remove from response
              newResponse.create = newResponse.create.filter(create => {
                const createId = createChangeIds.get(create) || '';
                return createId !== requestedChangeId;
              });
            }
          } else {
            const isFailed = result.failed_items.delete?.some(failed => {
              const failedId = deleteChangeIds.get(failed) || '';
              return failedId === requestedChangeId;
            });
            if (!isFailed && newResponse.delete) {
              // Success: remove from response
              newResponse.delete = newResponse.delete.filter(deleteChange => {
                const deleteId = deleteChangeIds.get(deleteChange) || '';
                return deleteId !== requestedChangeId;
              });
            }
          }
          
          setResponse(newResponse);
        }
        
        // If some items were successful, invalidate cache
        if (result.successful > 0) {
          invalidateDocumentCache();
        }
        
        // Update document contents for failed items only
        if (result.failed_items?.edit && type === 'edit') {
          const isFailed = result.failed_items.edit.some(failed => failed.document_id === requestedChangeId);
          if (isFailed) {
            // Update document contents with fresh original content for failed item
            setDocumentContents(prev => {
              const updated = new Map(prev);
              const failedEdit = result.failed_items?.edit?.find(failed => failed.document_id === requestedChangeId);
              if (failedEdit?.original_content) {
                updated.set(requestedChangeId, failedEdit.original_content);
              }
              return updated;
            });
          } else {
            // Remove successful item from document contents
            setDocumentContents(prev => {
              const updated = new Map(prev);
              updated.delete(requestedChangeId);
              return updated;
            });
          }
        }

        // Show partial success toast
        toast({
          title: 'Partial Success',
          description: `${result.successful} successful, ${result.failed} failed. Failed items remain in the list.`,
          variant: 'destructive',
        });
      } else {
        // All successful, remove the applied change from response
        let changeId = '';
        if (type === 'edit') {
          changeId = (change as DocumentEdit).document_id;
        } else if (type === 'create') {
          changeId = createChangeIds.get(change as GeneratedDocument) || '';
        } else {
          changeId = deleteChangeIds.get(change as DocumentToDelete) || '';
        }
        if (changeId) {
          handleIgnoreSingle(changeId);
        }
        
        // Invalidate document cache since content was updated
        invalidateDocumentCache();
        
        // Show success toast
        toast({
          title: 'Success',
          description: 'Change applied successfully!',
          variant: 'success',
        });
      }
    } catch (err) {
      console.error('Failed to apply change:', err);
      toast({
        title: 'Error',
        description: 'Failed to apply change',
        variant: 'destructive',
      });
    } finally {
      setApplyingChanges(false);
    }
  };

  const handleIgnoreSingle = (changeId: string) => {
    if (!response) return;
    
    const newResponse = { ...response };
    
    if (changeId.startsWith('create-')) {
      if (newResponse.create) {
        newResponse.create = newResponse.create.filter((createChange: GeneratedDocument) => {
          const createId = createChangeIds.get(createChange) || '';
          return createId !== changeId;
        });
      }
    } else if (changeId.startsWith('delete-')) {
      if (newResponse.delete) {
        newResponse.delete = newResponse.delete.filter((deleteChange: DocumentToDelete) => {
          const deleteId = deleteChangeIds.get(deleteChange) || '';
          return deleteId !== changeId;
        });
      }
    } else {
      if (newResponse.edit) {
        newResponse.edit = newResponse.edit.filter((edit: DocumentEdit) => edit.document_id !== changeId);
      }
    }
    
    setResponse(newResponse);
    setSelectedChanges((prev) => {
      const next = new Set(prev);
      next.delete(changeId);
      return next;
    });
  };

  const handleConfirmApply = async () => {
    setShowConfirmDialog(false);
    setApplyingChanges(true);
    try {
      if (confirmAction === 'ignore') {
        // Handle ignore action - no API call needed
        await new Promise(resolve => setTimeout(resolve, 100));
        handleIgnoreSelected();
        toast({
          title: 'Changes Ignored',
          description: `Successfully ignored ${selectedChanges.size} change${selectedChanges.size !== 1 ? 's' : ''}`,
          variant: 'default',
        });
      } else {
        // Handle apply action - call update_documentation endpoint
        const editsToApply = changesToApply.filter(c => 'changes' in c) as DocumentEdit[];
        const createstoApply = changesToApply.filter(c => 'markdown_content_en' in c) as GeneratedDocument[];
        const deletesToApply = changesToApply.filter(c => 'document_id' in c && 'version' in c && !('changes' in c) && !('markdown_content_en' in c)) as DocumentToDelete[];
        
        // Convert DocumentEdit to DocumentEditWithOriginal
        const editsWithOriginal: DocumentEditWithOriginal[] = editsToApply.map(edit => ({
          document_id: edit.document_id,
          changes: edit.changes,
          version: edit.version,
          original_content: documentContents.get(edit.document_id)
        }));
        
        const changeRequest: ChangeRequest = {
          edit: editsWithOriginal.length > 0 ? editsWithOriginal : undefined,
          create: createstoApply.length > 0 ? createstoApply : undefined,
          delete: deletesToApply.length > 0 ? deletesToApply : undefined
        };

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/edit/update_documentation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(changeRequest),
        });

        if (!res.ok) {
          throw new Error(`Failed to apply changes: ${res.status} ${res.statusText}`);
        }

        const result: UpdateDocumentationResponse = await res.json();
        
        if (result.failed > 0 && result.failed_items) {
          // Some items failed, preserve unrelated changes and merge failed items
          const currentResponse = response;
          if (currentResponse) {
            const newResponse = { ...currentResponse };
            
            // Get IDs of changes that were part of this request
            const requestedEditIds = new Set(
              editsToApply.map(edit => edit.document_id)
            );
            const requestedCreateIds = new Set(
              createstoApply.map(create => createChangeIds.get(create) || '')
            );
            const requestedDeleteIds = new Set(
              deletesToApply.map(deleteChange => deleteChangeIds.get(deleteChange) || '')
            );
            
            // Remove successfully applied edits (requested but not in failed_items)
            if (newResponse.edit) {
              newResponse.edit = newResponse.edit.filter(edit => {
                const wasRequested = requestedEditIds.has(edit.document_id);
                const isFailed = result.failed_items?.edit?.some(failed => failed.document_id === edit.document_id);
                return !wasRequested || isFailed; // Keep if not requested OR if failed
              });
            }
            
            // Remove successfully applied creates (requested but not in failed_items)
            if (newResponse.create) {
              newResponse.create = newResponse.create.filter(create => {
                const createId = createChangeIds.get(create) || '';
                const wasRequested = requestedCreateIds.has(createId);
                const isFailed = result.failed_items?.create?.some(failed => {
                  const failedId = createChangeIds.get(failed) || '';
                  return failedId === createId;
                });
                return !wasRequested || isFailed; // Keep if not requested OR if failed
              });
            }
            
            // Remove successfully applied deletes (requested but not in failed_items)
            if (newResponse.delete) {
              newResponse.delete = newResponse.delete.filter(deleteChange => {
                const deleteId = deleteChangeIds.get(deleteChange) || '';
                const wasRequested = requestedDeleteIds.has(deleteId);
                const isFailed = result.failed_items?.delete?.some(failed => {
                  const failedId = deleteChangeIds.get(failed) || '';
                  return failedId === deleteId;
                });
                return !wasRequested || isFailed; // Keep if not requested OR if failed
              });
            }
            
            setResponse(newResponse);
          }
          
          // Update document contents - merge with existing, update failed items
          setDocumentContents(prev => {
            const updated = new Map(prev);
            
            // Remove successful items from documentContents
            editsToApply.forEach(edit => {
              const isFailed = result.failed_items?.edit?.some(failed => failed.document_id === edit.document_id);
              if (!isFailed) {
                updated.delete(edit.document_id);
              }
            });
            
            // Update failed items with fresh original content
            if (result.failed_items?.edit) {
              for (const edit of result.failed_items.edit) {
                if (edit.original_content) {
                  updated.set(edit.document_id, edit.original_content);
                }
              }
            }
            
            return updated;
          });
          
          // If some items were successful, invalidate cache
          if (result.successful > 0) {
            invalidateDocumentCache();
          }
          
          // Update selection to only remove successfully applied changes
          setSelectedChanges(prev => {
            const updated = new Set(prev);
            
            // Remove successful edits from selection
            editsToApply.forEach(edit => {
              const isFailed = result.failed_items?.edit?.some(failed => failed.document_id === edit.document_id);
              if (!isFailed) {
                updated.delete(edit.document_id);
              }
            });
            
            // Remove successful creates from selection
            createstoApply.forEach(create => {
              const createId = createChangeIds.get(create) || '';
              const isFailed = result.failed_items?.create?.some(failed => {
                const failedId = createChangeIds.get(failed) || '';
                return failedId === createId;
              });
              if (!isFailed && createId) {
                updated.delete(createId);
              }
            });
            
            // Remove successful deletes from selection
            deletesToApply.forEach(deleteChange => {
              const deleteId = deleteChangeIds.get(deleteChange) || '';
              const isFailed = result.failed_items?.delete?.some(failed => {
                const failedId = deleteChangeIds.get(failed) || '';
                return failedId === deleteId;
              });
              if (!isFailed && deleteId) {
                updated.delete(deleteId);
              }
            });
            
            return updated;
          });
          
          toast({
            title: 'Partial Success',
            description: `${result.successful} successful, ${result.failed} failed. Only failed items remain.`,
            variant: 'default',
          });
        } else {
          // All successful
          
          // Invalidate document cache since content was updated
          invalidateDocumentCache();
          
          toast({
            title: 'Success',
            description: `Successfully applied ${selectedChanges.size} change${selectedChanges.size !== 1 ? 's' : ''}!`,
            variant: 'success',
          });
          handleIgnoreSelected(); // Remove applied changes from response
        }
      }
    } catch (err) {
      console.error('Failed to process changes:', err);
      toast({
        title: 'Error',
        description: 'Failed to process changes',
        variant: 'destructive',
      });
    } finally {
      setApplyingChanges(false);
      setConfirmAction(null);
    }
  };

  const getDocumentCount = () => {
    return selectedChanges.size;
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4">
      <div className="mb-6">
        <Link href="/documentation">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Documentation
          </Button>
        </Link>
        
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Documentation Change Request</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Describe what needs to be updated in the documentation and the system will analyze the impact.
        </p>
      </div>

      <Card className="p-4 sm:p-6 mb-6">
        <h3 className="text-lg sm:text-xl font-semibold mb-4">
          Describe your documentation update
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Enter a natural language description of what changed or what needs to be updated in the documentation.
          Example: "We don't support agents as_tool anymore, other agents should only be invoked via handoff"
        </p>
        
        {documentId && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
            {loadingDoc ? (
              <div className="flex items-center space-x-2">
                <Spinner size="sm" />
                <span className="text-sm text-blue-600 dark:text-blue-400">Loading document details...</span>
              </div>
            ) : documentDetails ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Name:</strong> {documentDetails.name || 'N/A'}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Title:</strong> {documentDetails.title || 'N/A'}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Language:</strong> {documentDetails.language || 'N/A'}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Type:</strong> {documentDetails.is_api_ref ? 'API Reference' : 'Documentation'}
                  </p>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    This update request will be specifically analyzed for this document.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewDocument}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Document ID: {documentId}
              </p>
            )}
          </div>
        )}
        
        <DocumentMentionInput
          value={query}
          onChange={setQuery}
          disabled={loading}
          placeholder="Describe what changed or what needs to be updated... (Type @ to mention documents)"
          rows={4}
          className="mb-4"
        />
        
        <Button 
          onClick={handleSubmit} 
          disabled={loading || !query.trim()}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Processing...
            </>
          ) : (
            'Analyze Documentation Impact'
          )}
        </Button>
      </Card>

      {error && (
        <Card className="p-4 sm:p-6 mb-6 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Error
          </h3>
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </Card>
      )}

      {response && (
        <Card className="p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold mb-4">
            Suggested Changes
          </h3>
          
          <ChangeTypeFilter
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            editCount={response.edit?.length || 0}
            createCount={response.create?.length || 0}
            deleteCount={response.delete?.length || 0}
            selectedCount={selectedChanges.size}
            onApply={handleApply}
            onIgnore={handleIgnore}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            disabled={applyingChanges}
          />
          
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4 pt-4">
              {filteredChanges.map((change, index) => {
                const isEdit = 'changes' in change;
                const isDelete = 'document_id' in change && 'version' in change && !('changes' in change) && !('markdown_content_en' in change);
                
                let changeId = '';
                let changeType: 'edit' | 'create' | 'delete' = 'create';
                
                if (isEdit) {
                  changeId = (change as DocumentEdit).document_id;
                  changeType = 'edit';
                } else if (isDelete) {
                  changeId = deleteChangeIds.get(change as DocumentToDelete) || `delete-${index}`;
                  changeType = 'delete';
                } else {
                  changeId = createChangeIds.get(change as GeneratedDocument) || `create-${index}`;
                  changeType = 'create';
                }
                
                const originalContentDict = isEdit ? documentContents.get((change as DocumentEdit).document_id) || {
                  markdown_content: ''
                }: {
                  markdown_content: ''
                };
                
                return (
                  <DocumentChangeCard
                    key={changeId}
                    change={change}
                    type={changeType}
                    isSelected={selectedChanges.has(changeId)}
                    onSelectionChange={(selected) => handleSelectionChange(changeId, selected)}
                    onApply={() => handleApplySingle(change, changeType)}
                    onIgnore={() => handleIgnoreSingle(changeId)}
                    originalContent={originalContentDict}
                    disabled={applyingChanges}
                  />
                );
              })
            }
              
              {filteredChanges.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No changes found for the selected filter.
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      )}

      <AlertDialog open={showConfirmDialog} onOpenChange={(open) => {
        setShowConfirmDialog(open);
        if (!open) {
          setConfirmAction(null);
          setTimeout(() => (document.body.style.pointerEvents = ""), 100);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will {confirmAction === 'ignore' ? 'ignore' : 'apply'} {getDocumentCount()} change{getDocumentCount() !== 1 ? 's' : ''}. 
              {confirmAction === 'ignore' 
                ? 'The selected changes will be removed from the list and cannot be recovered.' 
                : 'The selected changes will be applied to the documents. This action cannot be undone.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmApply}
              disabled={applyingChanges}
              className={confirmAction === 'ignore' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {applyingChanges ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  {confirmAction === 'ignore' ? 'Ignoring' : 'Applying'} changes...
                </>
              ) : (
                `${confirmAction === 'ignore' ? 'Ignore' : 'Apply'} Selected Changes`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}