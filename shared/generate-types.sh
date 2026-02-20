#!/bin/bash
# 从 FastAPI 自动生成 TypeScript 类型
# 需要后端运行中：http://localhost:8000
curl http://localhost:8000/openapi.json -o shared/openapi.json
npx openapi-typescript shared/openapi.json -o frontend/lib/types.ts
echo "TypeScript 类型已生成到 frontend/lib/types.ts"
