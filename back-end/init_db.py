# initialize the database

# Import the Case Study Data.xlsx file and print the first 5 rows in each sheet
import pandas as pd
from sqlalchemy import create_engine

# Read the Excel file
df = pd.read_excel("Case Study Data.xlsx", sheet_name=None)

print(df.keys())

for sheet in df.keys():
    print(sheet)
    print(df[sheet].head())

# Convert the data into SQLite database using SQLAlchemy
# SQLite connection string format: sqlite:///path/to/database.db
engine = create_engine("sqlite:///case_study_data.db", echo=False)

try:
    for sheet in df.keys():
        df[sheet].to_sql(sheet, engine, if_exists="replace", index=False)
    print("\nDatabase initialization completed successfully!")
except Exception as e:
    print(f"Error initializing database: {e}")
    raise
finally:
    engine.dispose()
