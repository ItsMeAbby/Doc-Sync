/**
 * Centralized API client configuration for the frontend
 */

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  }

  /**
   * Make a GET request to the API
   */
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`GET ${endpoint} failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Make a POST request to the API
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`POST ${endpoint} failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Make a PUT request to the API
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`PUT ${endpoint} failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Make a DELETE request to the API
   */
  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`DELETE ${endpoint} failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get the base URL for the API
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();