import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.editor import MainEditor
from app.models.edit_documentation import EditDocumentationResponse


class TestMainEditor:
    """Test the MainEditor class"""
    
    def test_init(self):
        """Test MainEditor initialization"""
        query = "Test query for editing documents"
        editor = MainEditor(query)
        
        assert editor.query == query
        assert editor.edit_changes == []
        assert editor.create_documents == []
        assert editor.delete_documents == []
    
    @pytest.mark.asyncio
    @patch('app.services.editor.MainEditor._detect_intent')
    async def test_run_no_intents(self, mock_detect_intent):
        """Test run method with no detected intents"""
        mock_detected_intents = MagicMock()
        mock_detected_intents.intents = []
        mock_detect_intent.return_value = mock_detected_intents
        
        editor = MainEditor("test query")
        result = await editor.run()
        
        assert isinstance(result, EditDocumentationResponse)
        assert result.edit == []
        assert result.create == []
        assert result.delete == []
        mock_detect_intent.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('app.services.editor.MainEditor._handle_edit_intent')
    @patch('app.services.editor.MainEditor._detect_intent')
    async def test_run_with_edit_intent(self, mock_detect_intent, mock_handle_edit):
        """Test run method with edit intent"""
        mock_intent = MagicMock()
        mock_intent.intent = "edit"
        mock_intent.reason = "User wants to edit content"
        
        mock_detected_intents = MagicMock()
        mock_detected_intents.intents = [mock_intent]
        mock_detect_intent.return_value = mock_detected_intents
        mock_handle_edit.return_value = None
        
        editor = MainEditor("edit some document")
        result = await editor.run()
        
        assert isinstance(result, EditDocumentationResponse)
        mock_detect_intent.assert_called_once()
        mock_handle_edit.assert_called_once_with(mock_intent)
    
    @pytest.mark.asyncio
    @patch('app.services.editor.MainEditor._handle_create_intent')
    @patch('app.services.editor.MainEditor._detect_intent')
    async def test_run_with_create_intent(self, mock_detect_intent, mock_handle_create):
        """Test run method with create intent"""
        mock_intent = MagicMock()
        mock_intent.intent = "create"
        mock_intent.reason = "User wants to create new content"
        
        mock_detected_intents = MagicMock()
        mock_detected_intents.intents = [mock_intent]
        mock_detect_intent.return_value = mock_detected_intents
        mock_handle_create.return_value = None
        
        editor = MainEditor("create new documentation")
        result = await editor.run()
        
        assert isinstance(result, EditDocumentationResponse)
        mock_detect_intent.assert_called_once()
        mock_handle_create.assert_called_once_with(mock_intent)
    
    @pytest.mark.asyncio
    @patch('app.services.editor.MainEditor._handle_delete_intent')
    @patch('app.services.editor.MainEditor._detect_intent')
    async def test_run_with_delete_intent(self, mock_detect_intent, mock_handle_delete):
        """Test run method with delete intent"""
        mock_intent = MagicMock()
        mock_intent.intent = "delete"
        mock_intent.reason = "User wants to delete content"
        
        mock_detected_intents = MagicMock()
        mock_detected_intents.intents = [mock_intent]
        mock_detect_intent.return_value = mock_detected_intents
        mock_handle_delete.return_value = None
        
        editor = MainEditor("delete the old documentation")
        result = await editor.run()
        
        assert isinstance(result, EditDocumentationResponse)
        mock_detect_intent.assert_called_once()
        mock_handle_delete.assert_called_once_with(mock_intent)
    
    @pytest.mark.asyncio
    @patch('app.services.editor.MainEditor._handle_delete_intent')
    @patch('app.services.editor.MainEditor._handle_create_intent')
    @patch('app.services.editor.MainEditor._handle_edit_intent')
    @patch('app.services.editor.MainEditor._detect_intent')
    async def test_run_with_multiple_intents(self, mock_detect_intent, mock_handle_edit, 
                                           mock_handle_create, mock_handle_delete):
        """Test run method with multiple intents"""
        mock_edit_intent = MagicMock()
        mock_edit_intent.intent = "edit"
        
        mock_create_intent = MagicMock()
        mock_create_intent.intent = "create"
        
        mock_delete_intent = MagicMock()
        mock_delete_intent.intent = "delete"
        
        mock_detected_intents = MagicMock()
        mock_detected_intents.intents = [mock_edit_intent, mock_create_intent, mock_delete_intent]
        mock_detect_intent.return_value = mock_detected_intents
        
        editor = MainEditor("edit, create and delete documentation")
        result = await editor.run()
        
        assert isinstance(result, EditDocumentationResponse)
        mock_detect_intent.assert_called_once()
        mock_handle_edit.assert_called_once_with(mock_edit_intent)
        mock_handle_create.assert_called_once_with(mock_create_intent)
        mock_handle_delete.assert_called_once_with(mock_delete_intent)
    
    @pytest.mark.asyncio
    @patch('app.services.editor.Runner.run')
    async def test_detect_intent_success(self, mock_runner):
        """Test _detect_intent method success"""
        mock_response = MagicMock()
        mock_final_output = MagicMock()
        mock_response.final_output_as.return_value = mock_final_output
        mock_runner.return_value = mock_response
        
        editor = MainEditor("test query")
        result = await editor._detect_intent()
        
        assert result == mock_final_output
        mock_runner.assert_called_once()
        mock_response.final_output_as.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('app.services.editor.Runner.run')
    async def test_get_edit_suggestions_success(self, mock_runner):
        """Test _get_edit_suggestions method success"""
        mock_intent = MagicMock()
        mock_intent.task = "edit task"
        mock_intent.reason = "edit reason"
        
        mock_response = MagicMock()
        mock_final_output = MagicMock()
        mock_response.final_output_as.return_value = mock_final_output
        mock_runner.return_value = mock_response
        
        editor = MainEditor("test query")
        result = await editor._get_edit_suggestions(mock_intent)
        
        assert result == mock_final_output
        mock_runner.assert_called_once()
        mock_response.final_output_as.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('app.services.editor.Runner.run')
    async def test_handle_delete_intent_success(self, mock_runner):
        """Test _handle_delete_intent method success"""
        mock_intent = MagicMock()
        mock_intent.task = "delete task"
        mock_intent.reason = "delete reason"
        
        mock_document_to_delete = MagicMock()
        mock_response = MagicMock()
        mock_delete_response = MagicMock()
        mock_delete_response.documents_to_delete = [mock_document_to_delete]
        mock_response.final_output_as.return_value = mock_delete_response
        mock_runner.return_value = mock_response
        
        editor = MainEditor("delete test documentation")
        await editor._handle_delete_intent(mock_intent)
        
        assert len(editor.delete_documents) == 1
        assert editor.delete_documents[0] == mock_document_to_delete
        mock_runner.assert_called_once()
        mock_response.final_output_as.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('app.services.editor.Runner.run')
    async def test_handle_create_intent_success(self, mock_runner):
        """Test _handle_create_intent method success"""
        mock_intent = MagicMock()
        mock_intent.task = "create task"
        mock_intent.reason = "create reason"
        
        mock_document = MagicMock()
        mock_response = MagicMock()
        mock_create_response = MagicMock()
        mock_create_response.documents = [mock_document]
        mock_response.final_output_as.return_value = mock_create_response
        mock_runner.return_value = mock_response
        
        editor = MainEditor("create new documentation")
        await editor._handle_create_intent(mock_intent)
        
        assert len(editor.create_documents) == 1
        assert editor.create_documents[0] == mock_document
        mock_runner.assert_called_once()
        mock_response.final_output_as.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('app.services.editor.MainEditor._process_edit_suggestions')
    @patch('app.services.editor.MainEditor._get_edit_suggestions')
    async def test_handle_edit_intent_with_suggestions(self, mock_get_suggestions, mock_process_suggestions):
        """Test _handle_edit_intent with suggestions"""
        mock_intent = MagicMock()
        mock_suggestion = MagicMock()
        mock_suggestions_response = MagicMock()
        mock_suggestions_response.suggestions = [mock_suggestion]
        mock_get_suggestions.return_value = mock_suggestions_response
        
        mock_changes = [MagicMock()]
        mock_process_suggestions.return_value = mock_changes
        
        editor = MainEditor("edit documentation")
        await editor._handle_edit_intent(mock_intent)
        
        assert len(editor.edit_changes) == 1
        mock_get_suggestions.assert_called_once_with(mock_intent)
        mock_process_suggestions.assert_called_once_with([mock_suggestion])
    
    @pytest.mark.asyncio
    @patch('app.services.editor.MainEditor._get_edit_suggestions')
    async def test_handle_edit_intent_no_suggestions(self, mock_get_suggestions):
        """Test _handle_edit_intent with no suggestions"""
        mock_intent = MagicMock()
        mock_suggestions_response = MagicMock()
        mock_suggestions_response.suggestions = []
        mock_get_suggestions.return_value = mock_suggestions_response
        
        editor = MainEditor("edit documentation")
        await editor._handle_edit_intent(mock_intent)
        
        assert len(editor.edit_changes) == 0
        mock_get_suggestions.assert_called_once_with(mock_intent)
    
    @pytest.mark.asyncio
    @patch('app.services.editor.asyncio.gather', new_callable=AsyncMock)
    @patch('app.services.editor.Runner.run')
    async def test_process_edit_suggestions_success(self, mock_runner, mock_gather):
        """Test _process_edit_suggestions method success"""
        # Create a mock suggestion with model_dump method
        mock_suggestion = MagicMock()
        mock_suggestion.model_dump.return_value = {"suggestion": "test suggestion"}
        
        # Mock the response from Runner.run
        mock_edit_response = MagicMock()
        mock_changes = [MagicMock()]
        mock_edits = MagicMock()
        mock_edits.changes = mock_changes
        mock_edit_response.final_output_as.return_value = mock_edits
        
        # Mock asyncio.gather to return the response
        mock_gather.return_value = [mock_edit_response]
        
        editor = MainEditor("test query")
        result = await editor._process_edit_suggestions([mock_suggestion])
        
        assert len(result) == 1
        assert result[0] == mock_changes[0]
        mock_gather.assert_called_once()
        mock_suggestion.model_dump.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('app.services.editor.asyncio.gather', new_callable=AsyncMock)
    @patch('app.services.editor.Runner.run')
    async def test_process_edit_suggestions_multiple(self, mock_runner, mock_gather):
        """Test _process_edit_suggestions with multiple suggestions"""
        # Create mock suggestions with model_dump method
        mock_suggestion1 = MagicMock()
        mock_suggestion1.model_dump.return_value = {"suggestion": "test suggestion 1"}
        mock_suggestion2 = MagicMock()
        mock_suggestion2.model_dump.return_value = {"suggestion": "test suggestion 2"}
        
        # Mock the responses from Runner.run
        mock_edit_response1 = MagicMock()
        mock_changes1 = [MagicMock()]
        mock_edits1 = MagicMock()
        mock_edits1.changes = mock_changes1
        mock_edit_response1.final_output_as.return_value = mock_edits1
        
        mock_edit_response2 = MagicMock()
        mock_changes2 = [MagicMock(), MagicMock()]
        mock_edits2 = MagicMock()
        mock_edits2.changes = mock_changes2
        mock_edit_response2.final_output_as.return_value = mock_edits2
        
        # Mock asyncio.gather to return both responses
        mock_gather.return_value = [mock_edit_response1, mock_edit_response2]
        
        editor = MainEditor("test query")
        result = await editor._process_edit_suggestions([mock_suggestion1, mock_suggestion2])
        
        assert len(result) == 3  # 1 from first response + 2 from second response
        mock_gather.assert_called_once()
        mock_suggestion1.model_dump.assert_called_once()
        mock_suggestion2.model_dump.assert_called_once()
