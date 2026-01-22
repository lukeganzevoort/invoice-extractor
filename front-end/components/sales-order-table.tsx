"use client"

import { Fragment, useEffect, useImperativeHandle, forwardRef, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { API_ENDPOINTS } from "@/lib/api"
import type {
  SalesOrderHeader,
  SalesOrderDetail,
  SalesOrderWithDetails,
  CustomerWithDetail,
} from "@/lib/types"

export interface SalesOrderTableRef {
  refresh: () => Promise<void>
}

interface SalesOrderTableProps {
  onError?: (error: string | null) => void
}

export const SalesOrderTable = forwardRef<SalesOrderTableRef, SalesOrderTableProps>(
  ({ onError }, ref) => {
    const [salesOrders, setSalesOrders] = useState<SalesOrderHeader[]>([])
    const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set())
    const [orderDetails, setOrderDetails] = useState<Map<number, SalesOrderDetail[]>>(new Map())
    const [customerInfo, setCustomerInfo] = useState<Map<number, CustomerWithDetail>>(new Map())
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [hasNextPage, setHasNextPage] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)

    const fetchSalesOrders = async () => {
      try {
        setLoading(true)
        // Fetch page 1 with 10 entries, ordered by SalesOrderID in ascending order
        const params = new URLSearchParams({
          page: "1",
          per_page: "10",
          sort_by: "SalesOrderID",
          order: "desc",
        })
        const response = await fetch(
          `${API_ENDPOINTS.SALES_ORDERS}?${params.toString()}`
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
        const errorMessage = err instanceof Error ? err.message : "An error occurred"
        if (onError) {
          onError(errorMessage)
        }
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
          sort_by: "SalesOrderID",
          order: "asc",
        })
        const response = await fetch(
          `${API_ENDPOINTS.SALES_ORDERS}?${params.toString()}`
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
        const errorMessage = err instanceof Error ? err.message : "An error occurred"
        if (onError) {
          onError(errorMessage)
        }
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
        const response = await fetch(API_ENDPOINTS.SALES_ORDER_BY_ID(orderId))
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

    const fetchCustomerInfo = async (customerId: number) => {
      // If customer info is already loaded, don't fetch again
      if (customerInfo.has(customerId)) {
        return
      }

      try {
        const response = await fetch(API_ENDPOINTS.CUSTOMERS_SEARCH(customerId.toString(), 1))
        if (!response.ok) {
          throw new Error("Failed to fetch customer information")
        }
        const results: CustomerWithDetail[] = await response.json()
        if (results.length > 0) {
          setCustomerInfo((prev) => {
            const newMap = new Map(prev)
            newMap.set(customerId, results[0])
            return newMap
          })
        }
      } catch (err) {
        console.error("Error fetching customer information:", err)
      }
    }

    const toggleOrder = async (orderId: number) => {
      const newExpanded = new Set(expandedOrders)
      if (newExpanded.has(orderId)) {
        newExpanded.delete(orderId)
      } else {
        newExpanded.add(orderId)
        const order = salesOrders.find((o) => o.SalesOrderID === orderId)
        await Promise.all([
          fetchOrderDetails(orderId),
          order ? fetchCustomerInfo(order.CustomerID) : Promise.resolve(),
        ])
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

    // Expose refresh function to parent via ref
    useImperativeHandle(ref, () => ({
      refresh: fetchSalesOrders,
    }))

    useEffect(() => {
      fetchSalesOrders()
    }, [])

    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <p className="text-lg">Loading sales orders...</p>
        </div>
      )
    }

    return (
      <>
        <div className="overflow-hidden p-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b">
                <TableHead className="w-12"></TableHead>
                <TableHead className="font-semibold">Order ID ↓</TableHead>
                <TableHead className="font-semibold">Order Number</TableHead>
                <TableHead className="font-semibold">Order Date</TableHead>
                <TableHead className="font-semibold">Due Date</TableHead>
                <TableHead className="font-semibold">Customer ID</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Total Due</TableHead>
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
                  const customer = customerInfo.get(order.CustomerID)

                  return (
                    <Fragment key={order.SalesOrderID}>
                      <TableRow className={`border-b hover:bg-muted/30 transition-colors ${isExpanded ? "bg-muted/20" : ""}`}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleOrder(order.SalesOrderID)}
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{order.SalesOrderID}</TableCell>
                        <TableCell>{order.SalesOrderNumber || "N/A"}</TableCell>
                        <TableCell>{formatDate(order.OrderDate)}</TableCell>
                        <TableCell>{formatDate(order.DueDate)}</TableCell>
                        <TableCell>{order.CustomerID}</TableCell>
                        <TableCell>{order.Status ?? "N/A"}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(order.TotalDue)}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30 p-0">
                            <div className="p-6 space-y-8">
                              {/* Customer Information */}
                              <div>
                                <h3 className="font-semibold mb-4 text-foreground">Customer Information</h3>
                                {customer ? (
                                  <div className="border rounded-lg p-4 bg-background">
                                    <div className="space-y-2">
                                      {"FirstName" in customer.customer_detail ? (
                                        // Individual Customer
                                        <div>
                                          <p className="text-sm font-medium">Name</p>
                                          <p className="text-sm">
                                            {[
                                              customer.customer_detail.FirstName,
                                              customer.customer_detail.MiddleName,
                                              customer.customer_detail.LastName,
                                            ]
                                              .filter(Boolean)
                                              .join(" ")}
                                          </p>
                                        </div>
                                      ) : (
                                        // Store Customer
                                        <div>
                                          <p className="text-sm font-medium">Store Name</p>
                                          <p className="text-sm">{customer.customer_detail.Name || "N/A"}</p>
                                        </div>
                                      )}
                                      {customer.customer_detail.AddressLine1 && (
                                        <div>
                                          <p className="text-sm font-medium">Address</p>
                                          <p className="text-sm">
                                            {[
                                              customer.customer_detail.AddressLine1,
                                              customer.customer_detail.AddressLine2,
                                              customer.customer_detail.City,
                                              customer.customer_detail.StateProvinceName,
                                              customer.customer_detail.PostalCode,
                                            ]
                                              .filter(Boolean)
                                              .join(", ")}
                                          </p>
                                        </div>
                                      )}
                                      <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                                        <div>
                                          <p className="text-muted-foreground text-xs">Customer ID</p>
                                          <p className="font-semibold">{customer.CustomerID}</p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground text-xs">Territory ID</p>
                                          <p className="font-semibold">{customer.TerritoryID}</p>
                                        </div>
                                        {customer.AccountNumber && (
                                          <div>
                                            <p className="text-muted-foreground text-xs">Account Number</p>
                                            <p className="font-semibold">{customer.AccountNumber}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground">Loading customer information...</p>
                                )}
                              </div>

                              {/* Order Details */}
                              <div>
                                <h3 className="font-semibold mb-4 text-foreground">Order Details</h3>
                                {details.length === 0 ? (
                                  <p className="text-muted-foreground">Loading order details...</p>
                                ) : (
                                  <>
                                    <div className="border rounded-lg overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="bg-muted/50 border-b">
                                            <TableHead className="font-semibold">Product</TableHead>
                                            <TableHead className="font-semibold">Quantity</TableHead>
                                            <TableHead className="font-semibold">Unit Price</TableHead>
                                            <TableHead className="font-semibold">Discount</TableHead>
                                            <TableHead className="text-right font-semibold">Line Total</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {details.map((detail) => (
                                            <TableRow key={detail.SalesOrderDetailID} className="border-b">
                                              <TableCell>
                                                {detail.Product?.Name ||
                                                  `Product ID: ${detail.ProductID}`}
                                                {detail.Product?.ProductNumber && (
                                                  <span className="text-muted-foreground text-sm ml-2">
                                                    ({detail.Product.ProductNumber})
                                                  </span>
                                                )}
                                              </TableCell>
                                              <TableCell>{detail.OrderQty ?? "N/A"}</TableCell>
                                              <TableCell>{formatCurrency(detail.UnitPrice)}</TableCell>
                                              <TableCell>
                                                {detail.UnitPriceDiscount
                                                  ? `${(detail.UnitPriceDiscount * 100).toFixed(2)}%`
                                                  : "N/A"}
                                              </TableCell>
                                              <TableCell className="text-right font-medium">
                                                {formatCurrency(detail.LineTotal)}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                    <div className="mt-6 pt-4 border-t">
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <p className="text-muted-foreground text-xs">Subtotal</p>
                                          <p className="font-semibold">{formatCurrency(order.SubTotal)}</p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground text-xs">Tax Amount</p>
                                          <p className="font-semibold">{formatCurrency(order.TaxAmt)}</p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground text-xs">Freight</p>
                                          <p className="font-semibold">{formatCurrency(order.Freight)}</p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground text-xs">Total Due</p>
                                          <p className="font-semibold text-lg text-primary">
                                            {formatCurrency(order.TotalDue)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
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
          <div className="flex justify-center mt-6 pb-4">
            <Button onClick={loadMore} disabled={loadingMore} variant="outline">
              {loadingMore ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </>
    )
  }
)

SalesOrderTable.displayName = "SalesOrderTable"
