# OTZ 車隊一次完成最終版

包含：
- LINE 自動接收叫車
- 自動解析上下車地點、時間、人數
- Google Routes API 自動算距離與車程
- 計價：起跳 60、每公里 20、每分鐘 2、高速費預估、夜間加成 0
- 服務範圍：東港、潮州、林邊、佳冬、枋寮
- LINE 確認叫車／取消
- Supabase 訂單資料庫
- 網頁管理後台
- 管理員接單、修改最終車資、完成、取消
- 接單後自動通知客人
- Google Maps 導航

安裝：
1. Supabase SQL Editor 執行 `database/schema.sql`
2. 將全部檔案上傳到 GitHub 根目錄
3. Railway 加入 `.env.example` 所列環境變數
4. Railway Target Port 設為 8080
5. LINE Webhook 保持 `https://你的Railway網址/webhook`
6. 管理後台：`https://你的Railway網址/admin/`

注意：
- `database/schema.sql` 不會刪除舊表，只會補建欄位結構所需的新表。
- 如舊 orders 表欄位不足，建議先備份後再手動調整。
- 這是可試營運的完整 MVP；不包含多司機帳號、即時 GPS、線上付款與 ETC 精準自動計費。
