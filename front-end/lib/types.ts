/**
 * API Type Definitions
 * 
 * This file contains all TypeScript interface types used for API requests and responses.
 * Types are organized by endpoint for easy reference.
 */

// ============================================================================
// UPLOAD ENDPOINT (/upload)
// ============================================================================

/**
 * Response from POST /upload
 * Extracted invoice data from document upload
 */
export interface ExtractedData {
  header: ExtractedHeader
  line_items: ExtractedLineItem[]
  extracted_customer_name?: string | null
  customer: Customer | null
  customer_detail: IndividualCustomer | StoreCustomer | null
}

/**
 * Header data extracted from invoice (used in upload response)
 */
export interface ExtractedHeader {
  SalesOrderNumber: string | null
  OrderDate: string | null
  DueDate: string | null
  ShipDate: string | null
  Status: number | null
  OnlineOrderFlag: boolean | null
  PurchaseOrderNumber: string | null
  AccountNumber: string | null
  SalesPersonID: number | null
  BillToAddressID: number | null
  ShipToAddressID: number | null
  ShipMethodID: number | null
  CreditCardID: number | null
  CreditCardApprovalCode: string | null
  CurrencyRateID: number | null
  SubTotal: number | null
  TaxAmt: number | null
  Freight: number | null
  TotalDue: number | null
}

/**
 * Line item data extracted from invoice (used in upload response)
 */
export interface ExtractedLineItem {
  OrderQty: number | null
  ProductID: number | null
  ProductDescription: string | null
  SpecialOfferID: number | null
  UnitPrice: number | null
  UnitPriceDiscount: number | null
  LineTotal: number | null
  CarrierTrackingNumber: string | null
  product: Product | null
  SalesOrderDetailID?: number | null // Optional: used when editing existing orders
}

// ============================================================================
// SALES ORDERS ENDPOINTS (/sales_orders)
// ============================================================================

/**
 * Sales Order Header
 * Used in GET /sales_orders, POST /sales_orders, PUT /sales_orders/:id, GET /sales_orders/:id
 */
export interface SalesOrderHeader {
  SalesOrderID: number
  RevisionNumber: number | null
  OrderDate: string | null
  DueDate: string | null
  ShipDate: string | null
  Status: number | null
  OnlineOrderFlag: boolean | null
  SalesOrderNumber: string | null
  PurchaseOrderNumber: string | null
  AccountNumber: string | null
  CustomerID: number
  SalesPersonID: number | null
  TerritoryID: number
  BillToAddressID: number | null
  ShipToAddressID: number | null
  ShipMethodID: number | null
  CreditCardID: number | null
  CreditCardApprovalCode: string | null
  CurrencyRateID: number | null
  SubTotal: number | null
  TaxAmt: number | null
  Freight: number | null
  TotalDue: number | null
}

/**
 * Request body for POST /sales_orders
 * CustomerID and TerritoryID are required
 */
export interface CreateSalesOrderRequest {
  SalesOrderID?: number
  RevisionNumber?: number | null
  OrderDate?: string | null
  DueDate?: string | null
  ShipDate?: string | null
  Status?: number | null
  OnlineOrderFlag?: boolean | null
  SalesOrderNumber?: string | null
  PurchaseOrderNumber?: string | null
  AccountNumber?: string | null
  CustomerID: number
  SalesPersonID?: number | null
  TerritoryID: number
  BillToAddressID?: number | null
  ShipToAddressID?: number | null
  ShipMethodID?: number | null
  CreditCardID?: number | null
  CreditCardApprovalCode?: string | null
  CurrencyRateID?: number | null
  SubTotal?: number | null
  TaxAmt?: number | null
  Freight?: number | null
  TotalDue?: number | null
}

/**
 * Request body for PUT /sales_orders/:id
 * SalesOrderID cannot be updated
 */
export interface UpdateSalesOrderRequest {
  RevisionNumber?: number | null
  OrderDate?: string | null
  DueDate?: string | null
  ShipDate?: string | null
  Status?: number | null
  OnlineOrderFlag?: boolean | null
  SalesOrderNumber?: string | null
  PurchaseOrderNumber?: string | null
  AccountNumber?: string | null
  CustomerID?: number
  SalesPersonID?: number | null
  TerritoryID?: number
  BillToAddressID?: number | null
  ShipToAddressID?: number | null
  ShipMethodID?: number | null
  CreditCardID?: number | null
  CreditCardApprovalCode?: string | null
  CurrencyRateID?: number | null
  SubTotal?: number | null
  TaxAmt?: number | null
  Freight?: number | null
  TotalDue?: number | null
}

/**
 * Response from GET /sales_orders (paginated)
 */
export interface SalesOrdersListResponse {
  data: SalesOrderHeader[]
  pagination: PaginationMetadata
}

/**
 * Pagination metadata
 */
