# OTZ V2.1 修正版

此版修正 V2 遺漏 `/webhook` 的問題。

部署：
1. Supabase 執行 `database/upgrade_v2.sql`
2. 上傳全部檔案覆蓋 GitHub 根目錄
3. Railway 重新部署
4. Webhook URL 不變
5. 測試 LINE 叫車
