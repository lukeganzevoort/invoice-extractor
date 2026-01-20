"use client"

import { Fragment, useEffect, useState } from "react"
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
  ListPrice: number | null
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

export default function Dashboard() {
  const [salesOrders, setSalesOrders] = useState<SalesOrderHeader[]>([])
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set())
  const [orderDetails, setOrderDetails] = useState<
    Map<number, SalesOrderDetail[]>
  >(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSalesOrders()
  }, [])

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
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
      <h1 className="text-3xl font-bold mb-6">Sales Orders Dashboard</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Order ID</TableHead>
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
                            className={`h-4 w-4 transition-transform ${
                              isExpanded ? "rotate-180" : ""
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
    </div>
  )
}