export interface PaginationMetadata {
  page: number
  per_page: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

/**
 * Query parameters for GET /sales_orders
 */
export interface SalesOrdersQueryParams {
  page?: number
  per_page?: number
  sort_by?: string
  order?: "asc" | "desc"
}

/**
 * Sales Order with Details
 * Response from GET /sales_orders/:id
 */
export interface SalesOrderWithDetails extends SalesOrderHeader {
  OrderDetails: SalesOrderDetail[]
}

// ============================================================================
// SALES ORDER DETAILS ENDPOINTS (/sales_order_details)
// ============================================================================

/**
 * Sales Order Detail (Line Item)
 * Used in GET /sales_order_details, POST /sales_order_details, PUT /sales_order_details/:id, GET /sales_order_details/:id
 * Note: The API returns "Product" (capital P) in the response
 */
export interface SalesOrderDetail {
  SalesOrderID: number
  SalesOrderDetailID: number
  CarrierTrackingNumber: string | null
  OrderQty: number | null
  ProductID: number
  SpecialOfferID: number | null
  UnitPrice: number | null
  UnitPriceDiscount: number | null
  LineTotal: number | null
  Product?: Product | null  // Capital P as returned by API
}

/**
 * Request body for POST /sales_order_details
 * SalesOrderID and ProductID are required
 */
export interface CreateSalesOrderDetailRequest {
  SalesOrderDetailID?: number
  SalesOrderID: number
  ProductID: number
  CarrierTrackingNumber?: string | null
  OrderQty?: number | null
  SpecialOfferID?: number | null
  UnitPrice?: number | null
  UnitPriceDiscount?: number | null
  LineTotal?: number | null
}

/**
 * Request body for PUT /sales_order_details/:id
 * SalesOrderDetailID cannot be updated
 */
export interface UpdateSalesOrderDetailRequest {
  CarrierTrackingNumber?: string | null
  OrderQty?: number | null
  ProductID?: number
  SpecialOfferID?: number | null
  UnitPrice?: number | null
  UnitPriceDiscount?: number | null
  LineTotal?: number | null
}

/**
 * Response from GET /sales_order_details
 */
export type SalesOrderDetailsListResponse = SalesOrderDetail[]

// ============================================================================
// CUSTOMERS ENDPOINTS (/customers/search)
// ============================================================================

/**
 * Customer
 * Used in GET /customers/search
 */
export interface Customer {
  CustomerID: number
  PersonID: number | null
  StoreID: number | null
  TerritoryID: number
  AccountNumber: string | null
}

/**
 * Individual Customer Detail
 * Used in customer search results
 */
export interface IndividualCustomer {
  BusinessEntityID: number
  FirstName: string | null
  MiddleName: string | null
  LastName: string | null
  AddressType: string | null
  AddressLine1: string | null
  AddressLine2: string | null
  City: string | null
  StateProvinceName: string | null
  PostalCode: string | null
  CountryRegionName: string | null
}

/**
 * Store Customer Detail
 * Used in customer search results
 */
export interface StoreCustomer {
  BusinessEntityID: number
  Name: string | null
  AddressType: string | null
  AddressLine1: string | null
  AddressLine2: string | null
  City: string | null
  StateProvinceName: string | null
  PostalCode: string | null
  CountryRegionName: string | null
}

/**
 * Customer with detail information
 * Response from GET /customers/search
 */
export interface CustomerWithDetail extends Customer {
  customer_detail: IndividualCustomer | StoreCustomer
}

/**
 * Query parameters for GET /customers/search
 */
export interface CustomersSearchQueryParams {
  q: string
  limit?: number
}

/**
 * Response from GET /customers/search
 */
export type CustomersSearchResponse = CustomerWithDetail[]

// ============================================================================
// PRODUCTS ENDPOINTS (/products/search)
// ============================================================================

/**
 * Product
 * Used in GET /products/search and embedded in SalesOrderDetail responses
 */
export interface Product {
  ProductID: number
  Name: string | null
  ProductNumber: string | null
  MakeFlag: boolean | null
  FinishedGoodsFlag: boolean | null
  Color: string | null
  StandardCost: number | null
  ListPrice: number | null
  Size: string | null
  ProductLine: string | null
  Class: string | null
  Style: string | null
  ProductSubcategoryID: number | null
  ProductModelID: number | null
}

/**
 * Query parameters for GET /products/search
 */
export interface ProductsSearchQueryParams {
  q: string
  limit?: number
}

/**
 * Response from GET /products/search
 */
export type ProductsSearchResponse = Product[]

// ============================================================================
// FORM DATA TYPES (Used in frontend components)
// ============================================================================

/**
 * Form data structure used in SalesOrderFormSheet
 */
export interface SalesOrderFormData {
  header: ExtractedHeader
  lineItems: ExtractedLineItem[]
  customer: Customer | null
  customerDetail: IndividualCustomer | StoreCustomer | null
}
