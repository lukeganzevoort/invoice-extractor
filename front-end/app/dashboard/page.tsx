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
} from "@/lib/types"

export default function Dashboard() {
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [formData, setFormData] = useState<SalesOrderFormData | null>(null)
  const [submitting, setSubmitting] = useState(false)
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

      // Create the sales order header
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

      // Close sheet and refresh the orders list
      setSheetOpen(false)
      setFormData(null)
      await tableRef.current?.refresh()
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
            <SalesOrderTable ref={tableRef} onError={setError} />
          </div>
        </div>
      </div>

      <SalesOrderFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={handleFormSubmit}
        submitting={submitting}
        error={error}
        onError={setError}
      />
    </>
  )
}
