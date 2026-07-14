# OTZ 車隊 V3 正式營運版

這是一個乾淨、單一版本的專案，包含：

- LINE Webhook
- Google Routes API
- Supabase 訂單資料庫
- LINE Flex Message
- 管理後台
- 司機端
- 派單、接單、完成、取消
- LINE 自動通知客人
- 黑金 OTZ 介面
- 搜尋、篩選、今日營收、自動更新

部署順序：

1. Supabase 執行：
   `database/upgrade_v3.sql`
2. GitHub 根目錄只保留：
   - package.json
   - src/
   - public/
   - database/
   - README.md
   - .env.example
3. Railway 重新部署
4. Webhook：
   `https://你的Railway網址/webhook`
5. 管理後台：
   `https://你的Railway網址/admin/`
6. 司機端：
   `https://你的Railway網址/driver/`

建議刪除 GitHub 根目錄舊檔：
- server.js
- parser.js
- fare.js
- index.html
- otz-line-bot-starter/
- 其他重複版本資料夾
