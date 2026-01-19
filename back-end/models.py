"""
SQLAlchemy ORM models for the invoice extractor database.
All models inherit from Base defined in db.py.
"""

from datetime import datetime
from typing import Optional

from db import Base
from sqlalchemy import BigInteger, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class ProductCategory(Base):
    """Product category model."""

    __tablename__ = "ProductCategory"

    ProductCategoryID: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    Name: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    subcategories: Mapped[list["ProductSubCategory"]] = relationship(
        "ProductSubCategory", back_populates="category"
    )


class ProductSubCategory(Base):
    """Product subcategory model."""

    __tablename__ = "ProductSubCategory"

    ProductSubcategoryID: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    ProductCategoryID: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("ProductCategory.ProductCategoryID")
    )
    Name: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    category: Mapped["ProductCategory"] = relationship(
        "ProductCategory", back_populates="subcategories"
    )
    products: Mapped[list["Product"]] = relationship(
        "Product", back_populates="subcategory"
    )


class Product(Base):
    """Product model."""

    __tablename__ = "Product"

    ProductID: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    Name: Mapped[Optional[str]] = mapped_column(Text)
    ProductNumber: Mapped[Optional[str]] = mapped_column(Text)
    MakeFlag: Mapped[Optional[bool]] = mapped_column(Boolean)
    FinishedGoodsFlag: Mapped[Optional[bool]] = mapped_column(Boolean)
    Color: Mapped[Optional[str]] = mapped_column(Text)
    StandardCost: Mapped[Optional[float]] = mapped_column(Float)
    ListPrice: Mapped[Optional[float]] = mapped_column(Float)
    Size: Mapped[Optional[str]] = mapped_column(Text)
    ProductLine: Mapped[Optional[str]] = mapped_column(Text)
    Class: Mapped[Optional[str]] = mapped_column(Text)
    Style: Mapped[Optional[str]] = mapped_column(Text)
    ProductSubcategoryID: Mapped[Optional[float]] = mapped_column(
        Float, ForeignKey("ProductSubCategory.ProductSubcategoryID")
    )
    ProductModelID: Mapped[Optional[float]] = mapped_column(Float)

    # Relationships
    subcategory: Mapped[Optional["ProductSubCategory"]] = relationship(
        "ProductSubCategory", back_populates="products"
    )
    order_details: Mapped[list["SalesOrderDetail"]] = relationship(
        "SalesOrderDetail", back_populates="product"
    )


class SalesTerritory(Base):
    """Sales territory model."""

    __tablename__ = "SalesTerritory"

    TerritoryID: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    Name: Mapped[Optional[str]] = mapped_column(Text)
    CountryRegionCode: Mapped[Optional[str]] = mapped_column(Text)
    Group: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    sales_orders: Mapped[list["SalesOrderHeader"]] = relationship(
        "SalesOrderHeader", back_populates="territory"
    )
    customers: Mapped[list["Customer"]] = relationship(
        "Customer", back_populates="territory"
    )


class Customer(Base):
    """Customer model."""

    __tablename__ = "Customers"

    CustomerID: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    PersonID: Mapped[Optional[float]] = mapped_column(
        Float
    )  # Links to IndividualCustomers.BusinessEntityID
    StoreID: Mapped[Optional[float]] = mapped_column(
        Float
    )  # Links to StoreCustomers.BusinessEntityID
    TerritoryID: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("SalesTerritory.TerritoryID")
    )
    AccountNumber: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    territory: Mapped["SalesTerritory"] = relationship(
        "SalesTerritory", back_populates="customers"
    )
    sales_orders: Mapped[list["SalesOrderHeader"]] = relationship(
        "SalesOrderHeader", back_populates="customer"
    )

    # Note: IndividualCustomer and StoreCustomer relationships are implicit
    # based on PersonID/BusinessEntityID and StoreID/BusinessEntityID matching
    # Use manual joins or hybrid properties for these relationships


class IndividualCustomer(Base):
    """Individual customer details model."""

    __tablename__ = "IndividualCustomers"

    BusinessEntityID: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    FirstName: Mapped[Optional[str]] = mapped_column(Text)
    MiddleName: Mapped[Optional[str]] = mapped_column(Text)
    LastName: Mapped[Optional[str]] = mapped_column(Text)
    AddressType: Mapped[Optional[str]] = mapped_column(Text)
    AddressLine1: Mapped[Optional[str]] = mapped_column(Text)
    AddressLine2: Mapped[Optional[str]] = mapped_column(Text)
    City: Mapped[Optional[str]] = mapped_column(Text)
    StateProvinceName: Mapped[Optional[str]] = mapped_column(Text)
    PostalCode: Mapped[Optional[str]] = mapped_column(Text)
    CountryRegionName: Mapped[Optional[str]] = mapped_column(Text)

    # Note: Relationship to Customer is implicit via
    # BusinessEntityID = Customer.PersonID
    # Query manually:
    # session.query(Customer).filter(
    #     Customer.PersonID == IndividualCustomer.BusinessEntityID
    # )


