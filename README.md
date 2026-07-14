# OTZ 車隊 LINE 訂單系統 v3

新增：
- Google Routes API 自動估價
- Supabase orders 資料表寫入
- 自動產生訂單編號
- 訂單狀態預設 pending

Railway 必填變數：
- LINE_CHANNEL_SECRET
- LINE_CHANNEL_ACCESS_TOKEN
- GOOGLE_MAPS_API_KEY
- SUPABASE_URL
- SUPABASE_SECRET_KEY
- PORT=8080
- BASE_FARE=50
- PER_KM=20
- PER_MINUTE=2
- DEFAULT_TOLL=0

部署：
1. 解壓縮。
2. 把 src、package.json、README.md 上傳到 GitHub 根目錄並覆蓋舊檔。
3. Railway 會自動重新部署；若沒有，手動 Redeploy。
4. Webhook URL 與 Target Port 8080 不變。

測試：
明天早上8點，東港碼頭到左營高鐵，2位

測試成功後，可到 Supabase → Table Editor → orders 查看新增資料。
