# OTZ 車隊 LINE 自動估價 v2

新增 Google Routes API，自動取得距離、車程並估價。

Railway 需要：
- LINE_CHANNEL_SECRET
- LINE_CHANNEL_ACCESS_TOKEN
- GOOGLE_MAPS_API_KEY
- PORT=8080
- BASE_FARE=50
- PER_KM=20
- PER_MINUTE=2
- DEFAULT_TOLL=0

部署：
1. 將檔案上傳到 GitHub 儲存庫根目錄。
2. Railway 重新部署。
3. 公開網域 Target Port 保持 8080。
4. LINE Webhook URL 不變：`https://你的網址/webhook`

測試：
`明天早上8點，東港碼頭到左營高鐵，2位`

注意：目前高速費不會自動判斷，預設為 0；後續可加入人工確認或國道路線費率表。
