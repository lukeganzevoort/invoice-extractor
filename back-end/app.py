"""
Flask API for invoice extractor.
Provides endpoints for managing sales orders.
"""

from datetime import datetime

from db import get_db_session
from document_processor import ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE
from flask import Flask, abort, jsonify, request
from flask_cors import CORS
from models import SalesOrderDetail, SalesOrderHeader
from openai_full_data_extraction import extract_invoice_data_from_document

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


@app.route("/upload", methods=["POST"])
def upload_invoice():
    """
    Upload and process an invoice document.

    Accepts multipart/form-data with a file field.
    Supported formats: PDF, PNG, JPG

    Returns:
        JSON object containing extracted invoice data with header and line_items.
        Returns 400 for invalid requests, 413 for file too large,
        415 for unsupported type, 500 for processing errors.
    """
    # Check if file is present
    if "file" not in request.files:
        abort(400, description="No file provided in request")

    file = request.files["file"]

    # Check if file was actually selected
    if file.filename == "" or not file.filename:
        abort(400, description="No file selected")

    # Check if file extension is allowed
    allow_file = (
        "." in file.filename
        and file.filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )

    # Validate file extension
    if not allow_file:
        allowed_types = ", ".join(ALLOWED_EXTENSIONS)
        abort(415, description=f"Unsupported file type. Allowed types: {allowed_types}")

    # Check file size
    file.seek(0, 2)  # Seek to end
    file_size = file.tell()
    file.seek(0)  # Reset to beginning

    if file_size > MAX_FILE_SIZE:
        max_size_mb = MAX_FILE_SIZE / 1024 / 1024
        abort(413, description=f"File too large. Maximum size: {max_size_mb}MB")

    # Validate MIME type
    if hasattr(file, "content_type") and file.content_type:
        if file.content_type not in ALLOWED_MIME_TYPES:
            abort(
                415,
                description=f"Unsupported MIME type: {file.content_type}",
            )

    try:
        # Process the document and extract structured invoice data
        extracted_data = extract_invoice_data_from_document(file, file.filename)

        return jsonify(extracted_data), 200

    except ValueError as e:
        # Handle processing errors (OCR, API, parsing)
        abort(500, description=f"Error processing document: {str(e)}")
    except Exception as e:
        # Handle unexpected errors
        abort(500, description=f"Unexpected error: {str(e)}")


