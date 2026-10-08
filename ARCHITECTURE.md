# 技术方案——多币种旅行分账工具

> 版本：v0.1 ｜ 更新：2026-10-08 ｜ 依据：PRD v0.1

---

## 1. 技术选型总览

| 层 | 选型 | 理由（Solo 导向） |
|---|---|---|
| 客户端 | React Native + **Expo** | Expo 免原生构建、支持 EAS 构建 + OTA 热更新，单人多端成本最低 |
| 客户端本地库 | expo-sqlite（或 op-sqlite） | 离线优先的本地持久化 |
| 状态管理 | Zustand | 轻量、心智负担小 |
| 后端 | 无自建后端（直连 Supabase） | Solo 最省：Auth + PostgREST + Edge Function 覆盖全部后端需求 |
| ORM | 无（supabase-js + RLS） | 客户端直读云端表，RLS 保证隔离 |
| 数据库 | PostgreSQL（Supabase 托管） | 免费 tier，PG + Auth + Realtime 一站式 |
| 认证 | Supabase Auth | 免费，省去自建登录 |
| 汇率数据 | Frankfurter（ECB，免费无 key） | 见 §4 关键发现；经 Edge Function 代理 |
| 部署 | Supabase（Auth+DB+Edge Function） | 免费额度 |

> **关键发现**：PRD 确定「入账当日汇率锁定」，因此**不需要分钟级实时汇率**，只需**每日汇率**。Frankfurter（欧洲央行日度数据，免费无 key、无配额限制）完美匹配，成本为零。

---

## 2. 系统架构

```
┌─────────────────────────┐
│  React Native (Expo)    │
│  ┌───────────────────┐  │
│  │ UI + Zustand      │  │
│  ├───────────────────┤  │
│  │ 计算引擎（本地）    │  │  ← 余额/债务简化/折算，离线可算
│  ├───────────────────┤  │
│  │ 同步层（LWW 队列） │  │
│  └─────────┬─────────┘  │
│  expo-sqlite (本地)     │
└────────────┼────────────┘
             │ HTTPS (REST)
┌────────────▼────────────┐
│  Fastify 后端            │
│  ├─ REST API             │
│  ├─ 同步接口 (push/pull) │
│  ├─ 汇率服务（每日抓取） │
│  └─ Prisma               │
└────────────┬────────────┘
             │
      ┌──────▼──────┐
      │ PostgreSQL   │
      │ (Neon 托管)  │
      └─────────────┘
```

**设计原则**：计算逻辑（分账、折算、债务简化）放在**客户端本地**，保证离线可用；服务端只做**存储 + 同步 + 汇率抓取**。这样"旅行中没网"也能完整记账和看结果。

---

## 3. 数据模型（SQL）

```sql
-- 用户
users(id UUID PK, email TEXT UNIQUE, name TEXT, avatar TEXT, created_at TIMESTAMPTZ)

-- 群组（主币种）
groups(id UUID PK, name TEXT, base_currency CHAR(3), created_by UUID, created_at TIMESTAMPTZ)

-- 群组成员
group_members(id UUID PK, group_id UUID FK, user_id UUID FK, joined_at TIMESTAMPTZ,
              UNIQUE(group_id, user_id))

-- 支出（一笔账单）
expenses(
  id UUID PK, group_id UUID FK, payer_id UUID FK,
  amount_cents BIGINT,          -- 原始币种最小单位整数
  currency CHAR(3),             -- 原始币种
  rate NUMERIC(18,10),          -- 入账锁定汇率（原始币种 → 主币种）
  base_amount_cents BIGINT,     -- 折算到主币种后的金额（快照，避免重算漂移）
  split_type TEXT,              -- equal | by_member | by_ratio | by_share
  category TEXT, note TEXT,
  updated_at TIMESTAMPTZ,       -- LWW 时间戳
  deleted BOOLEAN DEFAULT FALSE -- 软删除
)

-- 分摊明细（含 itemization）
expense_shares(
  id UUID PK, expense_id UUID FK, user_id UUID FK,
  item_name TEXT NULL,          -- 菜品/明细项名（itemization 用）
  share_amount_cents BIGINT,    -- 该成员分摊（原始币种）
  ratio NUMERIC NULL, share_num INT NULL, share_den INT NULL,
  updated_at TIMESTAMPTZ
)

-- 还款/结算
settlements(
  id UUID PK, group_id UUID FK,
  from_user UUID, to_user UUID,
  amount_cents BIGINT, currency CHAR(3),
  status TEXT,                  -- pending | paid | partial
  updated_at TIMESTAMPTZ
)

-- 每日汇率缓存（服务端抓取）
exchange_rates(
  base CHAR(3), target CHAR(3), rate NUMERIC(18,10),
  rate_date DATE, updated_at TIMESTAMPTZ,
  PRIMARY KEY(base, target, rate_date)
)
```

**要点**：
- 金额一律用**最小单位整数（cents）**存储，杜绝浮点误差。
- `expenses.rate` + `base_amount_cents` 在**入账时一次性锁定**，后续余额计算只读快照，不重算汇率（对应 PRD 方案 A）。
- `updated_at` 作为 LWW 冲突裁决依据。

---

## 4. 核心模块设计

