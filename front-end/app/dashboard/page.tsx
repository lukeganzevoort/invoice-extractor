"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Loader2, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SalesOrderFormSheet } from "@/components/sales-order-form-sheet"
import { SalesOrderTable, SalesOrderTableRef } from "@/components/sales-order-table"


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
  const [error, setError] = useState<string | null>(null)
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

  const handleFormSubmit = async (data: {
    header: ExtractedHeader
    lineItems: ExtractedLineItem[]
    customer: Customer | null
    customerDetail: IndividualCustomer | StoreCustomer | null
  }) => {
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
      const detailPromises = data.lineItems.map((item) => {
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
        <div className="text-center">
          <p className="text-lg text-destructive mb-4">Error: {error}</p>
          <Button onClick={() => tableRef.current?.refresh()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Sales Orders Dashboard</h1>
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
      <SalesOrderTable ref={tableRef} onError={setError} />

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
    </div>
  )
}
