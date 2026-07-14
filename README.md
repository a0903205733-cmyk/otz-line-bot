# OTZ 車隊 V4.2｜司機獨立帳號

新增：
- 每位司機獨立帳號與密碼
- 密碼使用 bcrypt 雜湊
- JWT 登入，7 天有效
- 管理員建立、停用、啟用司機帳號
- 司機只能操作自己的已接訂單
- 司機可切換待命／載客中／離線
- 接單、開始行程、完成訂單
- 司機端每 5 秒自動更新

部署：
1. Supabase SQL Editor 執行：
   database/upgrade_v4_2.sql
2. Railway 新增：
   JWT_SECRET=至少32字元隨機字串
3. 覆蓋 GitHub 根目錄檔案
4. 等 Railway 重新部署
5. 管理後台建立司機帳號
6. 司機從 /driver/ 使用帳號密碼登入

網址：
- 管理後台：https://你的Railway網址/admin/
- 司機端：https://你的Railway網址/driver/
