/**
 * API Configuration
 * Centralized configuration for all API endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Sales Orders
  SALES_ORDERS: `${API_BASE_URL}/sales_orders`,
  SALES_ORDER_BY_ID: (id: number) => `${API_BASE_URL}/sales_orders/${id}`,
  SALES_ORDER_UPDATE: (id: number) => `${API_BASE_URL}/sales_orders/${id}`,
  
  // Sales Order Details
  SALES_ORDER_DETAILS: `${API_BASE_URL}/sales_order_details`,
  SALES_ORDER_DETAIL_UPDATE: (id: number) => `${API_BASE_URL}/sales_order_details/${id}`,
  SALES_ORDER_DETAIL_DELETE: (id: number) => `${API_BASE_URL}/sales_order_details/${id}`,
  
  // Upload
  UPLOAD: `${API_BASE_URL}/upload`,
  
  // Customers
  CUSTOMERS_SEARCH: (query: string, limit: number = 20) => 
    `${API_BASE_URL}/customers/search?q=${encodeURIComponent(query)}&limit=${limit}`,
  
  // Products
  PRODUCTS_SEARCH: (query: string, limit: number = 20) => 
    `${API_BASE_URL}/products/search?q=${encodeURIComponent(query)}&limit=${limit}`,
} as const
