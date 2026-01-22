"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Loader2, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SalesOrderFormSheet } from "@/components/sales-order-form-sheet"
import { SalesOrderTable, SalesOrderTableRef } from "@/components/sales-order-table"
import { API_ENDPOINTS } from "@/lib/api"
import type {
  SalesOrderHeader,
  ExtractedData,
  SalesOrderFormData,
  SalesOrderWithDetails,
  SalesOrderDetail,
  CustomerWithDetail,
} from "@/lib/types"

export default function Dashboard() {
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [formData, setFormData] = useState<SalesOrderFormData | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null)
  const [loadingOrder, setLoadingOrder] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tableRef = useRef<SalesOrderTableRef>(null)


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

      const response = await fetch(API_ENDPOINTS.UPLOAD, {
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

      setEditingOrderId(null)
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

  const handleEditOrder = async (orderId: number) => {
    try {
      setLoadingOrder(true)
      setError(null)
      setEditingOrderId(orderId)

      // Fetch the full order with details
      const response = await fetch(API_ENDPOINTS.SALES_ORDER_BY_ID(orderId))
      if (!response.ok) {
        throw new Error("Failed to fetch order details")
      }

      const orderData: SalesOrderWithDetails = await response.json()

      // Fetch customer information
      const customerResponse = await fetch(
        API_ENDPOINTS.CUSTOMERS_SEARCH(orderData.CustomerID.toString(), 1)
      )
      let customer: CustomerWithDetail | null = null
      if (customerResponse.ok) {
        const customers: CustomerWithDetail[] = await customerResponse.json()
        customer = customers[0] || null
      }

      // Convert SalesOrderHeader to ExtractedHeader format
      const header = {
        SalesOrderNumber: orderData.SalesOrderNumber,
        OrderDate: orderData.OrderDate,
        DueDate: orderData.DueDate,
        ShipDate: orderData.ShipDate,
        Status: orderData.Status,
        OnlineOrderFlag: orderData.OnlineOrderFlag,
        PurchaseOrderNumber: orderData.PurchaseOrderNumber,
        AccountNumber: orderData.AccountNumber,
        SalesPersonID: orderData.SalesPersonID,
        BillToAddressID: orderData.BillToAddressID,
        ShipToAddressID: orderData.ShipToAddressID,
        ShipMethodID: orderData.ShipMethodID,
        CreditCardID: orderData.CreditCardID,
        CreditCardApprovalCode: orderData.CreditCardApprovalCode,
        CurrencyRateID: orderData.CurrencyRateID,
        SubTotal: orderData.SubTotal,
        TaxAmt: orderData.TaxAmt,
        Freight: orderData.Freight,
        TotalDue: orderData.TotalDue,
      }

      // Convert SalesOrderDetail[] to ExtractedLineItem[]
      const lineItems = (orderData.OrderDetails || []).map((detail: SalesOrderDetail) => ({
        OrderQty: detail.OrderQty,
        ProductID: detail.ProductID,
        ProductDescription: detail.Product?.Name || detail.Product?.ProductNumber || null,
        SpecialOfferID: detail.SpecialOfferID,
        UnitPrice: detail.UnitPrice,
        UnitPriceDiscount: detail.UnitPriceDiscount,
        LineTotal: detail.LineTotal,
        CarrierTrackingNumber: detail.CarrierTrackingNumber,
        product: detail.Product || null,
        SalesOrderDetailID: detail.SalesOrderDetailID,
      }))

      setFormData({
        header,
        lineItems,
        customer: customer
          ? {
              CustomerID: customer.CustomerID,
              PersonID: customer.PersonID,
              StoreID: customer.StoreID,
              TerritoryID: customer.TerritoryID,
              AccountNumber: customer.AccountNumber,
            }
          : null,
        customerDetail: customer?.customer_detail || null,
      })

      setSheetOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while loading order")
      setEditingOrderId(null)
    } finally {
      setLoadingOrder(false)
    }
  }

  const handleFormSubmit = async (data: SalesOrderFormData) => {
    if (!data.customer) {
      setError("Customer information is required")
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Extract CustomerID and TerritoryID from customer object
      const headerData = {
        ...data.header,
        CustomerID: data.customer.CustomerID,
        TerritoryID: data.customer.TerritoryID,
      }

      if (editingOrderId) {
        // Update existing order
        const headerResponse = await fetch(API_ENDPOINTS.SALES_ORDER_UPDATE(editingOrderId), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(headerData),
        })

        if (!headerResponse.ok) {
          const errorData = await headerResponse.json().catch(() => ({ description: "Failed to update order" }))
          throw new Error(errorData.description || "Failed to update sales order")
        }

        // Fetch existing details to compare
        const orderResponse = await fetch(API_ENDPOINTS.SALES_ORDER_BY_ID(editingOrderId))
        if (!orderResponse.ok) {
          throw new Error("Failed to fetch existing order details")
        }
        const existingOrder: SalesOrderWithDetails = await orderResponse.json()
        const existingDetailIds = new Set(
          (existingOrder.OrderDetails || []).map((d) => d.SalesOrderDetailID)
        )
        const submittedDetailIds = new Set(
          data.lineItems
            .map((item) => item.SalesOrderDetailID)
            .filter((id): id is number => id !== null && id !== undefined)
        )

        // Delete details that were removed
        const detailsToDelete = Array.from(existingDetailIds).filter(
          (id) => !submittedDetailIds.has(id)
        )
        const deletePromises = detailsToDelete.map((detailId) =>
          fetch(API_ENDPOINTS.SALES_ORDER_DETAIL_DELETE(detailId), {
            method: "DELETE",
          })
        )
        if (deletePromises.length > 0) {
          const deleteResponses = await Promise.all(deletePromises)
          const failedDeletes = deleteResponses.filter((r) => !r.ok)
          if (failedDeletes.length > 0) {
            throw new Error("Failed to delete some order details")
          }
        }

        // Update or create details
        const detailPromises = data.lineItems.map(async (item) => {
          const productId = item.product?.ProductID || item.ProductID
          if (!productId) {
            throw new Error("Product is required for all line items")
          }

          if (item.SalesOrderDetailID) {
            // Update existing detail
            return fetch(API_ENDPOINTS.SALES_ORDER_DETAIL_UPDATE(item.SalesOrderDetailID), {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                OrderQty: item.OrderQty,
                ProductID: productId,
                SpecialOfferID: item.SpecialOfferID,
                UnitPrice: item.UnitPrice,
                UnitPriceDiscount: item.UnitPriceDiscount,
                LineTotal: item.LineTotal,
                CarrierTrackingNumber: item.CarrierTrackingNumber,
              }),
            })
          } else {
            // Create new detail
            return fetch(API_ENDPOINTS.SALES_ORDER_DETAILS, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                SalesOrderID: editingOrderId,
                ProductID: productId,
                OrderQty: item.OrderQty,
                SpecialOfferID: item.SpecialOfferID,
                UnitPrice: item.UnitPrice,
                UnitPriceDiscount: item.UnitPriceDiscount,
                LineTotal: item.LineTotal,
                CarrierTrackingNumber: item.CarrierTrackingNumber,
              }),
            })
          }
        })

        const detailResponses = await Promise.all(detailPromises)
        const failedDetails = detailResponses.filter((r) => !r.ok)
        if (failedDetails.length > 0) {
          throw new Error("Failed to update some order details")
        }
      } else {
        // Create new order
        const headerResponse = await fetch(API_ENDPOINTS.SALES_ORDERS, {
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
        const detailPromises = data.lineItems.map((item) => {
          const productId = item.product?.ProductID || item.ProductID
          if (!productId) {
            throw new Error("Product is required for all line items")
          }
          return fetch(API_ENDPOINTS.SALES_ORDER_DETAILS, {
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
      }

      // Close sheet and refresh the orders list
      setSheetOpen(false)
      setFormData(null)
      const orderIdToInvalidate = editingOrderId
      setEditingOrderId(null)
      
      // Refresh the orders list
      await tableRef.current?.refresh()
      
      // Invalidate cached order details for the edited order
      if (orderIdToInvalidate) {
        tableRef.current?.invalidateOrderDetails(orderIdToInvalidate)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during submission")
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center bg-card rounded-lg shadow-md border p-8">
          <p className="text-lg text-destructive mb-4">Error: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/8">
        <div className="container mx-auto py-8 px-4">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 dark:hover:bg-primary/20">
                  <Home className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Sales Orders Dashboard
              </h1>
            </div>
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
          <div className="bg-card rounded-lg shadow-sm border border-primary/20 dark:border-primary/20">
            <SalesOrderTable 
              ref={tableRef} 
              onError={setError} 
              onEdit={handleEditOrder}
            />
            {loadingOrder && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading order details...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <SalesOrderFormSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) {
            setEditingOrderId(null)
            setFormData(null)
          }
        }}
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={handleFormSubmit}
        submitting={submitting}
        error={error}
        onError={setError}
        salesOrderId={editingOrderId}
      />
    </>
  )
}
