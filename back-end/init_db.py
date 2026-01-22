# initialize the database

# Import the Case Study Data.xlsx file and print the first 5 rows in each sheet
import pandas as pd

# First, drop and recreate all tables using the models (ensures correct schema)
# This clears any existing data to avoid duplicate key errors
from db import Base, engine, init_db
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

print("Dropping existing tables (if any)...")
Base.metadata.drop_all(bind=engine)

print("Creating database tables from models...")
init_db()
print("Tables created successfully!")

# Read the Excel file
print("\nReading Excel file...")
# header=0 means use first row as column names (skip it from data)
df = pd.read_excel("Case Study Data.xlsx", sheet_name=None, header=0)

print("\nExcel sheets found:")
for sheet in df.keys():
    print(f"  - {sheet}")
    print(f"    Rows: {len(df[sheet])}")
    print(f"    Columns: {list(df[sheet].columns)}")
    print("    First 5 rows:")
    print(df[sheet].head())
    print()

# Map Excel sheet names to model classes
# This ensures data goes into the correct tables with proper schema
sheet_to_model = {
    "ProductCategory": ProductCategory,
    "ProductSubCategory": ProductSubCategory,
    "Product": Product,
    "SalesTerritory": SalesTerritory,
    "Customers": Customer,
    "IndividualCustomers": IndividualCustomer,
    "StoreCustomers": StoreCustomer,
    "SalesOrderHeader": SalesOrderHeader,
    "SalesOrderDetail": SalesOrderDetail,
}

# Load data into tables
print("Loading data into database...")
try:
    for sheet_name, dataframe in df.items():
        if sheet_name in sheet_to_model:
            print(f"Loading {sheet_name}...")
            # Use if_exists='append' since tables are already created and empty
            dataframe.to_sql(sheet_name, engine, if_exists="append", index=False)
            print(f"  ✓ Loaded {len(dataframe)} rows into {sheet_name}")
        else:
            print(f"  ⚠ Skipping {sheet_name} (no matching model found)")

    print("\n✓ Database initialization completed successfully!")
except Exception as e:
    print(f"\n✗ Error initializing database: {e}")
    raise
finally:
    engine.dispose()
