# OTZ 車隊 LINE 自動接單 Starter

這是第一版可部署的 LINE Messaging API Webhook。

## 已完成
- 接收 LINE 官方帳號文字訊息
- 解析「上車地點 → 下車地點」
- 解析人數與簡單時間
- 自動回覆「已收到需求」
- 內建車資公式：50 + 公里×20 + 分鐘×2 + 高速費

## 尚未完成
- Google Maps 實際距離與時間
- 高速費自動計算
- 司機接單管理頁
- 訂單資料庫
- AI 自然語言解析

## 安全提醒
你先前的截圖已顯示 Channel secret。請先在 LINE Developers 重新產生新的 secret，
不要把 secret 或 access token 貼到聊天或公開圖片。

## 部署前需要
1. LINE Channel Secret
2. LINE Channel Access Token
3. Railway / Render / 其他雲端帳號

## 本機啟動
```bash
npm install
cp .env.example .env
npm start
```

## Webhook
部署後將 LINE Webhook URL 設為：

`https://你的網域/webhook`

並啟用 Webhook。

## 環境變數
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `PORT`
- `BASE_FARE=50`
- `PER_KM=20`
- `PER_MINUTE=2`
- `GOOGLE_MAPS_API_KEY`（下一階段使用）