@app.route("/sales_orders", methods=["GET"])
def get_sales_orders():
    """
    Lists stored sales orders (header info) with pagination and sorting.

    Query Parameters:
        page (int): Page number (default: 1, minimum: 1)
        per_page (int): Number of items per page (default: 10, minimum: 1, maximum: 100)
        sort_by (str): Field to sort by (default: SalesOrderID). Valid fields:
            SalesOrderID, OrderDate, DueDate, ShipDate, Status, SalesOrderNumber,
            PurchaseOrderNumber, AccountNumber, CustomerID, SalesPersonID, TerritoryID,
            SubTotal, TaxAmt, Freight, TotalDue
        order (str): Sort order - 'asc' or 'desc' (default: 'asc')

    Returns:
        JSON object containing:
            - data: Array of sales order headers with all header fields
            - pagination: Object with pagination metadata (page, per_page, total, total_pages, has_next, has_prev)
    """
    # Get pagination parameters from query string
    try:
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 10))
    except (ValueError, TypeError):
        abort(400, description="page and per_page must be valid integers")

    # Validate pagination parameters
    if page < 1:
        abort(400, description="page must be greater than or equal to 1")
    if per_page < 1:
        abort(400, description="per_page must be greater than or equal to 1")
    if per_page > 100:
        abort(400, description="per_page cannot exceed 100")

    # Get sorting parameters
    sort_by = request.args.get("sort_by", "SalesOrderID")
    order = request.args.get("order", "asc").lower()

    # Define allowed sortable fields
    allowed_sort_fields = {
        "SalesOrderID",
        "RevisionNumber",
        "OrderDate",
        "DueDate",
        "ShipDate",
        "Status",
        "OnlineOrderFlag",
        "SalesOrderNumber",
        "PurchaseOrderNumber",
        "AccountNumber",
        "CustomerID",
        "SalesPersonID",
        "TerritoryID",
        "BillToAddressID",
        "ShipToAddressID",
        "ShipMethodID",
        "CreditCardID",
        "CreditCardApprovalCode",
        "CurrencyRateID",
        "SubTotal",
        "TaxAmt",
        "Freight",
        "TotalDue",
    }

    # Validate sort field
    if sort_by not in allowed_sort_fields:
        abort(
            400,
            description=f"Invalid sort_by field. Allowed fields: {', '.join(sorted(allowed_sort_fields))}",
        )

    # Validate order direction
    if order not in ("asc", "desc"):
        abort(400, description="order must be 'asc' or 'desc'")

    with get_db_session() as session:
        # Get total count for pagination metadata
        total = session.query(SalesOrderHeader).count()

        # Calculate pagination
        total_pages = (total + per_page - 1) // per_page if total > 0 else 0
        offset = (page - 1) * per_page

        # Get the sort column from the model
        sort_column = getattr(SalesOrderHeader, sort_by)

        # Apply ordering (descending if order is 'desc')
        if order == "desc":
            sort_column = sort_column.desc()

        # Query with pagination and sorting
        orders = (
            session.query(SalesOrderHeader)
            .order_by(sort_column)
            .offset(offset)
            .limit(per_page)
            .all()
        )

        # Convert orders to dictionaries
        orders_data = []
        for order in orders:
            order_dict = {
                "SalesOrderID": order.SalesOrderID,
                "RevisionNumber": order.RevisionNumber,
                "OrderDate": order.OrderDate.isoformat() if order.OrderDate else None,
                "DueDate": order.DueDate.isoformat() if order.DueDate else None,
                "ShipDate": order.ShipDate.isoformat() if order.ShipDate else None,
                "Status": order.Status,
                "OnlineOrderFlag": order.OnlineOrderFlag,
                "SalesOrderNumber": order.SalesOrderNumber,
                "PurchaseOrderNumber": order.PurchaseOrderNumber,
                "AccountNumber": order.AccountNumber,
                "CustomerID": order.CustomerID,
                "SalesPersonID": order.SalesPersonID,
                "TerritoryID": order.TerritoryID,
                "BillToAddressID": order.BillToAddressID,
                "ShipToAddressID": order.ShipToAddressID,
                "ShipMethodID": order.ShipMethodID,
                "CreditCardID": order.CreditCardID,
                "CreditCardApprovalCode": order.CreditCardApprovalCode,
                "CurrencyRateID": order.CurrencyRateID,
                "SubTotal": order.SubTotal,
                "TaxAmt": order.TaxAmt,
                "Freight": order.Freight,
                "TotalDue": order.TotalDue,
            }
            orders_data.append(order_dict)

        # Build pagination metadata
        pagination = {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        }

        return jsonify({"data": orders_data, "pagination": pagination}), 200


@app.route("/sales_orders", methods=["POST"])
def create_sales_order():
    """
    Creates a new sales order.

    Request Body:
        JSON object with sales order fields. CustomerID and TerritoryID are required.
        SalesOrderID can be provided or will be auto-generated.
        Date fields should be in ISO format (YYYY-MM-DDTHH:MM:SS).

    Returns:
        JSON object containing the created sales order header with 201 status code.
        Returns 400 for invalid requests.
    """
    if not request.is_json:
        abort(400, description="Request body must be JSON")

    data = request.get_json()

    # Validate required fields
    if "CustomerID" not in data:
        abort(400, description="CustomerID is required")
    if "TerritoryID" not in data:
        abort(400, description="TerritoryID is required")

    with get_db_session() as session:
        # Create new order
        order = SalesOrderHeader()

        # Set all provided fields
        if "SalesOrderID" in data:
            order.SalesOrderID = data["SalesOrderID"]
        order.CustomerID = data["CustomerID"]
        order.TerritoryID = data["TerritoryID"]

        # Handle optional fields
        optional_fields = [
            "RevisionNumber",
            "OrderDate",
            "DueDate",
            "ShipDate",
            "Status",
            "OnlineOrderFlag",
            "SalesOrderNumber",
            "PurchaseOrderNumber",
            "AccountNumber",
            "SalesPersonID",
            "BillToAddressID",
            "ShipToAddressID",
            "ShipMethodID",
            "CreditCardID",
            "CreditCardApprovalCode",
            "CurrencyRateID",
            "SubTotal",
            "TaxAmt",
            "Freight",
            "TotalDue",
        ]

        for field in optional_fields:
            if field in data:
                value = data[field]

                # Handle datetime fields
                if field in ["OrderDate", "DueDate", "ShipDate"]:
                    if value is not None:
                        try:
                            if isinstance(value, str):
                                value = datetime.fromisoformat(
                                    value.replace("Z", "+00:00")
                                )
                        except (ValueError, AttributeError):
                            abort(
                                400,
                                description=f"Invalid date format for {field}. "
                                "Use ISO format (YYYY-MM-DDTHH:MM:SS)",
                            )

                setattr(order, field, value)

        session.add(order)
        session.flush()  # Flush to get the generated ID

        # Build response with created order data
        order_data = {
            "SalesOrderID": order.SalesOrderID,
            "RevisionNumber": order.RevisionNumber,
            "OrderDate": order.OrderDate.isoformat() if order.OrderDate else None,
            "DueDate": order.DueDate.isoformat() if order.DueDate else None,
            "ShipDate": order.ShipDate.isoformat() if order.ShipDate else None,
            "Status": order.Status,
            "OnlineOrderFlag": order.OnlineOrderFlag,
            "SalesOrderNumber": order.SalesOrderNumber,
            "PurchaseOrderNumber": order.PurchaseOrderNumber,
            "AccountNumber": order.AccountNumber,
            "CustomerID": order.CustomerID,
            "SalesPersonID": order.SalesPersonID,
            "TerritoryID": order.TerritoryID,
            "BillToAddressID": order.BillToAddressID,
            "ShipToAddressID": order.ShipToAddressID,
            "ShipMethodID": order.ShipMethodID,
            "CreditCardID": order.CreditCardID,
            "CreditCardApprovalCode": order.CreditCardApprovalCode,
            "CurrencyRateID": order.CurrencyRateID,
            "SubTotal": order.SubTotal,
            "TaxAmt": order.TaxAmt,
            "Freight": order.Freight,
            "TotalDue": order.TotalDue,
        }

        return jsonify(order_data), 201


