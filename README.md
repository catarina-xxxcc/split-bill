# Split Bill

**Travel together. Settle fairly. In any currency.**

一起旅行，清清楚楚分账。

---

## Why Split Bill · 为什么用它

Splitting expenses across currencies is the part of a trip everyone dreads — someone paid in yen, another in euros, and nobody remembers who owes what. **Split Bill** does the math for you, automatically and offline.

跨币种分账是旅行中最让人头疼的事——有人用日元垫付、有人用欧元垫付，最后谁也说不清谁欠谁。**Split Bill** 帮你自动算清，还能离线使用。

---

## Highlights · 产品亮点

### 1. All currencies, one balance · 全币种，一个账
Record an expense in any currency. Balances auto-convert to your group's base currency at a rate **locked at the moment you record it** — so the number never drifts while you travel.

任何币种记账，余额自动折算到群组主币种，汇率**在记账那一刻锁定**——旅行途中数字不会漂移。

### 2. The fewest transfers · 最少转账
No more A pays B, B pays C, C pays A. Get the **minimum set of transfers** that settles everyone with the least hassle.

告别"A 转 B、B 转 C、C 再转 A"的连环账。自动生成**最少转账方案**，用最少的动作结清所有人。

### 3. Split down to the dish · 精确到一道菜
Had the steak while your friend only ordered water? Item-level splitting puts **every cent on the right person**.

你吃了牛排、朋友只喝了水？菜品级分项把**每一分钱都算到对的人头上**。

### 4. Offline-first · 离线优先
Works on a plane, in a mountain village, or abroad without roaming. Records save locally and **sync the moment you're back online**.

飞机上、山里、没信号的地方都能记。本地保存，**联网后自动同步**。

### 5. Live collaboration · 实时协作
Share a **6-character code**, friends join in seconds, and everyone sees the same numbers **in real time**.

分享一个 **6 位邀请码**，朋友几秒加入，所有人**实时看到同一份账**。

### 6. One-tap share · 一键分享
Send a clean, readable bill summary straight to the group chat.

把一份清晰易读的账单摘要一键发到群里。

---

## Getting Started · 快速开始

```bash
# 1. Install dependencies
npm install

# 2. Configure Supabase (see app/.env.example)
cp app/.env.example app/.env
#    → fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# 3. Create the cloud tables (SQL Editor in Supabase Dashboard)
#    → run supabase/migrations/0001_init.sql, then 0002_collaboration.sql

# 4. Run it
cd app && npm run ios   # or: npm run android
```

Optional: deploy the live FX Edge Function.

```bash
supabase functions deploy get-rates
```

---

## How it works under the hood · 原理

- **Pure calculation engine** (`packages/engine`) — splitting, currency conversion, and debt simplification as tested, dependency-free functions.
- **Local-first storage** — SQLite on device keeps everything available offline.
- **Cloud sync** — Supabase (Postgres + Auth + Realtime) syncs groups across devices and friends.

- **纯计算内核**（`packages/engine`）—— 分账、折算、债务简化，全是可测试、零依赖的纯函数。
- **本地优先存储** —— 设备端 SQLite，离线也能用。
- **云端同步** —— Supabase（Postgres + Auth + Realtime）跨设备、跨好友同步群组。

---

## License · 许可证

MIT
