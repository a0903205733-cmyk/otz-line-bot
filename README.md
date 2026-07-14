# OTZ 車隊 V2

這一版新增：

- 管理員後台 `/admin/`
- 司機端 `/driver/`
- 多司機資料表
- 管理員新增司機
- 管理員派單
- 司機搶單
- 接單後自動通知客人
- 完成／取消後自動通知客人
- 司機狀態 available / busy / offline

部署步驟：

1. 在 Supabase SQL Editor 執行 `database/upgrade_v2.sql`
2. 將全部檔案上傳 GitHub 根目錄
3. Railway 新增：
   - ADMIN_TOKEN
   - DRIVER_TOKEN
   - DRIVER_NAME
   - DRIVER_PHONE
   - DRIVER_PLATE
4. Railway 重新部署
5. 管理後台：
   `https://你的Railway網址/admin/`
6. 司機端：
   `https://你的Railway網址/driver/`

注意：
- 這個 V2 是建立在你目前已成功運作的 LINE Bot 之上。
- 請先備份現有 GitHub 專案，再覆蓋部署。