@app.route("/sales_orders/<int:order_id>", methods=["GET"])
def get_sales_order(order_id):
    """
    Retrieves a single sales order with full details.

    Args:
        order_id: The SalesOrderID of the order to retrieve

    Returns:
        JSON object containing the sales order header and all order details
        (line items). Returns 404 if order not found.
    """
    with get_db_session() as session:

        order = (
            session.query(SalesOrderHeader)
            .filter(SalesOrderHeader.SalesOrderID == order_id)
            .first()
        )

        if not order:
            abort(404, description=f"Sales order with ID {order_id} not found")

        # Build header data
        order_data = {
            "SalesOrderID": order.SalesOrderID,
            "RevisionNumber": order.RevisionNumber,
            "OrderDate": order.OrderDate.isoformat() if order.OrderDate else None,
            "DueDate": order.DueDate.isoformat() if order.DueDate else None,
            "ShipDate": order.ShipDate.isoformat() if order.ShipDate else None,
            "Status": order.Status,
            "OnlineOrderFlag": order.OnlineOrderFlag,
            "SalesOrderNumber": order.SalesOrderNumber,
            "PurchaseOrderNumber": order.PurchaseOrderNumber,
            "AccountNumber": order.AccountNumber,
            "CustomerID": order.CustomerID,
            "SalesPersonID": order.SalesPersonID,
            "TerritoryID": order.TerritoryID,
            "BillToAddressID": order.BillToAddressID,
            "ShipToAddressID": order.ShipToAddressID,
            "ShipMethodID": order.ShipMethodID,
            "CreditCardID": order.CreditCardID,
            "CreditCardApprovalCode": order.CreditCardApprovalCode,
            "CurrencyRateID": order.CurrencyRateID,
            "SubTotal": order.SubTotal,
            "TaxAmt": order.TaxAmt,
            "Freight": order.Freight,
            "TotalDue": order.TotalDue,
            "OrderDetails": [],
        }

        # Add order details (line items) with product information
        for detail in order.order_details:
            detail_dict = {
                "SalesOrderDetailID": detail.SalesOrderDetailID,
                "CarrierTrackingNumber": detail.CarrierTrackingNumber,
                "OrderQty": detail.OrderQty,
                "ProductID": detail.ProductID,
                "SpecialOfferID": detail.SpecialOfferID,
                "UnitPrice": detail.UnitPrice,
                "UnitPriceDiscount": detail.UnitPriceDiscount,
                "LineTotal": detail.LineTotal,
            }

            # Add product information if available
            if detail.product:
                detail_dict["Product"] = {
                    "ProductID": detail.product.ProductID,
                    "Name": detail.product.Name,
                    "ProductNumber": detail.product.ProductNumber,
                    "Color": detail.product.Color,
                    "Size": detail.product.Size,
                    "ListPrice": detail.product.ListPrice,
                }

            order_data["OrderDetails"].append(detail_dict)

        return jsonify(order_data), 200


