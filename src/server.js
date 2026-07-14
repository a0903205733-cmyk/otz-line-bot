import express from "express";
import dotenv from "dotenv";
import { middleware, messagingApi } from "@line/bot-sdk";
import { parseRideRequest } from "./parser.js";
import { getRoute } from "./maps.js";
import { calculateFare } from "./fare.js";
import { createOrder, getOrder, listOrders, updateOrder } from "./db.js";
import { quoteFlex, orderNo } from "./messages.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8080);
const line = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

app.get("/", (_req, res) => res.send("OTZ FINAL is running"));
app.use("/admin", express.static("public"));

app.get("/api/orders", adminAuth, async (_req, res) => {
  try { res.json(await listOrders()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/orders/:id", express.json(), adminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = await getOrder(id);
    const action = req.body.action;
    let values = {};

    if (action === "accept") {
      if (current.status !== "pending") return res.status(409).json({ error: "訂單不是待接單" });
      values = {
        status: "accepted",
        driver_name: process.env.DRIVER_NAME || "OTZ車隊",
        driver_phone: process.env.DRIVER_PHONE || "",
        driver_plate: process.env.DRIVER_PLATE || "",
        final_fare: Number(req.body.finalFare || current.estimated_fare),
        accepted_at: new Date().toISOString()
      };
    } else if (action === "complete") {
      values = { status: "completed", completed_at: new Date().toISOString() };
    } else if (action === "cancel") {
      values = { status: "cancelled", cancelled_at: new Date().toISOString() };
    } else {
      return res.status(400).json({ error: "未知操作" });
    }

    const updated = await updateOrder(id, values);
    await notify(updated, action);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/webhook", middleware({ channelSecret: process.env.LINE_CHANNEL_SECRET }), async (req, res) => {
  res.status(200).end();
  try { await Promise.all(req.body.events.map(handleEvent)); }
  catch (e) { console.error(e); }
});

async function handleEvent(event) {
  if (event.type === "message" && event.message.type === "text") return handleText(event);
  if (event.type === "postback") return handlePostback(event);
}

async function handleText(event) {
  const p = parseRideRequest(event.message.text);
  if (!p.pickup || !p.destination) {
    return reply(event.replyToken, "請輸入：上車地點到下車地點、時間、人數\n例如：明天早上8點，東港碼頭到左營高鐵，2位");
  }

  try {
    const route = await getRoute(p.pickup, p.destination, process.env.GOOGLE_MAPS_API_KEY);
    const toll = Number(process.env.DEFAULT_TOLL || 0);
    const fare = calculateFare(route.distanceKm, route.durationMin, toll);
    const areas = String(process.env.SERVICE_AREAS || "東港,潮州,林邊,佳冬,枋寮").split(",");
    const inServiceArea = areas.some(a => `${p.pickup} ${p.destination}`.includes(a.trim()));

    const order = await createOrder({
      customer_line_id: event.source?.userId || null,
      pickup: p.pickup,
      destination: p.destination,
      ride_time: p.rideTime || null,
      passengers: p.passengers,
      distance_km: Number(route.distanceKm.toFixed(2)),
      duration_min: Number(route.durationMin.toFixed(2)),
      base_fare: fare.baseFare,
      mileage_fare: fare.mileageFare,
      time_fare: fare.timeFare,
      toll,
      night_surcharge: fare.nightSurcharge,
      estimated_fare: fare.estimatedFare,
      in_service_area: inServiceArea,
      status: "awaiting_customer"
    });

    return line.replyMessage({ replyToken: event.replyToken, messages: [quoteFlex(order)] });
  } catch (e) {
    console.error(e);
    return reply(event.replyToken, "目前無法完成估價，請確認地點是否完整，或稍後由司機人工協助。");
  }
}

async function handlePostback(event) {
  const q = new URLSearchParams(event.postback.data);
  const action = q.get("action");
  const id = Number(q.get("id"));
  const order = await getOrder(id);

  if (order.customer_line_id && order.customer_line_id !== event.source?.userId) {
    return reply(event.replyToken, "這不是您的訂單。");
  }

  if (action === "confirm") {
    if (order.status !== "awaiting_customer") return reply(event.replyToken, "這筆訂單已處理。");
    await updateOrder(id, { status: "pending" });
    return reply(event.replyToken, `✅ 叫車已確認\n訂單：${orderNo(id)}\n等待管理員接單。`);
  }

  if (action === "cancel") {
    await updateOrder(id, { status: "cancelled", cancelled_at: new Date().toISOString() });
    return reply(event.replyToken, `已取消訂單 ${orderNo(id)}。`);
  }
}

async function notify(o, action) {
  if (!o.customer_line_id) return;
  let text = "";

  if (action === "accept") {
    text = `✅ 司機已接單\n訂單：${orderNo(o.id)}\n司機：${o.driver_name || "OTZ車隊"}\n` +
      `${o.driver_phone ? `電話：${o.driver_phone}\n` : ""}` +
      `${o.driver_plate ? `車牌：${o.driver_plate}\n` : ""}` +
      `確認車資：${o.final_fare || o.estimated_fare} 元`;
  } else if (action === "complete") {
    text = `✅ 行程完成\n訂單：${orderNo(o.id)}\n感謝使用 OTZ 車隊。`;
  } else if (action === "cancel") {
    text = `訂單 ${orderNo(o.id)} 已取消。`;
  }

  if (text) {
    await line.pushMessage({ to: o.customer_line_id, messages: [{ type: "text", text }] });
  }
}

function reply(replyToken, text) {
  return line.replyMessage({ replyToken, messages: [{ type: "text", text }] });
}

function adminAuth(req, res, next) {
  const token = req.get("x-admin-token") || req.query.token;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "未授權" });
  }
  next();
}

app.listen(port, "0.0.0.0", () => console.log(`OTZ FINAL listening on ${port}`));
