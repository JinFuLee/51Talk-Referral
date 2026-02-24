import pandas as pd
f = "/Users/felixmacbookairm4/Desktop/ref-ops-engine/input/宣宣_漏斗跟进效率_D-1/泰国运营数据看板__宣宣_漏斗跟进效率（T+1）_20260220_1812.xlsx"
df = pd.read_excel(f, engine='calamine', header=None)
print("Raw columns:", " | ".join(map(str, df.iloc[3].tolist())))
print(df.head(6))