@app.route("/sales_orders/<int:order_id>", methods=["PUT"])
def update_sales_order(order_id):
    """
    Updates editable fields of a sales order.

    Args:
        order_id: The SalesOrderID of the order to update

    Request Body:
        JSON object with fields to update. SalesOrderID cannot be updated.
        Date fields should be in ISO format (YYYY-MM-DDTHH:MM:SS).

    Returns:
        JSON object containing the updated sales order header.
        Returns 404 if order not found, 400 for invalid requests.
    """
    if not request.is_json:
        abort(400, description="Request body must be JSON")

    data = request.get_json()

    # SalesOrderID cannot be updated
    if "SalesOrderID" in data and data["SalesOrderID"] != order_id:
        abort(400, description="SalesOrderID cannot be modified")

    with get_db_session() as session:
        order = (
            session.query(SalesOrderHeader)
            .filter(SalesOrderHeader.SalesOrderID == order_id)
            .first()
        )

        if not order:
            abort(404, description=f"Sales order with ID {order_id} not found")

        # List of editable fields (excluding primary key)
        editable_fields = [
            "RevisionNumber",
            "OrderDate",
            "DueDate",
            "ShipDate",
            "Status",
            "OnlineOrderFlag",
            "SalesOrderNumber",
            "PurchaseOrderNumber",
            "AccountNumber",
            "CustomerID",
            "SalesPersonID",
            "TerritoryID",
            "BillToAddressID",
            "ShipToAddressID",
            "ShipMethodID",
            "CreditCardID",
            "CreditCardApprovalCode",
            "CurrencyRateID",
            "SubTotal",
            "TaxAmt",
            "Freight",
            "TotalDue",
        ]

        # Update only provided fields
        for field in editable_fields:
            if field in data:
                value = data[field]

                # Handle datetime fields
                if field in ["OrderDate", "DueDate", "ShipDate"]:
                    if value is not None:
                        try:
                            # Try parsing ISO format datetime string
                            if isinstance(value, str):
                                value = datetime.fromisoformat(
                                    value.replace("Z", "+00:00")
                                )
                        except (ValueError, AttributeError):
                            abort(
                                400,
                                description=f"Invalid date format for {field}. "
                                "Use ISO format (YYYY-MM-DDTHH:MM:SS)",
                            )

                setattr(order, field, value)

        # Build response with updated order data
        order_data = {
            "SalesOrderID": order.SalesOrderID,
            "RevisionNumber": order.RevisionNumber,
            "OrderDate": order.OrderDate.isoformat() if order.OrderDate else None,
            "DueDate": order.DueDate.isoformat() if order.DueDate else None,
            "ShipDate": order.ShipDate.isoformat() if order.ShipDate else None,
            "Status": order.Status,
            "OnlineOrderFlag": order.OnlineOrderFlag,
            "SalesOrderNumber": order.SalesOrderNumber,
            "PurchaseOrderNumber": order.PurchaseOrderNumber,
            "AccountNumber": order.AccountNumber,
            "CustomerID": order.CustomerID,
            "SalesPersonID": order.SalesPersonID,
            "TerritoryID": order.TerritoryID,
            "BillToAddressID": order.BillToAddressID,
            "ShipToAddressID": order.ShipToAddressID,
            "ShipMethodID": order.ShipMethodID,
            "CreditCardID": order.CreditCardID,
            "CreditCardApprovalCode": order.CreditCardApprovalCode,
            "CurrencyRateID": order.CurrencyRateID,
            "SubTotal": order.SubTotal,
            "TaxAmt": order.TaxAmt,
            "Freight": order.Freight,
            "TotalDue": order.TotalDue,
        }

        return jsonify(order_data), 200


@app.route("/sales_orders/<int:order_id>", methods=["DELETE"])
def delete_sales_order(order_id):
    """
    Deletes a sales order by SalesOrderID.

    Args:
        order_id: The SalesOrderID of the order to delete

    Returns:
        Returns 204 (No Content) on successful deletion.
        Returns 404 if not found.
    """
    with get_db_session() as session:
        order = (
            session.query(SalesOrderHeader)
            .filter(SalesOrderHeader.SalesOrderID == order_id)
            .first()
        )

        if not order:
            abort(404, description=f"Sales order with ID {order_id} not found")

        # Delete associated order details first
        session.query(SalesOrderDetail).filter(
            SalesOrderDetail.SalesOrderID == order_id
        ).delete()

        # Delete the order
        session.delete(order)
        # Response will be committed by the context manager

        return "", 204


