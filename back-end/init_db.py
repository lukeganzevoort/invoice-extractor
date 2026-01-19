# initialize the database

# Import the Case Study Data.xlsx file and print the first 5 rows in each sheet
import pandas as pd

# Read the Excel file
df = pd.read_excel("Case Study Data.xlsx", sheet_name=None)

print(df.keys())

for sheet in df.keys():
    print(sheet)
    print(df[sheet].head())

# convert the data into SQLite datebase
import sqlite3

conn = sqlite3.connect("case_study_data.db")

for sheet in df.keys():
    df[sheet].to_sql(sheet, conn, if_exists="replace", index=False)

conn.close()
