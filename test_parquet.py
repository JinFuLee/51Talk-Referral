import os
import hashlib
import pandas as pd

f1_path = "/Users/felixmacbookairm4/Desktop/ref-ops-engine/input/宣宣_漏斗跟进效率_D-1/泰国运营数据看板__宣宣_漏斗跟进效率（T+1）_20260220_1812.xlsx"
key = f"{f1_path}:None"
hash_key = hashlib.md5(key.encode()).hexdigest()[:12]
cache_path = f"/Users/felixmacbookairm4/Desktop/ref-ops-engine/input/.cache/{hash_key}.parquet"

print("Cache path:", cache_path)
if os.path.exists(cache_path):
    df = pd.read_parquet(cache_path)
    print("Columns:", df.columns.tolist())
    print("Head:")
    print(df.head(10))
else:
    print("Parquet file does not exist!")

f2_path = "/Users/felixmacbookairm4/Desktop/ref-ops-engine/input/宣宣_截面跟进效率_D-1/泰国运营数据看板__宣宣_截面跟进效率_20260220_1816.xlsx"
key2 = f"{f2_path}:None"
hash_key2 = hashlib.md5(key2.encode()).hexdigest()[:12]
cache_path2 = f"/Users/felixmacbookairm4/Desktop/ref-ops-engine/input/.cache/{hash_key2}.parquet"

print("F2 Cache path:", cache_path2)
if os.path.exists(cache_path2):
    df2 = pd.read_parquet(cache_path2)
    print("F2 Columns:", df2.columns.tolist())
    print("F2 Head:")
    print(df2.head(5))

