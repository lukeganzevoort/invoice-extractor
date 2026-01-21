"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronDown, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface SalesOrderHeader {
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

interface Product {
  ProductID: number
  Name: string | null
  ProductNumber: string | null
  Color: string | null
  Size: string | null
  StandardCost: number | null
  ListPrice: number | null
  ProductSubcategoryID: number | null
}

interface SalesOrderDetail {
  SalesOrderDetailID: number
  CarrierTrackingNumber: string | null
  OrderQty: number | null
  ProductID: number
  SpecialOfferID: number | null
  UnitPrice: number | null
  UnitPriceDiscount: number | null
  LineTotal: number | null
  Product: Product | null
}

interface SalesOrderWithDetails extends SalesOrderHeader {
  OrderDetails: SalesOrderDetail[]
}

interface ExtractedHeader {
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

interface ExtractedLineItem {
  OrderQty: number | null
  ProductID: number | null
  ProductDescription: string | null
  SpecialOfferID: number | null
  UnitPrice: number | null
  UnitPriceDiscount: number | null
  LineTotal: number | null
  CarrierTrackingNumber: string | null
  product: Product | null
}

interface Customer {
  CustomerID: number
  PersonID: number | null
  StoreID: number | null
  TerritoryID: number
  AccountNumber: string | null
}

interface IndividualCustomer {
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

interface StoreCustomer {
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

interface ExtractedData {
  header: ExtractedHeader
  line_items: ExtractedLineItem[]
  extracted_customer_name: string | null
  customer: Customer | null
  customer_detail: IndividualCustomer | StoreCustomer | null
}

export default function Dashboard() {
  const [salesOrders, setSalesOrders] = useState<SalesOrderHeader[]>([])
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set())
  const [orderDetails, setOrderDetails] = useState<
    Map<number, SalesOrderDetail[]>
  >(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [formData, setFormData] = useState<{
    header: ExtractedHeader
    lineItems: ExtractedLineItem[]
    customer: Customer | null
    customerDetail: IndividualCustomer | StoreCustomer | null
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const [customerSearchResults, setCustomerSearchResults] = useState<
    (Customer & { customer_detail: IndividualCustomer | StoreCustomer })[]
  >([])
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const customerSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [productSearchQueries, setProductSearchQueries] = useState<Map<number, string>>(new Map())
  const [productSearchResults, setProductSearchResults] = useState<Map<number, Product[]>>(new Map())
  const [productSearchLoading, setProductSearchLoading] = useState<Map<number, boolean>>(new Map())
  const [showProductDropdowns, setShowProductDropdowns] = useState<Map<number, boolean>>(new Map())
  const productSearchTimeoutRefs = useRef<Map<number, NodeJS.Timeout>>(new Map())

  useEffect(() => {
    fetchSalesOrders()
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (customerSearchTimeoutRef.current) {
        clearTimeout(customerSearchTimeoutRef.current)
      }
      productSearchTimeoutRefs.current.forEach((timeout) => {
        clearTimeout(timeout)
      })
    }
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest(".customer-search-container")) {
        setShowCustomerDropdown(false)
      }
      if (!target.closest(".product-search-container")) {
        setShowProductDropdowns(new Map())
      }
    }

    if (showCustomerDropdown || showProductDropdowns.size > 0) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [showCustomerDropdown, showProductDropdowns])

