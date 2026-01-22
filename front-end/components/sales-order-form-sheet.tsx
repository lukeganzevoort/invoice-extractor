"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Search, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { API_ENDPOINTS } from "@/lib/api"
import type {
  ExtractedHeader,
  ExtractedLineItem,
  Product,
  Customer,
  IndividualCustomer,
  StoreCustomer,
  SalesOrderFormData,
  CustomerWithDetail,
} from "@/lib/types"

interface SalesOrderFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: SalesOrderFormData | null
  onFormDataChange: (data: SalesOrderFormData) => void
  onSubmit: (data: SalesOrderFormData) => Promise<void>
  submitting?: boolean
  error?: string | null
  onError?: (error: string | null) => void
  salesOrderId?: number | null // If provided, we're in edit mode
}

export function SalesOrderFormSheet({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  submitting = false,
  error,
  onError,
  salesOrderId = null,
}: SalesOrderFormSheetProps) {
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerWithDetail[]>([])
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const customerSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [productSearchQueries, setProductSearchQueries] = useState<Map<number, string>>(new Map())
  const [productSearchResults, setProductSearchResults] = useState<Map<number, Product[]>>(new Map())
  const [productSearchLoading, setProductSearchLoading] = useState<Map<number, boolean>>(new Map())
  const [showProductDropdowns, setShowProductDropdowns] = useState<Map<number, boolean>>(new Map())
  const productSearchTimeoutRefs = useRef<Map<number, NodeJS.Timeout>>(new Map())
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  // Clear validation message when all requirements are met
  useEffect(() => {
    if (!formData || !validationMessage) return

    const hasCustomer = !!formData.customer
    const allItemsHaveProducts = formData.lineItems.every(
      (item) => item.product || item.ProductID
    )

    if (hasCustomer && allItemsHaveProducts) {
      setValidationMessage(null)
    }
  }, [formData?.customer, formData?.lineItems, validationMessage])

  // Initialize customer search query when formData changes
  useEffect(() => {
    if (formData?.customer && formData?.customerDetail) {
      if ("FirstName" in formData.customerDetail) {
        const name = [
          formData.customerDetail.FirstName,
          formData.customerDetail.MiddleName,
          formData.customerDetail.LastName,
        ]
          .filter(Boolean)
          .join(" ")
        setCustomerSearchQuery(name)
      } else {
        setCustomerSearchQuery(formData.customerDetail.Name || `Customer ${formData.customer.CustomerID}`)
      }
    }
  }, [formData?.customer, formData?.customerDetail])

  // Initialize product search queries when formData changes
  useEffect(() => {
    if (formData?.lineItems) {
      const newProductQueries = new Map<number, string>()
      formData.lineItems.forEach((item, index) => {
        if (item.product) {
          newProductQueries.set(index, item.product.Name || item.product.ProductNumber || "")
        } else if (item.ProductDescription) {
          newProductQueries.set(index, item.ProductDescription)
        }
      })
      setProductSearchQueries(newProductQueries)
    }
  }, [formData?.lineItems])

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

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const updateHeaderField = (field: keyof ExtractedHeader, value: any) => {
    if (!formData) return
    onFormDataChange({
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
    onFormDataChange({
      ...formData,
      lineItems: updatedItems,
    })
  }

  const addLineItem = () => {
    if (!formData) return
    const newItem: ExtractedLineItem = {
      OrderQty: null,
      ProductID: null,
      ProductDescription: null,
      SpecialOfferID: null,
      UnitPrice: null,
      UnitPriceDiscount: null,
      LineTotal: null,
      CarrierTrackingNumber: null,
      product: null,
    }
    onFormDataChange({
      ...formData,
      lineItems: [...formData.lineItems, newItem],
    })
  }

  // Helper function to reindex a Map after removing an item
  const reindexMap = <T,>(map: Map<number, T>, removedIndex: number): Map<number, T> => {
    const reindexed = new Map<number, T>()
    map.forEach((value, key) => {
      if (key < removedIndex) {
        reindexed.set(key, value)
      } else if (key > removedIndex) {
        reindexed.set(key - 1, value)
      }
      // Skip the removed index
    })
    return reindexed
  }

  const removeLineItem = (index: number) => {
    if (!formData) return
    const updatedItems = formData.lineItems.filter((_, i) => i !== index)
    onFormDataChange({
      ...formData,
      lineItems: updatedItems,
    })
    // Clean up and reindex search state
    setProductSearchQueries((prev) => reindexMap(prev, index))
    setProductSearchResults((prev) => reindexMap(prev, index))
    setProductSearchLoading((prev) => reindexMap(prev, index))
    setShowProductDropdowns((prev) => reindexMap(prev, index))
    // Clean up timeout refs
    const timeout = productSearchTimeoutRefs.current.get(index)
    if (timeout) {
      clearTimeout(timeout)
    }
    productSearchTimeoutRefs.current = reindexMap(productSearchTimeoutRefs.current, index)
  }

  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setCustomerSearchResults([])
      return
    }

    try {
      setCustomerSearchLoading(true)
      const response = await fetch(API_ENDPOINTS.CUSTOMERS_SEARCH(query))
      if (!response.ok) {
        throw new Error("Failed to search customers")
      }
      const results = await response.json()
      setCustomerSearchResults(results)
    } catch (err) {
      console.error("Error searching customers:", err)
      setCustomerSearchResults([])
      if (onError) {
        onError(err instanceof Error ? err.message : "Failed to search customers")
      }
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

  const selectCustomer = (customer: CustomerWithDetail) => {
    if (!formData) return
    onFormDataChange({
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
    // Clear validation message when customer is selected
    setValidationMessage(null)
  }

  const getCustomerDisplayName = (customer: CustomerWithDetail) => {
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
      const response = await fetch(API_ENDPOINTS.PRODUCTS_SEARCH(query))
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
      if (onError) {
        onError(err instanceof Error ? err.message : "Failed to search products")
      }
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
    onFormDataChange({
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData) return

    // Validate that a customer is selected
    if (!formData.customer) {
      setValidationMessage("Please select a customer before submitting")
      return
    }

    // Validate that all line items have products selected
    const itemsWithoutProducts: number[] = []
    formData.lineItems.forEach((item, index) => {
      if (!item.product && !item.ProductID) {
        itemsWithoutProducts.push(index + 1)
      }
    })
    if (itemsWithoutProducts.length > 0) {
      const itemNumbers = itemsWithoutProducts.join(", ")
      setValidationMessage(
        `Please select a product for item${itemsWithoutProducts.length > 1 ? "s" : ""} ${itemNumbers}`
      )
      return
    }

    // Clear validation message if all validations pass
    setValidationMessage(null)

    try {
      if (onError) {
        onError(null)
      }
      await onSubmit(formData)
      // Close the sheet after successful submission
      onOpenChange(false)
    } catch (err) {
      if (onError) {
        onError(err instanceof Error ? err.message : "An error occurred during submission")
      }
    }
  }

  if (!formData) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{salesOrderId ? "Edit Sales Order" : "Review and Edit Sales Order"}</SheetTitle>
          <SheetDescription>
            {salesOrderId
              ? "Edit the sales order details and make any necessary changes."
              : "Review the extracted data and make any necessary edits before submitting."}
          </SheetDescription>
        </SheetHeader>

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
            {!formData.customer && (
              <p className="text-sm text-muted-foreground italic">Please search and select a customer</p>
            )}
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
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Line Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>
            {formData.lineItems.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Item {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLineItem(index)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={formData.lineItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

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

          {/* Validation Message */}
          {validationMessage && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
              {validationMessage}
            </div>
          )}

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !!validationMessage}
              variant={validationMessage ? "destructive" : "default"}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {salesOrderId ? "Updating..." : "Submitting..."}
                </>
              ) : (
                salesOrderId ? "Update" : "Submit"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
