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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Order ID ↓</TableHead>
                <TableHead>Order Number</TableHead>
                <TableHead>Order Date</TableHead>
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
                        <TableCell className="font-medium">{order.SalesOrderID}</TableCell>
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
                              <h3 className="font-semibold mb-4">Order Details</h3>
                              {details.length === 0 ? (
                                <p className="text-muted-foreground">Loading order details...</p>
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
                                          <TableHead className="text-right">Line Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {details.map((detail) => (
                                          <TableRow key={detail.SalesOrderDetailID}>
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
                                      <p className="text-muted-foreground">Subtotal:</p>
                                      <p className="font-semibold">{formatCurrency(order.SubTotal)}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Tax Amount:</p>
                                      <p className="font-semibold">{formatCurrency(order.TaxAmt)}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Freight:</p>
                                      <p className="font-semibold">{formatCurrency(order.Freight)}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Total Due:</p>
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
