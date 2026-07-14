import express from "express";
import dotenv from "dotenv";
import { middleware, messagingApi } from "@line/bot-sdk";
import { parseRideRequest } from "./rideParser.js";
import { estimateFare } from "./fare.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

app.get("/", (_req, res) => {
  res.status(200).send("OTZ LINE Bot is running");
});

app.post("/webhook", middleware(lineConfig), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).end();
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return;
  }

  const text = event.message.text.trim();
  const parsed = parseRideRequest(text);

  if (!parsed.origin || !parsed.destination) {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{
        type: "text",
        text:
          "您好，請用這個格式提供叫車資料：\n" +
          "上車地點 → 下車地點、日期時間、人數\n\n" +
          "例如：明天早上8點，東港碼頭到左營高鐵，2位"
      }],
    });
  }

  // 第一版先使用人工輸入/後續串接 Google Maps。
  // 當 GOOGLE_MAPS_API_KEY 設定完成後，可將此處改成查詢實際距離與時間。
  const distanceKm = null;
  const durationMinutes = null;
  const toll = 0;

  let reply =
    `已收到您的叫車需求 🚖\n\n` +
    `上車：${parsed.origin}\n` +
    `下車：${parsed.destination}\n` +
    `時間：${parsed.datetime || "尚未提供"}\n` +
    `人數：${parsed.passengers || "尚未提供"}\n\n`;

  if (distanceKm !== null && durationMinutes !== null) {
    const fare = estimateFare(distanceKm, durationMinutes, toll);
    reply +=
      `預估距離：${distanceKm.toFixed(1)} 公里\n` +
      `預估時間：${durationMinutes} 分鐘\n` +
      `預估車資：約 ${fare} 元\n\n`;
  } else {
    reply += "系統正在等待司機確認路線與價格。\n\n";
  }

  reply += "此為預約需求，最終價格與是否接單將由司機確認後回覆。";

  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [{ type: "text", text: reply }],
  });
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
