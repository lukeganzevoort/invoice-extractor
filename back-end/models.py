"""
SQLAlchemy ORM models for the invoice extractor database.
All models inherit from Base defined in db.py.
"""

from db import Base
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import relationship


class ProductCategory(Base):
    """Product category model."""

    __tablename__ = "ProductCategory"

    ProductCategoryID = Column(BigInteger, primary_key=True)
    Name = Column(Text)

    # Relationships
    subcategories = relationship("ProductSubCategory", back_populates="category")


class ProductSubCategory(Base):
    """Product subcategory model."""

    __tablename__ = "ProductSubCategory"

    ProductSubcategoryID = Column(BigInteger, primary_key=True)
    ProductCategoryID = Column(
        BigInteger, ForeignKey("ProductCategory.ProductCategoryID")
    )
    Name = Column(Text)

    # Relationships
    category = relationship("ProductCategory", back_populates="subcategories")
    products = relationship("Product", back_populates="subcategory")


class Product(Base):
    """Product model."""

    __tablename__ = "Product"

    ProductID = Column(BigInteger, primary_key=True)
    Name = Column(Text)
    ProductNumber = Column(Text)
    MakeFlag = Column(Boolean)
    FinishedGoodsFlag = Column(Boolean)
    Color = Column(Text)
    StandardCost = Column(Float)
    ListPrice = Column(Float)
    Size = Column(Text)
    ProductLine = Column(Text)
    Class = Column(Text)
    Style = Column(Text)
    ProductSubcategoryID = Column(
        Float, ForeignKey("ProductSubCategory.ProductSubcategoryID")
    )
    ProductModelID = Column(Float)

    # Relationships
    subcategory = relationship("ProductSubCategory", back_populates="products")
    order_details = relationship("SalesOrderDetail", back_populates="product")


class SalesTerritory(Base):
    """Sales territory model."""

    __tablename__ = "SalesTerritory"

    TerritoryID = Column(BigInteger, primary_key=True)
    Name = Column(Text)
    CountryRegionCode = Column(Text)
    Group = Column(Text)

    # Relationships
    sales_orders = relationship("SalesOrderHeader", back_populates="territory")
    customers = relationship("Customer", back_populates="territory")


class Customer(Base):
    """Customer model."""

    __tablename__ = "Customers"

    CustomerID = Column(BigInteger, primary_key=True)
    PersonID = Column(Float)  # Links to IndividualCustomers.BusinessEntityID
    StoreID = Column(Float)  # Links to StoreCustomers.BusinessEntityID
    TerritoryID = Column(BigInteger, ForeignKey("SalesTerritory.TerritoryID"))
    AccountNumber = Column(Text)

    # Relationships
    territory = relationship("SalesTerritory", back_populates="customers")
    sales_orders = relationship("SalesOrderHeader", back_populates="customer")

    # Note: IndividualCustomer and StoreCustomer relationships are implicit
    # based on PersonID/BusinessEntityID and StoreID/BusinessEntityID matching
    # Use manual joins or hybrid properties for these relationships


class IndividualCustomer(Base):
    """Individual customer details model."""

    __tablename__ = "IndividualCustomers"

    BusinessEntityID = Column(BigInteger, primary_key=True)
    FirstName = Column(Text)
    MiddleName = Column(Text)
    LastName = Column(Text)
    AddressType = Column(Text)
    AddressLine1 = Column(Text)
    AddressLine2 = Column(Text)
    City = Column(Text)
    StateProvinceName = Column(Text)
    PostalCode = Column(Text)
    CountryRegionName = Column(Text)

    # Note: Relationship to Customer is implicit via BusinessEntityID = Customer.PersonID
    # Query manually: session.query(Customer).filter(Customer.PersonID == IndividualCustomer.BusinessEntityID)


class StoreCustomer(Base):
    """Store customer details model."""

    __tablename__ = "StoreCustomers"

    BusinessEntityID = Column(BigInteger, primary_key=True)
    Name = Column(Text)
    AddressType = Column(Text)
    AddressLine1 = Column(Text)
    AddressLine2 = Column(Text)
    City = Column(Text)
    StateProvinceName = Column(Text)
    PostalCode = Column(Text)
    CountryRegionName = Column(Text)

    # Note: Relationship to Customer is implicit via BusinessEntityID = Customer.StoreID
    # Query manually: session.query(Customer).filter(Customer.StoreID == StoreCustomer.BusinessEntityID)


class SalesOrderHeader(Base):
    """Sales order header model."""

    __tablename__ = "SalesOrderHeader"

    SalesOrderID = Column(BigInteger, primary_key=True)
    RevisionNumber = Column(BigInteger)
    OrderDate = Column(DateTime)
    DueDate = Column(DateTime)
    ShipDate = Column(DateTime)
    Status = Column(BigInteger)
    OnlineOrderFlag = Column(Boolean)
    SalesOrderNumber = Column(Text)
    PurchaseOrderNumber = Column(Text)
    AccountNumber = Column(Text)
    CustomerID = Column(BigInteger, ForeignKey("Customers.CustomerID"))
    SalesPersonID = Column(Float)
    TerritoryID = Column(BigInteger, ForeignKey("SalesTerritory.TerritoryID"))
    BillToAddressID = Column(BigInteger)
    ShipToAddressID = Column(BigInteger)
    ShipMethodID = Column(BigInteger)
    CreditCardID = Column(Float)
    CreditCardApprovalCode = Column(Text)
    CurrencyRateID = Column(Float)
    SubTotal = Column(Float)
    TaxAmt = Column(Float)
    Freight = Column(Float)
    TotalDue = Column(Float)

    # Relationships
    customer = relationship("Customer", back_populates="sales_orders")
    territory = relationship("SalesTerritory", back_populates="sales_orders")
    order_details = relationship("SalesOrderDetail", back_populates="order_header")


class SalesOrderDetail(Base):
    """Sales order detail (line items) model."""

    __tablename__ = "SalesOrderDetail"

    SalesOrderID = Column(
        BigInteger, ForeignKey("SalesOrderHeader.SalesOrderID"), primary_key=True
    )
    SalesOrderDetailID = Column(BigInteger, primary_key=True)
    CarrierTrackingNumber = Column(Text)
    OrderQty = Column(BigInteger)
    ProductID = Column(BigInteger, ForeignKey("Product.ProductID"))
    SpecialOfferID = Column(BigInteger)
    UnitPrice = Column(Float)
    UnitPriceDiscount = Column(Float)
    LineTotal = Column(Float)

    # Relationships
    order_header = relationship("SalesOrderHeader", back_populates="order_details")
    product = relationship("Product", back_populates="order_details")
