import sys
from pathlib import Path
import pandas as pd
import logging

PROJECT_ROOT = Path("/Users/felixmacbookairm4/Desktop/ref-ops-engine")
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

target_dir = PROJECT_ROOT / "input" / "宣宣_漏斗跟进效率_D-1"
xlsx_files = sorted(
    [f for f in target_dir.glob("*.xlsx") if not f.name.startswith(".")],
    key=lambda p: p.name,
    reverse=True,
)
path = xlsx_files[0] if xlsx_files else None

if path:
    print("Found file:", path)
    raw = pd.read_excel(path, engine="calamine", header=None)
    print("Raw head:")
    print(raw.head(10))
    
    header_row = 3
    for i, row in raw.iterrows():
        if str(row.iloc[0]).strip() == "渠道":
            header_row = i
            break
    print("Header row:", header_row)
    
    df = raw.iloc[header_row:].reset_index(drop=True)
    df.columns = df.iloc[0].tolist()
    df = df.iloc[1:].reset_index(drop=True)
    
    print("Columns:", df.columns)
    valid_mask = (
        df.iloc[:, 0].astype(str).str.strip().ne("") &
        ~df.iloc[:, 0].astype(str).str.strip().isin(("nan", "NaN"))
    )
    df_valid = df[valid_mask].copy()
    print("Valid rows count:", len(df_valid))
    print(df_valid.head(2))
else:
    print("No file found in target dir.")
