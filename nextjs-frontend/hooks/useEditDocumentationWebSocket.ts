import { useCallback, useEffect, useRef, useState } from 'react';

// Event types based on backend models
export type EditProgressEventType = 
  | 'intent_detected'
  | 'suggestions_found'
  | 'document_processing'
  | 'document_completed'
  | 'document_created'
  | 'document_deleted'
  | 'error'
  | 'finished'
  | 'progress';

export interface BaseEvent {
  event_id: string;
  timestamp: string;
  session_id: string;
}

export interface EditProgressEvent extends BaseEvent {
  type: EditProgressEventType;
  payload: any;
}

export interface WebSocketMessage {
  event: EditProgressEvent;
}

export interface EditRequest {
  query: string;
  document_id?: string;
}

export interface UseEditDocumentationWebSocketOptions {
  onEvent?: (event: EditProgressEvent) => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (connected: boolean) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface UseEditDocumentationWebSocketReturn {
  isConnected: boolean;
  isProcessing: boolean;
  currentStep: number;
  totalSteps: number;
  events: EditProgressEvent[];
  error: string | null;
  startEdit: (editRequest: EditRequest) => void;
  clearEvents: () => void;
  disconnect: () => void;
  connect: () => void;
}

export function useEditDocumentationWebSocket(
  options: UseEditDocumentationWebSocketOptions = {}
): UseEditDocumentationWebSocketReturn {
  const {
    onEvent,
    onError,
    onConnectionChange,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(4);
  const [events, setEvents] = useState<EditProgressEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);

  const generateSessionId = useCallback(() => {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnectingRef.current) {
      return;
    }

    try {
      isConnectingRef.current = true;
      
      // Get WebSocket URL - use the API base URL but convert to WebSocket protocol
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const url = new URL(apiBaseUrl);
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${url.host}/ws/edit-documentation`;

      console.log('Connecting to WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        onConnectionChange?.(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          const progressEvent = message.event;

          // Update state based on event type
          switch (progressEvent.type) {
            case 'progress':
              setCurrentStep(progressEvent.payload.step || 0);
              setTotalSteps(progressEvent.payload.total_steps || 4);
              break;
            case 'error':
              setError(progressEvent.payload.message);
              setIsProcessing(false);
              break;
            case 'finished':
              setIsProcessing(false);
              setCurrentStep(totalSteps);
              break;
          }

          // Add event to list
          setEvents(prev => [...prev, progressEvent]);
          onEvent?.(progressEvent);

        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          const errorEvent: EditProgressEvent = {
            event_id: 'parse_error_' + Date.now(),
            timestamp: new Date().toISOString(),
            session_id: sessionIdRef.current || 'unknown',
            type: 'error',
            payload: {
              message: 'Failed to parse WebSocket message',
              error_type: 'ParseError'
            }
          };
          setEvents(prev => [...prev, errorEvent]);
          onEvent?.(errorEvent);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        isConnectingRef.current = false;
        onConnectionChange?.(false);

        // Try to reconnect if not manually closed and within retry limit
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (event.code !== 1000) {
          setError(`WebSocket connection failed after ${maxReconnectAttempts} attempts`);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
        const err = new Error('WebSocket connection error');
        setError(err.message);
        onError?.(err);
      };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      isConnectingRef.current = false;
      const error = err instanceof Error ? err : new Error('Failed to connect');
      setError(error.message);
      onError?.(error);
    }
  }, [onConnectionChange, onError, onEvent, maxReconnectAttempts, reconnectInterval, totalSteps]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsProcessing(false);
    isConnectingRef.current = false;
    sessionIdRef.current = null;
    reconnectAttemptsRef.current = 0;
  }, []);

  const startEdit = useCallback((editRequest: EditRequest) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError("WebSocket not connected. Please try again or disable streaming.");
      return;
    }

    try {
      // Generate new session ID for this request
      sessionIdRef.current = generateSessionId();
      
      // Clear previous events and reset state
      setEvents([]);
      setError(null);
      setIsProcessing(true);
      setCurrentStep(0);
      setTotalSteps(4);

      // Send edit request
      const message = {
        session_id: sessionIdRef.current,
        edit_request: editRequest
      };

      wsRef.current.send(JSON.stringify(message));
      console.log('Sent edit request:', message);

    } catch (err) {
      console.error('Failed to send edit request:', err);
      const error = err instanceof Error ? err : new Error('Failed to send request');
      setError(error.message);
      setIsProcessing(false);
      onError?.(error);
    }
  }, [connect, generateSessionId, onError]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setError(null);
    setCurrentStep(0);
  }, []);

  // Manual connection management - no auto-connect
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isProcessing,
    currentStep,
    totalSteps,
    events,
    error,
    startEdit,
    clearEvents,
    disconnect,
    connect
  };
}