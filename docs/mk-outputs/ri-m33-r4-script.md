# MK2 产出：check-slide-states.sh 通用化 + CLAUDE.md API 契约防错条目

## 执行摘要

- **D6-C +2 分**：check-slide-states.sh 参数化通用化完成
- **D6-D +1 分**：CLAUDE.md 新增「API 契约防漂移规则」段落

---

## Item C：check-slide-states.sh 通用化

**文件**：`scripts/check-slide-states.sh`

**变更**：
- `SLIDES_DIR` 从硬编码改为 `${1:-frontend/components/slides}`（参数化 + 默认值）
- 新增目录存在性检查（`[ ! -d "$SLIDES_DIR" ]` → exit 1）
- 新增文件存在性检查（`[ -f "$f" ] || continue`，防止 glob 无匹配时遍历字面量 `*.tsx`）
- 输出消息包含目录路径，跨项目使用时明确

**验证结果**：
- `bash scripts/check-slide-states.sh` → ✓（默认参数）
- `bash scripts/check-slide-states.sh frontend/components/slides` → ✓（显式传参）
- `bash scripts/check-slide-states.sh /nonexistent/path` → ✗ 目录不存在（exit 1）

---

## Item D：CLAUDE.md API 契约防漂移规则

**文件**：`CLAUDE.md`（第 155 行后，「数据真实性政策」之后）

**新增段落**：
```
## API 契约防漂移规则
- 前端 useSWR<T> 泛型 T 必须精确匹配后端 response_model 类型
- 后端返回 list[Item] → 前端用 useSWR<Item[]>，禁止 data?.items 包装假设
- 后端返回 dict → 前端用 useSWR<ResponseType>，字段名逐字段匹配后端 Pydantic 模型
- 新建 Slide/组件前先 curl 目标端点确认实际返回格式，不依赖推测
- 字段名 SSoT = 后端 Pydantic 模型（backend/models/*.py），前端 interface 必须跟随
```

**背景**：R3 发现后端返回 `list[]`、前端期望 `{ key: [] }` 包装对象的漂移模式，沉淀为项目级防错条目。