class StoreCustomer(Base):
    """Store customer details model."""

    __tablename__ = "StoreCustomers"

    BusinessEntityID: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    Name: Mapped[Optional[str]] = mapped_column(Text)
    AddressType: Mapped[Optional[str]] = mapped_column(Text)
    AddressLine1: Mapped[Optional[str]] = mapped_column(Text)
    AddressLine2: Mapped[Optional[str]] = mapped_column(Text)
    City: Mapped[Optional[str]] = mapped_column(Text)
    StateProvinceName: Mapped[Optional[str]] = mapped_column(Text)
    PostalCode: Mapped[Optional[str]] = mapped_column(Text)
    CountryRegionName: Mapped[Optional[str]] = mapped_column(Text)

    # Note: Relationship to Customer is implicit via
    # BusinessEntityID = Customer.StoreID
    # Query manually:
    # session.query(Customer).filter(
    #     Customer.StoreID == StoreCustomer.BusinessEntityID
    # )


class SalesOrderHeader(Base):
    """Sales order header model."""

    __tablename__ = "SalesOrderHeader"

    SalesOrderID: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    RevisionNumber: Mapped[Optional[int]] = mapped_column(BigInteger)
    OrderDate: Mapped[Optional[datetime]] = mapped_column(DateTime)
    DueDate: Mapped[Optional[datetime]] = mapped_column(DateTime)
    ShipDate: Mapped[Optional[datetime]] = mapped_column(DateTime)
    Status: Mapped[Optional[int]] = mapped_column(BigInteger)
    OnlineOrderFlag: Mapped[Optional[bool]] = mapped_column(Boolean)
    SalesOrderNumber: Mapped[Optional[str]] = mapped_column(Text)
    PurchaseOrderNumber: Mapped[Optional[str]] = mapped_column(Text)
    AccountNumber: Mapped[Optional[str]] = mapped_column(Text)
    CustomerID: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("Customers.CustomerID")
    )
    SalesPersonID: Mapped[Optional[float]] = mapped_column(Float)
    TerritoryID: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("SalesTerritory.TerritoryID")
    )
    BillToAddressID: Mapped[Optional[int]] = mapped_column(BigInteger)
    ShipToAddressID: Mapped[Optional[int]] = mapped_column(BigInteger)
    ShipMethodID: Mapped[Optional[int]] = mapped_column(BigInteger)
    CreditCardID: Mapped[Optional[float]] = mapped_column(Float)
    CreditCardApprovalCode: Mapped[Optional[str]] = mapped_column(Text)
    CurrencyRateID: Mapped[Optional[float]] = mapped_column(Float)
    SubTotal: Mapped[Optional[float]] = mapped_column(Float)
    TaxAmt: Mapped[Optional[float]] = mapped_column(Float)
    Freight: Mapped[Optional[float]] = mapped_column(Float)
    TotalDue: Mapped[Optional[float]] = mapped_column(Float)

    # Relationships
    customer: Mapped["Customer"] = relationship(
        "Customer", back_populates="sales_orders"
    )
    territory: Mapped["SalesTerritory"] = relationship(
        "SalesTerritory", back_populates="sales_orders"
    )
    order_details: Mapped[list["SalesOrderDetail"]] = relationship(
        "SalesOrderDetail", back_populates="order_header"
    )


class SalesOrderDetail(Base):
    """Sales order detail (line items) model."""

    __tablename__ = "SalesOrderDetail"

    SalesOrderID: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("SalesOrderHeader.SalesOrderID")
    )
    SalesOrderDetailID: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    CarrierTrackingNumber: Mapped[Optional[str]] = mapped_column(Text)
    OrderQty: Mapped[Optional[int]] = mapped_column(BigInteger)
    ProductID: Mapped[int] = mapped_column(BigInteger, ForeignKey("Product.ProductID"))
    SpecialOfferID: Mapped[Optional[int]] = mapped_column(BigInteger)
    UnitPrice: Mapped[Optional[float]] = mapped_column(Float)
    UnitPriceDiscount: Mapped[Optional[float]] = mapped_column(Float)
    LineTotal: Mapped[Optional[float]] = mapped_column(Float)

    # Relationships
    order_header: Mapped["SalesOrderHeader"] = relationship(
        "SalesOrderHeader", back_populates="order_details"
    )
    product: Mapped["Product"] = relationship("Product", back_populates="order_details")
