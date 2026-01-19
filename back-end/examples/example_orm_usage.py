"""
Example usage of the ORM models.
Demonstrates common operations with SQLAlchemy ORM.
"""

from db import get_db_session
from models import (
    Customer,
    IndividualCustomer,
    Product,
    ProductCategory,
    ProductSubCategory,
    SalesOrderDetail,
    SalesOrderHeader,
    SalesTerritory,
    StoreCustomer,
)


def example_query_products():
    """Example: Query products with their categories."""
    with get_db_session() as session:
        # Get all products with their subcategory and category
        products = (
            session.query(Product)
            .join(ProductSubCategory)
            .join(ProductCategory)
            .limit(10)
            .all()
        )

        for product in products:
            print(f"Product: {product.Name}")
            print(
                f"  Subcategory: {product.subcategory.Name if product.subcategory else 'N/A'}"
            )
            print(
                f"  Category: {product.subcategory.category.Name if product.subcategory else 'N/A'}"
            )
            print(f"  Price: ${product.ListPrice}")
            print()


def example_query_orders():
    """Example: Query sales orders with customer and line items."""
    with get_db_session() as session:
        # Get orders with customer info
        orders = session.query(SalesOrderHeader).join(Customer).limit(5).all()

        for order in orders:
            print(f"Order #{order.SalesOrderNumber}")
            print(f"  Date: {order.OrderDate}")
            print(f"  Customer ID: {order.CustomerID}")
            print(f"  Total: ${order.TotalDue}")
            print(f"  Line Items: {len(order.order_details)}")
            for detail in order.order_details:
                print(
                    f"    - {detail.product.Name if detail.product else 'Unknown'}: "
                    f"{detail.OrderQty} x ${detail.UnitPrice}"
                )
            print()


def example_create_product():
    """Example: Create a new product."""
    with get_db_session() as session:
        # Find a subcategory first
        subcategory = session.query(ProductSubCategory).first()

        if subcategory:
            new_product = Product(
                Name="Example Product",
                ProductNumber="EX-001",
                MakeFlag=False,
                FinishedGoodsFlag=True,
                ListPrice=99.99,
                StandardCost=50.00,
                ProductSubcategoryID=subcategory.ProductSubcategoryID,
            )
            session.add(new_product)
            # Session will commit automatically via context manager
            print(f"Created product: {new_product.Name}")
        else:
            print("No subcategories found. Cannot create product.")


def example_update_product():
    """Example: Update a product."""
    with get_db_session() as session:
        product = session.query(Product).filter(Product.ProductID == 1).first()

        if product and product.ListPrice:
            old_price = product.ListPrice
            product.ListPrice = old_price * 1.1  # Increase price by 10%
            print(
                f"Updated {product.Name} price from ${old_price} to ${product.ListPrice}"
            )
        else:
            print("Product not found")


def example_delete_product():
    """Example: Delete a product (be careful!)."""
    with get_db_session() as session:
        # Find a product to delete (using a filter to be safe)
        product = (
            session.query(Product).filter(Product.Name == "Example Product").first()
        )

        if product:
            session.delete(product)
            print(f"Deleted product: {product.Name}")
        else:
            print("Product not found")


def example_query_customer_details():
    """Example: Query customers with their individual/store details."""
    with get_db_session() as session:
        # Query individual customers by joining on PersonID = BusinessEntityID
        customers_with_details = (
            session.query(Customer, IndividualCustomer)
            .join(
                IndividualCustomer,
                Customer.PersonID == IndividualCustomer.BusinessEntityID,
            )
            .limit(5)
            .all()
        )

        print("Individual Customers:")
        for customer, individual in customers_with_details:
            print(f"  Customer ID: {customer.CustomerID}")
            print(f"    Name: {individual.FirstName} {individual.LastName}")
            print(f"    City: {individual.City}")
            print()

        # Query store customers by joining on StoreID = BusinessEntityID
        store_customers = (
            session.query(Customer, StoreCustomer)
            .join(
                StoreCustomer,
                Customer.StoreID == StoreCustomer.BusinessEntityID,
            )
            .limit(5)
            .all()
        )

        print("Store Customers:")
        for customer, store in store_customers:
            print(f"  Customer ID: {customer.CustomerID}")
            print(f"    Store: {store.Name}")
            print(f"    City: {store.City}")
            print()


def example_complex_query():
    """Example: Complex query with filters and aggregations."""
    with get_db_session() as session:
        from sqlalchemy import func

        # Get total sales by territory
        results = (
            session.query(
                SalesTerritory.Name,
                func.sum(SalesOrderHeader.TotalDue).label("total_sales"),
                func.count(SalesOrderHeader.SalesOrderID).label("order_count"),
            )
            .join(SalesOrderHeader)
            .group_by(SalesTerritory.TerritoryID)
            .all()
        )

        print("Sales by Territory:")
        for territory_name, total_sales, order_count in results:
            print(f"  {territory_name}: ${total_sales:,.2f} ({order_count} orders)")


if __name__ == "__main__":
    print("=== Example 1: Query Products ===\n")
    example_query_products()

    print("\n=== Example 2: Query Orders ===\n")
    example_query_orders()

    print("\n=== Example 3: Query Customer Details ===\n")
    example_query_customer_details()

    print("\n=== Example 4: Complex Query ===\n")
    example_complex_query()

    # Uncomment to test create/update/delete operations
    # print("\n=== Example 4: Create Product ===\n")
    # example_create_product()

    # print("\n=== Example 5: Update Product ===\n")
    # example_update_product()

    # print("\n=== Example 6: Delete Product ===\n")
    # example_delete_product()