### 4.1 汇率服务
- 每日定时任务（cron）从 Frankfurter 拉取主币种对全部用到的币种汇率。
- 写入 `exchange_rates`，按 (base, target, rate_date) 幂等。
- 客户端入账时：向服务端取「当日」汇率；若离线，客户端本地缓存上次汇率并**标记「汇率可能滞后」**（对应 PRD 规则 4）。
- 无需实时推送，日度即可。

### 4.2 分账计算引擎（客户端）
输入一笔 expense，产出各成员 share：

```
equal:    share = amount / n（余数分给 payer，保证总数相等）
by_member: 按成员指定金额
by_ratio:  amount * ratio_i / Σratio
by_share:  amount * num_i / den_i
```

- 所有分摊在**原始币种**内计算并保留整数分；余数按固定规则（分给付款人或最后一个成员）处理，确保**Σshare = amount**。
- itemization：`expense_shares` 中带 `item_name` 的记录单独归集，其余按 equal 分摊到剩余参与人；明细之和需等于总额（校验）。

### 4.3 余额计算
- 群组内每个成员的净额 `net_i = 已付（折算到主币种） - 应摊（折算到主币种）`。
- 使用 `base_amount_cents` 快照，全部折算到主币种后**统一舍入**（对应 PRD 规则 3）。

### 4.4 债务简化（最少转账方案）——贪心算法
1. 计算各成员净额 `net`（正=应收，负=应付）。
2. 应收方入最大堆，应付方入最小堆（按绝对值）。
3. 每次取最大应收 `maxCr` 与最大应付 `maxDr`：
   - 转账额 `t = min(maxCr, -maxDr)`，方向 应付方→应收方。
   - 减去 `t`，将剩余非零者放回堆。
4. 重复直至堆空。

```ts
function simplifyDebts(net: Map<string, number>): Transfer[] {
  const cr = []; // 应收
  const dr = []; // 应付
  for (const [u, v] of net) v > 0 ? cr.push([u, v]) : v < 0 ? dr.push([u, -v]) : 0;
  cr.sort((a, b) => b[1] - a[1]);
  dr.sort((a, b) => b[1] - a[1]);
  const out: Transfer[] = [];
  let i = 0, j = 0;
  while (i < cr.length && j < dr.length) {
    const t = Math.min(cr[i][1], dr[j][1]);
    out.push({ from: dr[j][0], to: cr[i][0], amount: t });
    cr[i][1] -= t; dr[j][1] -= t;
    if (cr[i][1] < 0.01) i++;
    if (dr[j][1] < 0.01) j++;
  }
  return out;
}
```

- 转账笔数 ≤ n−1；贪心在实践中接近最优，solo 阶段足够（严格最优需子集和 DP，后续可升级）。

### 4.5 离线同步（LWW + 冲突留痕）
- 本地 sqlite 为**事实源**；每笔写操作带 `updated_at`（服务端统一授时，客户端离线用本地时钟）。
- 同步采用 **push/pull 增量**：客户端上传本地变更，拉取远端变更。
- 冲突裁决：同一记录以 `updated_at` 最新者胜；被覆盖的旧版本写入 `conflicts` 表留痕，供用户复核（对应 PRD 规则 2）。
- 因记账是 append-only 为主，冲突概率低，LWW 已足够。

---

## 5. API 设计（REST）

```
POST   /auth/login
POST   /groups                        创建群组
GET    /groups/:id                    群组详情+成员
POST   /groups/:id/members            邀请成员
GET    /groups/:id/expenses           拉取支出列表
POST   /groups/:id/expenses           新增支出
PATCH  /expenses/:id                  编辑支出
DELETE /expenses/:id                  删除（软删）
POST   /groups/:id/settlements        记录还款/标记已还
GET    /rates?base=USD&date=2026-10-08 获取锁定汇率
POST   /sync                          增量同步（push/pull 合并）
```

---

## 6. 目录结构建议

```
split/
├── packages/engine/  # 纯计算内核（分账/折算/债务简化，可单测）
├── app/              # React Native (Expo)
│   └── src/
│       ├── db/       # expo-sqlite 本地缓存
│       ├── sync/     # 云端同步（pull/push）
│       ├── auth/     # Supabase Auth
│       ├── domain/   # 汇率 + 余额/结算编排
│       ├── screens/
│       └── lib/      # supabase client
├── supabase/
│   ├── migrations/   # 云端 schema + RLS
│   └── functions/    # get-rates Edge Function
└── PRD.md
```

---

## 7. 技术决策（已确定，全部免费）

1. **认证**：Supabase Auth（免费 tier，省去自建登录/密码找回）。
2. **数据库托管**：Supabase（PG + Auth + RLS 一站式，免费 tier）。
3. **导航**：Zustand 轻量路由（手动渲染，免 Expo Router 样板）。
4. **后端**：不自建 Fastify，直连 Supabase（PostgREST）+ Edge Function（汇率）。

---

## 8. 里程碑

1. **M1 纯计算内核** ✅ 分账 + 折算 + 债务简化，纯 TS 函数 + 22 单测。
2. **M2 单机版** ✅ RN + 本地 sqlite，单人记账跑通全流程。
3. **M3 联网版** ✅ Supabase Auth + 云端同步（pull/push）+ 汇率 Edge Function。
4. **M4 打磨** ✅ 4 种分摊方式 + itemization 交互 + 账单分享。
