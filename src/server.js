import express from "express";
import dotenv from "dotenv";
import { middleware, messagingApi } from "@line/bot-sdk";
import { parseRideRequest } from "./parser.js";
import { getRoute } from "./maps.js";
import { calculateFare } from "./fare.js";
import { quoteFlex, orderNo } from "./messages.js";
import { createOrder,listOrders,getOrder,updateOrder,listDrivers,createDriver,updateDriver } from "./db.js";

dotenv.config();
const app=express();
const port=Number(process.env.PORT||8080);
const line=new messagingApi.MessagingApiClient({channelAccessToken:process.env.LINE_CHANNEL_ACCESS_TOKEN});

app.get("/",(_req,res)=>res.send("OTZ V2.1 is running"));
app.use("/admin",express.static("public/admin"));
app.use("/driver",express.static("public/driver"));

app.post("/webhook",middleware({channelSecret:process.env.LINE_CHANNEL_SECRET}),async(req,res)=>{
  res.status(200).end();
  try{await Promise.all(req.body.events.map(handleEvent));}catch(e){console.error("Webhook:",e);}
});

async function handleEvent(event){
  if(event.type==="message"&&event.message.type==="text") return handleText(event);
  if(event.type==="postback") return handlePostback(event);
}
async function handleText(event){
  const p=parseRideRequest(event.message.text);
  if(!p.pickup||!p.destination) return reply(event.replyToken,"請輸入：上車地點到下車地點、時間、人數\n例如：明天早上8點，東港碼頭到左營高鐵，2位");
  try{
    const route=await getRoute(p.pickup,p.destination,process.env.GOOGLE_MAPS_API_KEY);
    const toll=Number(process.env.DEFAULT_TOLL||0);
    const f=calculateFare(route.distanceKm,route.durationMin,toll);
    const areas=String(process.env.SERVICE_AREAS||"東港,潮州,林邊,佳冬,枋寮").split(",");
    const order=await createOrder({
      customer_line_id:event.source?.userId||null,pickup:p.pickup,destination:p.destination,
      ride_time:p.rideTime||null,passengers:p.passengers,
      distance_km:Number(route.distanceKm.toFixed(2)),duration_min:Number(route.durationMin.toFixed(2)),
      base_fare:f.baseFare,mileage_fare:f.mileageFare,time_fare:f.timeFare,toll,
      night_surcharge:f.nightSurcharge,estimated_fare:f.estimatedFare,
      in_service_area:areas.some(a=>`${p.pickup} ${p.destination}`.includes(a.trim())),
      status:"awaiting_customer"
    });
    return line.replyMessage({replyToken:event.replyToken,messages:[quoteFlex(order)]});
  }catch(e){console.error("Quote:",e);return reply(event.replyToken,"目前無法完成估價，請稍後再試。");}
}
async function handlePostback(event){
  const q=new URLSearchParams(event.postback.data),action=q.get("action"),id=Number(q.get("id"));
  const order=await getOrder(id);
  if(action==="confirm"){
    if(order.status!=="awaiting_customer") return reply(event.replyToken,"這筆訂單已處理。");
    await updateOrder(id,{status:"pending"});
    return reply(event.replyToken,`✅ 叫車已確認\n訂單：${orderNo(id)}\n等待管理員或司機接單。`);
  }
  if(action==="cancel"){
    await updateOrder(id,{status:"cancelled",cancelled_at:new Date().toISOString()});
    return reply(event.replyToken,`已取消訂單 ${orderNo(id)}。`);
  }
}

app.use(express.json());

