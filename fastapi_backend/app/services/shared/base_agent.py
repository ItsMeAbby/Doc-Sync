import os
import sys
import logging
from typing import Type, TypeVar, Optional, List, Any
from pydantic import BaseModel
from agents import Agent, Runner, set_default_openai_key, set_tracing_disabled, trace
from app.config import settings

# Add the project root to the path for proper imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

T = TypeVar("T", bound=BaseModel)

logger = logging.getLogger(__name__)


class BaseAgentConfig:
    """Base configuration for all agents"""

    def __init__(self):
        # Set up OpenAI configuration
        set_default_openai_key(settings.OPENAI_API_KEY)
        set_tracing_disabled(True)  # Disable tracing for production

    @staticmethod
    def get_model() -> str:
        """Get the configured OpenAI model"""
        return settings.OPENAI_MODEL


class BaseAgent:
    """Base class for all AI agents with common functionality"""

    def __init__(
        self,
        name: str,
        instructions: str,
        output_type: Type[T],
        tools: Optional[List[Any]] = None,
    ):
        self.config = BaseAgentConfig()
        self.name = name
        self.instructions = instructions
        self.output_type = output_type
        self.tools = tools or []

        # Create the agent instance
        self.agent = Agent(
            name=self.name,
            instructions=self.instructions,
            model=self.config.get_model(),
            output_type=self.output_type,
            tools=self.tools,
        )

        logger.info(f"Initialized agent: {self.name}")

    async def run(self, query: str, context: Optional[dict] = None) -> T:
        """Run the agent with the given query and optional context"""
        try:
            with trace(self.name):
                runner = Runner(self.agent)
                result = runner.run(query)
                logger.info(f"Agent {self.name} completed successfully")
                return result
        except Exception as e:
            logger.error(f"Error running agent {self.name}: {str(e)}")
            raise

    def get_agent(self) -> Agent:
        """Get the underlying agent instance"""
        return self.agent


class AgentFactory:
    """Factory for creating agents with common configuration"""

    @staticmethod
    def create_agent(
        name: str,
        instructions: str,
        output_type: Type[T],
        tools: Optional[List[Any]] = None,
    ) -> BaseAgent:
        """Create a new agent with standard configuration"""
        return BaseAgent(name, instructions, output_type, tools)

    @staticmethod
    def create_runner(agent: BaseAgent) -> Runner:
        """Create a runner for the given agent"""
        return Runner(agent.get_agent())


class AgentError(Exception):
    """Base exception for agent-related errors"""

    pass


class AgentTimeoutError(AgentError):
    """Raised when an agent operation times out"""

    pass


class AgentValidationError(AgentError):
    """Raised when agent input/output validation fails"""

    pass
