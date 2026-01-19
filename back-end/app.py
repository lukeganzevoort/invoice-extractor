"""
Flask API for invoice extractor.
Provides endpoints for managing sales orders.
"""

from db import get_db_session
from flask import Flask, abort, jsonify
from models import SalesOrderDetail, SalesOrderHeader

app = Flask(__name__)

# TODO: Add pagination to the sales orders endpoint


@app.route("/sales_orders", methods=["GET"])
def get_sales_orders():
    """
    Lists all stored sales orders (header info).

    Returns:
        JSON array of sales order headers with all header fields.
    """
    with get_db_session() as session:
        orders = session.query(SalesOrderHeader).all()

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

        return jsonify(orders_data), 200


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


if __name__ == "__main__":
    app.run(debug=True)
