import express from "express";
import dotenv from "dotenv";
import { messagingApi } from "@line/bot-sdk";
import {
  listOrders, getOrder, updateOrder,
  listDrivers, createDriver, updateDriver
} from "./db.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8080);

const line = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

app.use(express.json());
app.use("/admin", express.static("public/admin"));
app.use("/driver", express.static("public/driver"));
app.get("/", (_req, res) => res.send("OTZ V2 is running"));

app.get("/api/admin/orders", adminAuth, async (_req, res) => {
  try { res.json(await listOrders()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/drivers", adminAuth, async (_req, res) => {
  try { res.json(await listDrivers()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/drivers", adminAuth, async (req, res) => {
  try {
    const driver = await createDriver({
      name: req.body.name,
      phone: req.body.phone || null,
      plate: req.body.plate || null,
      vehicle: req.body.vehicle || null,
      status: req.body.status || "available"
    });
    res.json(driver);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/orders/:id/assign", adminAuth, async (req, res) => {
  try {
    const order = await getOrder(Number(req.params.id));
    if (order.status !== "pending") {
      return res.status(409).json({ error: "只有待接單訂單可以派單" });
    }

    const driverId = Number(req.body.driverId);
    const drivers = await listDrivers();
    const driver = drivers.find(d => d.id === driverId && d.is_active);
    if (!driver) return res.status(404).json({ error: "找不到司機" });

    const updated = await updateOrder(order.id, {
      status: "accepted",
      assigned_driver_id: driver.id,
      driver_name: driver.name,
      driver_phone: driver.phone,
      driver_plate: driver.plate,
      final_fare: Number(req.body.finalFare || order.estimated_fare),
      accepted_at: new Date().toISOString()
    });

    await updateDriver(driver.id, { status: "busy" });
    await notifyCustomer(updated, "accept");
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/orders/:id/action", adminAuth, async (req, res) => {
  try {
    const order = await getOrder(Number(req.params.id));
    const action = req.body.action;
    let values = {};

    if (action === "start") {
      values = { started_at: new Date().toISOString() };
    } else if (action === "complete") {
      values = { status: "completed", completed_at: new Date().toISOString() };
    } else if (action === "cancel") {
      values = { status: "cancelled", cancelled_at: new Date().toISOString() };
    } else {
      return res.status(400).json({ error: "未知操作" });
    }

    const updated = await updateOrder(order.id, values);

    if (order.assigned_driver_id && ["complete", "cancel"].includes(action)) {
      await updateDriver(order.assigned_driver_id, { status: "available" });
    }

    await notifyCustomer(updated, action);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/driver/orders", driverAuth, async (_req, res) => {
  try {
    const orders = await listOrders();
    res.json(orders.filter(o => ["pending", "accepted"].includes(o.status)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/driver/orders/:id/claim", driverAuth, async (req, res) => {
  try {
    const order = await getOrder(Number(req.params.id));
    if (order.status !== "pending") return res.status(409).json({ error: "訂單已被接走" });

    const drivers = await listDrivers();
    let driver = drivers.find(d => d.name === (process.env.DRIVER_NAME || "陳志輝"));

    if (!driver) {
      driver = await createDriver({
        name: process.env.DRIVER_NAME || "陳志輝",
        phone: process.env.DRIVER_PHONE || null,
        plate: process.env.DRIVER_PLATE || null,
        vehicle: "OTZ 車隊",
        status: "available"
      });
    }

    const updated = await updateOrder(order.id, {
      status: "accepted",
      assigned_driver_id: driver.id,
      driver_name: driver.name,
      driver_phone: driver.phone,
      driver_plate: driver.plate,
      final_fare: order.estimated_fare,
      accepted_at: new Date().toISOString()
    });

    await updateDriver(driver.id, { status: "busy" });
    await notifyCustomer(updated, "accept");
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function notifyCustomer(order, action) {
  if (!order.customer_line_id) return;

  const no = `OTZ-${String(order.id).padStart(6, "0")}`;
  let text = "";

  if (action === "accept") {
    text =
      `✅ 司機已接單\n訂單：${no}\n` +
      `司機：${order.driver_name || "OTZ車隊"}\n` +
      `${order.driver_phone ? `電話：${order.driver_phone}\n` : ""}` +
      `${order.driver_plate ? `車牌：${order.driver_plate}\n` : ""}` +
      `確認車資：${order.final_fare || order.estimated_fare} 元`;
  } else if (action === "start") {
    text = `🚖 行程已開始\n訂單：${no}`;
  } else if (action === "complete") {
    text = `✅ 行程已完成\n訂單：${no}\n感謝使用 OTZ 車隊。`;
  } else if (action === "cancel") {
    text = `訂單 ${no} 已取消。`;
  }

  if (text) {
    await line.pushMessage({
      to: order.customer_line_id,
      messages: [{ type: "text", text }]
    });
  }
}

function adminAuth(req, res, next) {
  const token = req.get("x-admin-token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "未授權" });
  }
  next();
}

function driverAuth(req, res, next) {
  const token = req.get("x-driver-token");
  if (!process.env.DRIVER_TOKEN || token !== process.env.DRIVER_TOKEN) {
    return res.status(401).json({ error: "未授權" });
  }
  next();
}

app.listen(port, "0.0.0.0", () => {
  console.log(`OTZ V2 listening on ${port}`);
});
