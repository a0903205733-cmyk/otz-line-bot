import express from "express";
import dotenv from "dotenv";
import { middleware, messagingApi } from "@line/bot-sdk";
import { parseRideRequest } from "./rideParser.js";
import { estimateFare } from "./fare.js";
import { getDrivingRoute } from "./googleRoutes.js";
import { createOrder } from "./supabase.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8080);

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

app.get("/", (_req, res) => res.status(200).send("OTZ LINE Bot v3 is running"));

app.post("/webhook", middleware({ channelSecret: process.env.LINE_CHANNEL_SECRET }), async (req, res) => {
  res.status(200).end();

  try {
    await Promise.all(req.body.events.map(handleEvent));
  } catch (error) {
    console.error("Webhook handler error:", error);
  }
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") return;

  const parsed = parseRideRequest(event.message.text.trim());

  if (!parsed.origin || !parsed.destination) {
    return reply(event.replyToken,
      "您好，請提供上車地點、下車地點、時間與人數。\n\n例如：明天早上8點，東港碼頭到左營高鐵，2位");
  }

  try {
    const route = await getDrivingRoute(
      parsed.origin,
      parsed.destination,
      process.env.GOOGLE_MAPS_API_KEY
    );

    const toll = Number(process.env.DEFAULT_TOLL || 0);
    const fare = estimateFare(route.distanceKm, route.durationMinutes, toll);

    const saved = await createOrder({
      customer_line_id: event.source?.userId || null,
      customer_name: null,
      pickup: parsed.origin,
      destination: parsed.destination,
      ride_time: parsed.datetime || null,
      passengers: parsed.passengers,
      distance_km: Number(route.distanceKm.toFixed(2)),
      duration_min: Number(route.durationMinutes.toFixed(2)),
      estimated_fare: fare,
      status: "pending"
    });

    const orderNo = `OTZ-${String(saved.id).padStart(6, "0")}`;

    return reply(event.replyToken,
      `🚖 OTZ車隊｜預估車資\n\n` +
      `訂單編號：${orderNo}\n` +
      `上車：${parsed.origin}\n` +
      `下車：${parsed.destination}\n` +
      `時間：${parsed.datetime || "尚未提供"}\n` +
      `人數：${parsed.passengers || "尚未提供"}\n\n` +
      `距離：約 ${route.distanceKm.toFixed(1)} 公里\n` +
      `車程：約 ${Math.ceil(route.durationMinutes)} 分鐘\n` +
      `高速費：${toll > 0 ? `${toll} 元` : "尚未計入"}\n\n` +
      `💰 預估車資：約 ${fare} 元\n\n` +
      `訂單已建立，狀態：等待司機確認。`);
  } catch (error) {
    console.error("Order flow failed:", error);

    return reply(event.replyToken,
      `已收到您的叫車需求 🚖\n\n` +
      `上車：${parsed.origin}\n` +
      `下車：${parsed.destination}\n\n` +
      `目前無法完成估價或建立訂單，請稍後由司機人工協助。`);
  }
}

async function reply(replyToken, text) {
  await client.replyMessage({
    replyToken,
    messages: [{ type: "text", text }]
  });
}

app.listen(port, "0.0.0.0", () => {
  console.log(`OTZ LINE Bot v3 listening on port ${port}`);
});