@app.route("/sales_order_details", methods=["GET"])
def get_sales_order_details():
    """
    Lists all sales order details across all orders.

    Returns:
        JSON array of all sales order details with product information.
    """
    with get_db_session() as session:
        details = session.query(SalesOrderDetail).all()

        details_data = []
        for detail in details:
            detail_dict = {
                "SalesOrderID": detail.SalesOrderID,
                "SalesOrderDetailID": detail.SalesOrderDetailID,
                "CarrierTrackingNumber": detail.CarrierTrackingNumber,
                "OrderQty": detail.OrderQty,
                "ProductID": detail.ProductID,
                "SpecialOfferID": detail.SpecialOfferID,
                "UnitPrice": detail.UnitPrice,
                "UnitPriceDiscount": detail.UnitPriceDiscount,
                "LineTotal": detail.LineTotal,
            }

            # Add product information if available
            if detail.product:
                detail_dict["Product"] = {
                    "ProductID": detail.product.ProductID,
                    "Name": detail.product.Name,
                    "ProductNumber": detail.product.ProductNumber,
                    "Color": detail.product.Color,
                    "Size": detail.product.Size,
                    "ListPrice": detail.product.ListPrice,
                }

            details_data.append(detail_dict)

        return jsonify(details_data), 200


@app.route("/sales_order_details", methods=["POST"])
def create_sales_order_detail():
    """
    Creates a new sales order detail (line item).

    Request Body:
        JSON object with order detail fields. SalesOrderID and ProductID are required.
        SalesOrderDetailID can be provided or will be auto-generated.

    Returns:
        JSON object containing the created sales order detail with product information
        and 201 status code. Returns 400 for invalid requests, 404 if order not found.
    """
    if not request.is_json:
        abort(400, description="Request body must be JSON")

    data = request.get_json()

    # Validate required fields
    if "SalesOrderID" not in data:
        abort(400, description="SalesOrderID is required")
    if "ProductID" not in data:
        abort(400, description="ProductID is required")

    with get_db_session() as session:
        # Verify the sales order exists
        order = (
            session.query(SalesOrderHeader)
            .filter(SalesOrderHeader.SalesOrderID == data["SalesOrderID"])
            .first()
        )
        if not order:
            abort(
                404,
                description=f"Sales order with ID {data['SalesOrderID']} not found",
            )

        # Create new order detail
        detail = SalesOrderDetail()

        # Set required fields
        detail.SalesOrderID = data["SalesOrderID"]
        detail.ProductID = data["ProductID"]

        # Set SalesOrderDetailID if provided
        if "SalesOrderDetailID" in data:
            detail.SalesOrderDetailID = data["SalesOrderDetailID"]

        # Handle optional fields
        optional_fields = [
            "CarrierTrackingNumber",
            "OrderQty",
            "SpecialOfferID",
            "UnitPrice",
            "UnitPriceDiscount",
            "LineTotal",
        ]

        for field in optional_fields:
            if field in data:
                setattr(detail, field, data[field])

        session.add(detail)
        session.flush()  # Flush to get the generated ID

        # Build response
        detail_data = {
            "SalesOrderID": detail.SalesOrderID,
            "SalesOrderDetailID": detail.SalesOrderDetailID,
            "CarrierTrackingNumber": detail.CarrierTrackingNumber,
            "OrderQty": detail.OrderQty,
            "ProductID": detail.ProductID,
            "SpecialOfferID": detail.SpecialOfferID,
            "UnitPrice": detail.UnitPrice,
            "UnitPriceDiscount": detail.UnitPriceDiscount,
            "LineTotal": detail.LineTotal,
        }

        # Add product information if available
        if detail.product:
            detail_data["Product"] = {
                "ProductID": detail.product.ProductID,
                "Name": detail.product.Name,
                "ProductNumber": detail.product.ProductNumber,
                "Color": detail.product.Color,
                "Size": detail.product.Size,
                "ListPrice": detail.product.ListPrice,
            }

        return jsonify(detail_data), 201