app.get("/api/admin/orders",adminAuth,async(_req,res)=>{try{res.json(await listOrders())}catch(e){res.status(500).json({error:e.message})}});
app.get("/api/admin/drivers",adminAuth,async(_req,res)=>{try{res.json(await listDrivers())}catch(e){res.status(500).json({error:e.message})}});
app.post("/api/admin/drivers",adminAuth,async(req,res)=>{try{res.json(await createDriver({
  name:req.body.name,phone:req.body.phone||null,plate:req.body.plate||null,vehicle:req.body.vehicle||null,status:"available"
}))}catch(e){res.status(500).json({error:e.message})}});
app.post("/api/admin/orders/:id/assign",adminAuth,async(req,res)=>{
  try{
    const order=await getOrder(Number(req.params.id));
    if(order.status!=="pending") return res.status(409).json({error:"只有待接單可派單"});
    const driver=(await listDrivers()).find(d=>d.id===Number(req.body.driverId)&&d.is_active);
    if(!driver) return res.status(404).json({error:"找不到司機"});
    const updated=await updateOrder(order.id,{
      status:"accepted",assigned_driver_id:driver.id,driver_name:driver.name,driver_phone:driver.phone,
      driver_plate:driver.plate,final_fare:Number(req.body.finalFare||order.estimated_fare),accepted_at:new Date().toISOString()
    });
    await updateDriver(driver.id,{status:"busy"}); await notify(updated,"accept"); res.json(updated);
  }catch(e){res.status(500).json({error:e.message})}
});
app.post("/api/admin/orders/:id/action",adminAuth,async(req,res)=>{
  try{
    const order=await getOrder(Number(req.params.id)),action=req.body.action;
    let values={};
    if(action==="complete") values={status:"completed",completed_at:new Date().toISOString()};
    else if(action==="cancel") values={status:"cancelled",cancelled_at:new Date().toISOString()};
    else return res.status(400).json({error:"未知操作"});
    const updated=await updateOrder(order.id,values);
    if(order.assigned_driver_id) await updateDriver(order.assigned_driver_id,{status:"available"});
    await notify(updated,action); res.json(updated);
  }catch(e){res.status(500).json({error:e.message})}
});
app.get("/api/driver/orders",driverAuth,async(_req,res)=>{try{res.json((await listOrders()).filter(o=>["pending","accepted"].includes(o.status)))}catch(e){res.status(500).json({error:e.message})}});
app.post("/api/driver/orders/:id/claim",driverAuth,async(req,res)=>{
  try{
    const order=await getOrder(Number(req.params.id));
    if(order.status!=="pending") return res.status(409).json({error:"訂單已被接走"});
    let driver=(await listDrivers()).find(d=>d.name===(process.env.DRIVER_NAME||"陳志輝"));
    if(!driver) driver=await createDriver({name:process.env.DRIVER_NAME||"陳志輝",phone:process.env.DRIVER_PHONE||null,plate:process.env.DRIVER_PLATE||null,vehicle:"OTZ 車隊",status:"available"});
    const updated=await updateOrder(order.id,{status:"accepted",assigned_driver_id:driver.id,driver_name:driver.name,driver_phone:driver.phone,driver_plate:driver.plate,final_fare:order.estimated_fare,accepted_at:new Date().toISOString()});
    await updateDriver(driver.id,{status:"busy"}); await notify(updated,"accept"); res.json(updated);
  }catch(e){res.status(500).json({error:e.message})}
});

async function notify(o,action){
  if(!o.customer_line_id) return;
  let text="";
  if(action==="accept") text=`✅ 司機已接單\n訂單：${orderNo(o.id)}\n司機：${o.driver_name||"OTZ車隊"}\n${o.driver_phone?`電話：${o.driver_phone}\n`:""}${o.driver_plate?`車牌：${o.driver_plate}\n`:""}確認車資：${o.final_fare||o.estimated_fare} 元`;
  else if(action==="complete") text=`✅ 行程已完成\n訂單：${orderNo(o.id)}\n感謝使用 OTZ 車隊。`;
  else if(action==="cancel") text=`訂單 ${orderNo(o.id)} 已取消。`;
  if(text) await line.pushMessage({to:o.customer_line_id,messages:[{type:"text",text}]});
}
function reply(replyToken,text){return line.replyMessage({replyToken,messages:[{type:"text",text}]});}
function adminAuth(req,res,next){if(req.get("x-admin-token")!==process.env.ADMIN_TOKEN)return res.status(401).json({error:"未授權"});next();}
function driverAuth(req,res,next){if(req.get("x-driver-token")!==process.env.DRIVER_TOKEN)return res.status(401).json({error:"未授權"});next();}
app.listen(port,"0.0.0.0",()=>console.log(`OTZ V2.1 listening on ${port}`));
