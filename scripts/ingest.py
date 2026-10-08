import os
import pandas as pd

def check_datasets():
    datasets = {
        "Dataset - Train.csv": "SXSW Tech Sentiment Dataset",
        "Tweets.csv": "US Airline Twitter Sentiment Dataset",
        "Bigtech - 20-09-2020 till 13-10-2020.csv": "Big Tech Sentiment & Polarity Dataset"
    }
    
    print("==================================================")
    print("DATASET INGESTION & VALIDATION CHECK")
    print("==================================================")
    
    all_present = True
    for filename, desc in datasets.items():
        if os.path.exists(filename):
            size_mb = os.path.getsize(filename) / (1024 * 1024)
            df_head = pd.read_csv(filename, nrows=3)
            print(f"[OK] {filename}")
            print(f"     Description: {desc}")
            print(f"     Size: {size_mb:.2f} MB")
            print(f"     Columns: {list(df_head.columns)}\n")
        else:
            print(f"[MISSING] {filename} ({desc})")
            all_present = False
            
    if all_present:
        print("All raw datasets verified and ready for ETL pipeline.")
    else:
        print("Warning: One or more datasets are missing!")

if __name__ == "__main__":
    check_datasets()
