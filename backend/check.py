import sys
import pandas as pd
import glob
print("Starting script...")
try:
    files = sorted(glob.glob("/Users/felixmacbookairm4/Desktop/ref-ops-engine/input/BI-KPI_当月转介绍打卡率_D-1/*.xlsx"))
    if files:
        df = pd.read_excel(files[-1])
        print("D5 columns:", list(df.columns))
    else:
        print("No D5 files")
except Exception as e:
    print("D5 Error:", e)

try:
    files2 = sorted(glob.glob("/Users/felixmacbookairm4/Desktop/ref-ops-engine/input/BI-北极星指标_当月24H打卡率_D-1/*.xlsx"))
    if files2:
        df2 = pd.read_excel(files2[-1])
        print("D1 columns:", list(df2.columns))
    else:
        print("No D1 files")
except Exception as e:
    print("D1 Error:", e)