@app.route("/sales_order_details/<int:detail_id>", methods=["GET"])
def get_sales_order_detail(detail_id):
    """
    Retrieves a single sales order detail by SalesOrderDetailID.

    Args:
        detail_id: The SalesOrderDetailID of the detail to retrieve

    Returns:
        JSON object containing the sales order detail with product information.
        Returns 404 if not found.
    """
    with get_db_session() as session:
        detail = (
            session.query(SalesOrderDetail)
            .filter(SalesOrderDetail.SalesOrderDetailID == detail_id)
            .first()
        )

        if not detail:
            abort(404, description=f"Sales order detail with ID {detail_id} not found")

        # Build response
        detail_data = {
            "SalesOrderID": detail.SalesOrderID,
            "SalesOrderDetailID": detail.SalesOrderDetailID,
            "CarrierTrackingNumber": detail.CarrierTrackingNumber,
            "OrderQty": detail.OrderQty,
            "ProductID": detail.ProductID,
            "SpecialOfferID": detail.SpecialOfferID,
            "UnitPrice": detail.UnitPrice,
            "UnitPriceDiscount": detail.UnitPriceDiscount,
            "LineTotal": detail.LineTotal,
        }

        # Add product information if available
        if detail.product:
            detail_data["Product"] = {
                "ProductID": detail.product.ProductID,
                "Name": detail.product.Name,
                "ProductNumber": detail.product.ProductNumber,
                "Color": detail.product.Color,
                "Size": detail.product.Size,
                "ListPrice": detail.product.ListPrice,
            }

        return jsonify(detail_data), 200


@app.route("/sales_order_details/<int:detail_id>", methods=["PUT"])
def update_sales_order_detail(detail_id):
    """
    Updates editable fields of a sales order detail.

    Args:
        detail_id: The SalesOrderDetailID of the detail to update

    Request Body:
        JSON object with fields to update. SalesOrderDetailID cannot be updated.

    Returns:
        JSON object containing the updated sales order detail with product
        information. Returns 404 if not found, 400 for invalid requests.
    """
    if not request.is_json:
        abort(400, description="Request body must be JSON")

    data = request.get_json()

    # SalesOrderDetailID cannot be updated
    if "SalesOrderDetailID" in data and data["SalesOrderDetailID"] != detail_id:
        abort(400, description="SalesOrderDetailID cannot be modified")

    with get_db_session() as session:
        detail = (
            session.query(SalesOrderDetail)
            .filter(SalesOrderDetail.SalesOrderDetailID == detail_id)
            .first()
        )

        if not detail:
            abort(404, description=f"Sales order detail with ID {detail_id} not found")

        # Editable fields for order details
        editable_fields = [
            "CarrierTrackingNumber",
            "OrderQty",
            "ProductID",
            "SpecialOfferID",
            "UnitPrice",
            "UnitPriceDiscount",
            "LineTotal",
        ]

        # Update only provided fields
        for field in editable_fields:
            if field in data:
                setattr(detail, field, data[field])

        # Build response
        detail_data = {
            "SalesOrderID": detail.SalesOrderID,
            "SalesOrderDetailID": detail.SalesOrderDetailID,
            "CarrierTrackingNumber": detail.CarrierTrackingNumber,
            "OrderQty": detail.OrderQty,
            "ProductID": detail.ProductID,
            "SpecialOfferID": detail.SpecialOfferID,
            "UnitPrice": detail.UnitPrice,
            "UnitPriceDiscount": detail.UnitPriceDiscount,
            "LineTotal": detail.LineTotal,
        }

        # Add product information if available
        if detail.product:
            detail_data["Product"] = {
                "ProductID": detail.product.ProductID,
                "Name": detail.product.Name,
                "ProductNumber": detail.product.ProductNumber,
                "Color": detail.product.Color,
                "Size": detail.product.Size,
                "ListPrice": detail.product.ListPrice,
            }

        return jsonify(detail_data), 200


@app.route("/sales_order_details/<int:detail_id>", methods=["DELETE"])
def delete_sales_order_detail(detail_id):
    """
    Deletes a sales order detail by SalesOrderDetailID.

    Args:
        detail_id: The SalesOrderDetailID of the detail to delete

    Returns:
        Returns 204 (No Content) on successful deletion.
        Returns 404 if not found.
    """
    with get_db_session() as session:
        detail = (
            session.query(SalesOrderDetail)
            .filter(SalesOrderDetail.SalesOrderDetailID == detail_id)
            .first()
        )

        if not detail:
            abort(404, description=f"Sales order detail with ID {detail_id} not found")

        session.delete(detail)
        # Response will be committed by the context manager

        return "", 204


if __name__ == "__main__":
    app.run(debug=True)
