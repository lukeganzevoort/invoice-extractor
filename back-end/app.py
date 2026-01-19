"""
Flask API for invoice extractor.
Provides endpoints for managing sales orders.
"""

from db import get_db_session
from flask import Flask, jsonify
from models import SalesOrderHeader

app = Flask(__name__)


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


if __name__ == "__main__":
    app.run(debug=True)