  const fetchSalesOrders = async () => {
    try {
      setLoading(true)
      // Fetch page 1 with 10 entries, ordered by OrderDate in descending order
      const params = new URLSearchParams({
        page: "1",
        per_page: "10",
        sort_by: "OrderDate",
        order: "desc",
      })
      const response = await fetch(
        `http://localhost:5000/sales_orders?${params.toString()}`
      )
      if (!response.ok) {
        throw new Error("Failed to fetch sales orders")
      }
      const result = await response.json()
      // Handle new paginated response format: { data: [...], pagination: {...} }
      setSalesOrders(result.data || result)
      if (result.pagination) {
        setCurrentPage(result.pagination.page)
        setHasNextPage(result.pagination.has_next)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (loadingMore || !hasNextPage) return

    try {
      setLoadingMore(true)
      const nextPage = currentPage + 1
      const params = new URLSearchParams({
        page: nextPage.toString(),
        per_page: "10",
        sort_by: "OrderDate",
        order: "desc",
      })
      const response = await fetch(
        `http://localhost:5000/sales_orders?${params.toString()}`
      )
      if (!response.ok) {
        throw new Error("Failed to fetch more sales orders")
      }
      const result = await response.json()
      // Append new orders to existing ones
      setSalesOrders((prev) => [...prev, ...(result.data || [])])
      if (result.pagination) {
        setCurrentPage(result.pagination.page)
        setHasNextPage(result.pagination.has_next)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoadingMore(false)
    }
  }

  const fetchOrderDetails = async (orderId: number) => {
    // If details are already loaded, don't fetch again
    if (orderDetails.has(orderId)) {
      return
    }

    try {
      const response = await fetch(
        `http://localhost:5000/sales_orders/${orderId}`
      )
      if (!response.ok) {
        throw new Error("Failed to fetch order details")
      }
      const data: SalesOrderWithDetails = await response.json()
      setOrderDetails((prev) => {
        const newMap = new Map(prev)
        newMap.set(orderId, data.OrderDetails || [])
        return newMap
      })
    } catch (err) {
      console.error("Error fetching order details:", err)
    }
  }

  const toggleOrder = async (orderId: number) => {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
      await fetchOrderDetails(orderId)
    }
    setExpandedOrders(newExpanded)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ description: "Upload failed" }))
        throw new Error(errorData.description || "Failed to upload file")
      }

      const extractedData: ExtractedData = await response.json()
      console.log(extractedData)

      // Set form data and open sheet
      const lineItems = (extractedData.line_items || []).map((item) => ({
        ...item,
        product: item.product || null,
      }))
      setFormData({
        header: extractedData.header,
        lineItems,
        customer: extractedData.customer || null,
        customerDetail: extractedData.customer_detail || null,
      })

      // Initialize product search queries for each line item
      const newProductQueries = new Map<number, string>()
      lineItems.forEach((item, index) => {
        if (item.product) {
          newProductQueries.set(index, item.product.Name || item.product.ProductNumber || "")
        } else if (item.ProductDescription) {
          newProductQueries.set(index, item.ProductDescription)
        }
      })
      setProductSearchQueries(newProductQueries)

      // Initialize customer search query if customer is found
      if (extractedData.customer && extractedData.customer_detail) {
        if ("FirstName" in extractedData.customer_detail) {
          const name = [
            extractedData.customer_detail.FirstName,
            extractedData.customer_detail.MiddleName,
            extractedData.customer_detail.LastName,
          ]
            .filter(Boolean)
            .join(" ")
          setCustomerSearchQuery(name)
        } else {
          setCustomerSearchQuery(extractedData.customer_detail.Name || `Customer ${extractedData.customer.CustomerID}`)
        }
      }

      setSheetOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during upload")
    } finally {
      setUploading(false)
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData) return

    if (!formData.customer) {
      setError("Customer information is required")
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Extract CustomerID and TerritoryID from customer object
      const headerData = {
        ...formData.header,
        CustomerID: formData.customer.CustomerID,
        TerritoryID: formData.customer.TerritoryID,
      }

      // Create the sales order header
      const headerResponse = await fetch("http://localhost:5000/sales_orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(headerData),
      })

      if (!headerResponse.ok) {
        const errorData = await headerResponse.json().catch(() => ({ description: "Failed to create order" }))
        throw new Error(errorData.description || "Failed to create sales order")
      }

      const createdOrder: SalesOrderHeader = await headerResponse.json()

      // Create sales order details for each line item
      const detailPromises = formData.lineItems.map((item) => {
        const productId = item.product?.ProductID || item.ProductID
        if (!productId) {
          throw new Error("Product is required for all line items")
        }
        return fetch("http://localhost:5000/sales_order_details", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...item,
            SalesOrderID: createdOrder.SalesOrderID,
            ProductID: productId,
          }),
        })
      })

      const detailResponses = await Promise.all(detailPromises)
      const failedDetails = detailResponses.filter((r) => !r.ok)
      if (failedDetails.length > 0) {
        throw new Error("Failed to create some order details")
      }

      // Close sheet and refresh the orders list
      setSheetOpen(false)
      setFormData(null)
      await fetchSalesOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during submission")
    } finally {
      setSubmitting(false)
    }
  }

  const updateHeaderField = (field: keyof ExtractedHeader, value: any) => {
    if (!formData) return
    setFormData({
      ...formData,
      header: {
        ...formData.header,
        [field]: value,
      },
    })
  }

  const updateLineItem = (index: number, field: keyof ExtractedLineItem, value: any) => {
    if (!formData) return
    const updatedItems = [...formData.lineItems]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    }
    setFormData({
      ...formData,
      lineItems: updatedItems,
    })
  }

  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setCustomerSearchResults([])
      return
    }

    try {
      setCustomerSearchLoading(true)
      const response = await fetch(
        `http://localhost:5000/customers/search?q=${encodeURIComponent(query)}&limit=20`
      )
      if (!response.ok) {
        throw new Error("Failed to search customers")
      }
      const results = await response.json()
      setCustomerSearchResults(results)
    } catch (err) {
      console.error("Error searching customers:", err)
      setCustomerSearchResults([])
    } finally {
      setCustomerSearchLoading(false)
    }
  }

  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearchQuery(value)
    setShowCustomerDropdown(true)

    // Clear existing timeout
    if (customerSearchTimeoutRef.current) {
      clearTimeout(customerSearchTimeoutRef.current)
    }

    // Debounce search
    customerSearchTimeoutRef.current = setTimeout(() => {
      searchCustomers(value)
    }, 300)
  }

  const selectCustomer = (customer: Customer & { customer_detail: IndividualCustomer | StoreCustomer }) => {
    if (!formData) return
    setFormData({
      ...formData,
      customer: {
        CustomerID: customer.CustomerID,
        PersonID: customer.PersonID,
        StoreID: customer.StoreID,
        TerritoryID: customer.TerritoryID,
        AccountNumber: customer.AccountNumber,
      },
      customerDetail: customer.customer_detail,
    })
    setCustomerSearchQuery("")
    setShowCustomerDropdown(false)
    setCustomerSearchResults([])
  }

  const getCustomerDisplayName = (customer: Customer & { customer_detail: IndividualCustomer | StoreCustomer }) => {
    if ("FirstName" in customer.customer_detail) {
      return [
        customer.customer_detail.FirstName,
        customer.customer_detail.MiddleName,
        customer.customer_detail.LastName,
      ]
        .filter(Boolean)
        .join(" ")
    } else {
      return customer.customer_detail.Name || `Customer ${customer.CustomerID}`
    }
  }

  const searchProducts = async (query: string, lineItemIndex: number) => {
    if (!query.trim()) {
      setProductSearchResults((prev) => {
        const newMap = new Map(prev)
        newMap.set(lineItemIndex, [])
        return newMap
      })
      return
    }

    try {
      setProductSearchLoading((prev) => {
        const newMap = new Map(prev)
        newMap.set(lineItemIndex, true)
        return newMap
      })
      const response = await fetch(
        `http://localhost:5000/products/search?q=${encodeURIComponent(query)}&limit=20`
      )
      if (!response.ok) {
        throw new Error("Failed to search products")
      }
      const results = await response.json()
      setProductSearchResults((prev) => {
        const newMap = new Map(prev)
        newMap.set(lineItemIndex, results)
        return newMap
      })
    } catch (err) {
      console.error("Error searching products:", err)
      setProductSearchResults((prev) => {
        const newMap = new Map(prev)
        newMap.set(lineItemIndex, [])
        return newMap
      })
    } finally {
      setProductSearchLoading((prev) => {
        const newMap = new Map(prev)
        newMap.set(lineItemIndex, false)
        return newMap
      })
    }
  }

  const handleProductSearchChange = (value: string, lineItemIndex: number) => {
    setProductSearchQueries((prev) => {
      const newMap = new Map(prev)
      newMap.set(lineItemIndex, value)
      return newMap
    })
    setShowProductDropdowns((prev) => {
      const newMap = new Map(prev)
      newMap.set(lineItemIndex, true)
      return newMap
    })

    // Clear existing timeout
    const existingTimeout = productSearchTimeoutRefs.current.get(lineItemIndex)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Debounce search
    const timeout = setTimeout(() => {
      searchProducts(value, lineItemIndex)
    }, 300)
    productSearchTimeoutRefs.current.set(lineItemIndex, timeout)
  }

  const selectProduct = (product: Product, lineItemIndex: number) => {
    if (!formData) return
    const updatedItems = [...formData.lineItems]
    updatedItems[lineItemIndex] = {
      ...updatedItems[lineItemIndex],
      ProductID: product.ProductID,
      product: product,
    }
    setFormData({
      ...formData,
      lineItems: updatedItems,
    })
    setProductSearchQueries((prev) => {
      const newMap = new Map(prev)
      newMap.set(lineItemIndex, product.Name || product.ProductNumber || "")
      return newMap
    })
    setShowProductDropdowns((prev) => {
      const newMap = new Map(prev)
      newMap.set(lineItemIndex, false)
      return newMap
    })
    setProductSearchResults((prev) => {
      const newMap = new Map(prev)
      newMap.set(lineItemIndex, [])
      return newMap
    })
  }

  const getProductDisplayName = (product: Product) => {
    return product.Name || product.ProductNumber || `Product ${product.ProductID}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading sales orders...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-destructive mb-4">Error: {error}</p>
          <Button onClick={fetchSalesOrders}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sales Orders Dashboard</h1>
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <Button onClick={handleUploadClick} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Order Number</TableHead>
              <TableHead>Order Date ↓</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Customer ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salesOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No sales orders found
                </TableCell>
              </TableRow>
            ) : (
              salesOrders.map((order) => {
                const isExpanded = expandedOrders.has(order.SalesOrderID)
                const details = orderDetails.get(order.SalesOrderID) || []

                return (
                  <Fragment key={order.SalesOrderID}>
                    <TableRow>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleOrder(order.SalesOrderID)}
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""
                              }`}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.SalesOrderID}
                      </TableCell>
                      <TableCell>{order.SalesOrderNumber || "N/A"}</TableCell>
                      <TableCell>{formatDate(order.OrderDate)}</TableCell>
                      <TableCell>{formatDate(order.DueDate)}</TableCell>
                      <TableCell>{order.CustomerID}</TableCell>
                      <TableCell>{order.Status ?? "N/A"}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(order.TotalDue)}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/50 p-0">
                          <div className="p-6">
                            <h3 className="font-semibold mb-4">
                              Order Details
                            </h3>
                            {details.length === 0 ? (
                              <p className="text-muted-foreground">
                                Loading order details...
                              </p>
                            ) : (
                              <>
                                <div className="rounded-md border">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Unit Price</TableHead>
                                        <TableHead>Discount</TableHead>
                                        <TableHead className="text-right">
                                          Line Total
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {details.map((detail) => (
                                        <TableRow
                                          key={detail.SalesOrderDetailID}
                                        >
                                          <TableCell>
                                            {detail.Product?.Name ||
                                              `Product ID: ${detail.ProductID}`}
                                            {detail.Product?.ProductNumber && (
                                              <span className="text-muted-foreground text-sm ml-2">
                                                ({detail.Product.ProductNumber})
                                              </span>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {detail.OrderQty ?? "N/A"}
                                          </TableCell>
                                          <TableCell>
                                            {formatCurrency(detail.UnitPrice)}
                                          </TableCell>
                                          <TableCell>
                                            {detail.UnitPriceDiscount
                                              ? `${(
                                                detail.UnitPriceDiscount * 100
                                              ).toFixed(2)}%`
                                              : "N/A"}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {formatCurrency(detail.LineTotal)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">
                                      Subtotal:
                                    </p>
                                    <p className="font-semibold">
                                      {formatCurrency(order.SubTotal)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">
                                      Tax Amount:
                                    </p>
                                    <p className="font-semibold">
                                      {formatCurrency(order.TaxAmt)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">
                                      Freight:
                                    </p>
                                    <p className="font-semibold">
                                      {formatCurrency(order.Freight)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">
                                      Total Due:
                                    </p>
                                    <p className="font-semibold text-lg">
                                      {formatCurrency(order.TotalDue)}
                                    </p>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      {hasNextPage && (
        <div className="flex justify-center mt-4">
          <Button
            onClick={loadMore}
            disabled={loadingMore}
            variant="outline"
          >
            {loadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Review and Edit Sales Order</SheetTitle>
            <SheetDescription>
              Review the extracted data and make any necessary edits before submitting.
            </SheetDescription>
          </SheetHeader>

          {formData && (
            <form onSubmit={handleFormSubmit} className="mt-6 space-y-6 px-4">
              {/* Customer Selection */}
              <div className="space-y-4 customer-search-container">
                <h3 className="text-lg font-semibold">Customer *</h3>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by customer name or ID..."
                      value={customerSearchQuery}
                      onChange={(e) => handleCustomerSearchChange(e.target.value)}
                      onFocus={() => {
                        if (customerSearchQuery && customerSearchResults.length > 0) {
                          setShowCustomerDropdown(true)
                        }
                      }}
                      className="w-full pl-10 pr-3 py-2 border rounded-md"
                    />
                    {customerSearchLoading && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {showCustomerDropdown && customerSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                      {customerSearchResults.map((customer) => (
                        <button
                          key={customer.CustomerID}
                          type="button"
                          onClick={() => selectCustomer(customer)}
                          className="w-full text-left px-4 py-2 hover:bg-muted focus:bg-muted focus:outline-none"
                        >
                          <div className="font-medium">{getCustomerDisplayName(customer)}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {customer.CustomerID} | Territory: {customer.TerritoryID}
                            {customer.customer_detail.City && ` | ${customer.customer_detail.City}`}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {formData.customer && formData.customerDetail && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="space-y-2">
                      {"FirstName" in formData.customerDetail ? (
                        // Individual Customer
                        <div>
                          <p className="text-sm font-medium">Name</p>
                          <p className="text-sm">
                            {[
                              formData.customerDetail.FirstName,
                              formData.customerDetail.MiddleName,
                              formData.customerDetail.LastName,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          </p>
                        </div>
                      ) : (
                        // Store Customer
                        <div>
                          <p className="text-sm font-medium">Store Name</p>
                          <p className="text-sm">{formData.customerDetail.Name || "N/A"}</p>
                        </div>
                      )}
                      {formData.customerDetail.AddressLine1 && (
                        <div>
                          <p className="text-sm font-medium">Address</p>
                          <p className="text-sm">
                            {[
                              formData.customerDetail.AddressLine1,
                              formData.customerDetail.AddressLine2,
                              formData.customerDetail.City,
                              formData.customerDetail.StateProvinceName,
                              formData.customerDetail.PostalCode,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                        <div>
                          <p className="text-muted-foreground">Customer ID</p>
                          <p className="font-semibold">{formData.customer.CustomerID}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Territory ID</p>
                          <p className="font-semibold">{formData.customer.TerritoryID}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Header Fields */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Order Header</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Sales Order Number</label>
                    <input
                      type="text"
                      value={formData.header.SalesOrderNumber || ""}
                      onChange={(e) => updateHeaderField("SalesOrderNumber", e.target.value || null)}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Order Date</label>
                    <input
                      type="date"
                      value={formData.header.OrderDate ? formData.header.OrderDate.split("T")[0] : ""}
                      onChange={(e) =>
                        updateHeaderField("OrderDate", e.target.value ? `${e.target.value}T00:00:00` : null)
                      }
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Due Date</label>
                    <input
                      type="date"
                      value={formData.header.DueDate ? formData.header.DueDate.split("T")[0] : ""}
                      onChange={(e) =>
                        updateHeaderField("DueDate", e.target.value ? `${e.target.value}T00:00:00` : null)
                      }
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Subtotal</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.header.SubTotal || ""}
                      onChange={(e) =>
                        updateHeaderField("SubTotal", e.target.value ? parseFloat(e.target.value) : null)
                      }
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tax Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.header.TaxAmt || ""}
                      onChange={(e) =>
                        updateHeaderField("TaxAmt", e.target.value ? parseFloat(e.target.value) : null)
                      }
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Freight</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.header.Freight || ""}
                      onChange={(e) =>
                        updateHeaderField("Freight", e.target.value ? parseFloat(e.target.value) : null)
                      }
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Total Due</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.header.TotalDue || ""}
                      onChange={(e) =>
                        updateHeaderField("TotalDue", e.target.value ? parseFloat(e.target.value) : null)
                      }
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Line Items</h3>
                {formData.lineItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <h4 className="font-medium">Item {index + 1}</h4>

                    {/* Product Selection */}
                    <div className="space-y-2 product-search-container">
                      <label className="text-sm font-medium">Product *</label>
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="text"
                            required
                            placeholder="Search by product name, number, or ID..."
                            value={productSearchQueries.get(index) || ""}
                            onChange={(e) => handleProductSearchChange(e.target.value, index)}
                            onFocus={() => {
                              const query = productSearchQueries.get(index)
                              if (query && productSearchResults.get(index)?.length) {
                                setShowProductDropdowns((prev) => {
                                  const newMap = new Map(prev)
                                  newMap.set(index, true)
                                  return newMap
                                })
                              }
                            }}
                            className="w-full pl-10 pr-3 py-2 border rounded-md"
                          />
                          {productSearchLoading.get(index) && (
                            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                        {showProductDropdowns.get(index) && productSearchResults.get(index) && productSearchResults.get(index)!.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                            {productSearchResults.get(index)!.map((product) => (
                              <button
                                key={product.ProductID}
                                type="button"
                                onClick={() => selectProduct(product, index)}
                                className="w-full text-left px-4 py-2 hover:bg-muted focus:bg-muted focus:outline-none"
                              >
                                <div className="font-medium">{getProductDisplayName(product)}</div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {product.ProductID} | Number: {product.ProductNumber || "N/A"}
                                  {product.Color && ` | Color: ${product.Color}`}
                                  {product.Size && ` | Size: ${product.Size}`}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {item.product && (
                        <div className="border rounded-lg p-4 bg-muted/50">
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm font-medium">Product Name</p>
                              <p className="text-sm">{item.product.Name || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Product ID</p>
                                <p className="font-semibold">{item.product.ProductID}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Product Number</p>
                                <p className="font-semibold">{item.product.ProductNumber || "N/A"}</p>
                              </div>
                              {item.product.Color && (
                                <div>
                                  <p className="text-muted-foreground">Color</p>
                                  <p className="font-semibold">{item.product.Color}</p>
                                </div>
                              )}
                              {item.product.Size && (
                                <div>
                                  <p className="text-muted-foreground">Size</p>
                                  <p className="font-semibold">{item.product.Size}</p>
                                </div>
                              )}
                              {item.product.ListPrice !== null && (
                                <div>
                                  <p className="text-muted-foreground">List Price</p>
                                  <p className="font-semibold">{formatCurrency(item.product.ListPrice)}</p>
                                </div>
                              )}
                              {item.product.StandardCost !== null && (
                                <div>
                                  <p className="text-muted-foreground">Standard Cost</p>
                                  <p className="font-semibold">{formatCurrency(item.product.StandardCost)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Other Line Item Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Order Quantity</label>
                        <input
                          type="number"
                          value={item.OrderQty || ""}
                          onChange={(e) =>
                            updateLineItem(index, "OrderQty", e.target.value ? parseInt(e.target.value) : null)
                          }
                          className="w-full mt-1 px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Unit Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.UnitPrice || ""}
                          onChange={(e) =>
                            updateLineItem(index, "UnitPrice", e.target.value ? parseFloat(e.target.value) : null)
                          }
                          className="w-full mt-1 px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Line Total</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.LineTotal || ""}
                          onChange={(e) =>
                            updateLineItem(index, "LineTotal", e.target.value ? parseFloat(e.target.value) : null)
                          }
                          className="w-full mt-1 px-3 py-2 border rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <SheetFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSheetOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
