<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OTZ 車隊管理後台</title>
<style>
:root{
  --bg:#0c0c0d;--panel:#171719;--panel2:#222225;--gold:#d7b24a;--text:#f5f5f5;
  --muted:#a8a8ad;--line:#313136;--green:#1fc76a;--red:#e84c4c;--blue:#4c88ff;
}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--text)}
header{position:sticky;top:0;z-index:5;background:#111;border-bottom:1px solid var(--line);padding:16px 20px;display:flex;align-items:center;justify-content:space-between}
.brand{font-weight:800;color:var(--gold);font-size:22px}.sub{font-size:12px;color:var(--muted)}
main{max-width:1280px;margin:auto;padding:18px}
.toolbar,.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:14px}
.toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
input,select,button{font:inherit;border-radius:9px;border:1px solid var(--line);padding:10px 12px}
input,select{background:var(--panel2);color:var(--text)}
button{background:var(--gold);color:#111;font-weight:700;cursor:pointer}
button.secondary{background:#333;color:#fff}
button.green{background:var(--green);color:#07130c}
button.red{background:var(--red);color:#fff}
button.blue{background:var(--blue);color:#fff}
.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:14px}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px}
.stat span{color:var(--muted);font-size:13px}.stat strong{display:block;font-size:28px;margin-top:6px}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.tab{background:#2b2b2f;color:#fff}.tab.active{background:var(--gold);color:#111}
.order-list{display:grid;gap:12px}
.order{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px}
.order-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.order-no{font-weight:800;color:var(--gold)}.status{padding:5px 9px;border-radius:999px;font-size:12px;background:#333}
.route{font-size:18px;font-weight:700;margin:12px 0}
.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;color:var(--muted);font-size:13px}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.empty{text-align:center;color:var(--muted);padding:30px}
small{color:var(--muted)}
@media(max-width:900px){.stats{grid-template-columns:repeat(2,1fr)}.meta{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){header{align-items:flex-start}.stats{grid-template-columns:1fr 1fr}.meta{grid-template-columns:1fr}.route{font-size:16px}}
</style>
</head>
<body>
<header>
  <div><div class="brand">OTZ 車隊管理後台</div><div class="sub">訂單、司機、營收即時管理</div></div>
  <div id="clock" class="sub"></div>
</header>
<main>
  <section class="toolbar">
    <input id="token" type="password" placeholder="管理密碼">
    <button onclick="login()">登入／更新</button>
    <input id="search" placeholder="搜尋訂單、地點、司機" oninput="render()">
    <select id="driverFilter" onchange="render()"><option value="">全部司機</option></select>
    <label><input id="auto" type="checkbox" checked> 每15秒自動更新</label>
    <span id="msg" class="sub"></span>
  </section>

  <section class="stats">
    <div class="stat"><span>待客人確認</span><strong id="sAwait">0</strong></div>
    <div class="stat"><span>待接單</span><strong id="sPending">0</strong></div>
    <div class="stat"><span>進行中</span><strong id="sAccepted">0</strong></div>
    <div class="stat"><span>今日完成</span><strong id="sCompleted">0</strong></div>
    <div class="stat"><span>今日營收</span><strong id="sRevenue">$0</strong></div>
  </section>

  <section class="panel">
    <div class="tabs">
      <button class="tab active" data-status="" onclick="setStatus(this,'')">全部</button>
      <button class="tab" data-status="pending" onclick="setStatus(this,'pending')">待接單</button>
      <button class="tab" data-status="accepted" onclick="setStatus(this,'accepted')">進行中</button>
      <button class="tab" data-status="completed" onclick="setStatus(this,'completed')">已完成</button>
      <button class="tab" data-status="cancelled" onclick="setStatus(this,'cancelled')">已取消</button>
    </div>
    <div id="orders" class="order-list"></div>
  </section>
</main>

<script>
let token=localStorage.getItem("otzAdmin")||"";
let orders=[],drivers=[],statusFilter="";
document.getElementById("token").value=token;

const labels={
  awaiting_customer:"待客人確認",
  pending:"待接單",
  accepted:"進行中",
  completed:"已完成",
  cancelled:"已取消"
};

function nowText(){
  document.getElementById("clock").textContent=new Date().toLocaleString("zh-TW");
}
setInterval(nowText,1000);nowText();

async function api(url,opt={}){
  opt.headers={...(opt.headers||{}),"x-admin-token":token};
  const r=await fetch(url,opt);
  const data=await r.json();
  if(!r.ok) throw new Error(data.error||"操作失敗");
  return data;
}

async function login(){
  token=document.getElementById("token").value.trim();
  localStorage.setItem("otzAdmin",token);
  await refresh();
}

async function refresh(){
  try{
    document.getElementById("msg").textContent="更新中…";
    [drivers,orders]=await Promise.all([
      api("/api/admin/drivers"),
      api("/api/admin/orders")
    ]);
    fillDrivers();
    render();
    document.getElementById("msg").textContent="已更新 "+new Date().toLocaleTimeString("zh-TW");
  }catch(e){
    document.getElementById("msg").textContent=e.message;
  }
}

function fillDrivers(){
  const sel=document.getElementById("driverFilter");
  const current=sel.value;
  sel.innerHTML='<option value="">全部司機</option>'+drivers.map(d=>`<option value="${d.id}">${esc(d.name)}｜${esc(d.status)}</option>`).join("");
  sel.value=current;
}

function setStatus(btn,status){
  statusFilter=status;
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");
  render();
}

function render(){
  const q=document.getElementById("search").value.trim().toLowerCase();
  const driverId=document.getElementById("driverFilter").value;
  const today=new Date().toISOString().slice(0,10);

  sAwait.textContent=orders.filter(o=>o.status==="awaiting_customer").length;
  sPending.textContent=orders.filter(o=>o.status==="pending").length;
  sAccepted.textContent=orders.filter(o=>o.status==="accepted").length;
  const completedToday=orders.filter(o=>o.status==="completed"&&String(o.completed_at||"").slice(0,10)===today);
  sCompleted.textContent=completedToday.length;
  sRevenue.textContent="$"+completedToday.reduce((s,o)=>s+Number(o.final_fare||o.estimated_fare||0),0).toLocaleString();

  const filtered=orders.filter(o=>{
    const matchesStatus=!statusFilter||o.status===statusFilter;
    const matchesDriver=!driverId||String(o.assigned_driver_id||"")===driverId;
    const text=[o.id,o.pickup,o.destination,o.driver_name,o.ride_time].join(" ").toLowerCase();
    const matchesSearch=!q||text.includes(q);
    return matchesStatus&&matchesDriver&&matchesSearch;
  });

  document.getElementById("orders").innerHTML=filtered.length?filtered.map(card).join(""):'<div class="empty">目前沒有符合條件的訂單</div>';
}

function card(o){
  const no="OTZ-"+String(o.id).padStart(6,"0");
  const fare=o.final_fare||o.estimated_fare||0;
  return `<article class="order">
    <div class="order-head">
      <div><div class="order-no">${no}</div><small>${fmt(o.created_at)}</small></div>
      <div class="status">${labels[o.status]||o.status}</div>
    </div>
    <div class="route">${esc(o.pickup)} → ${esc(o.destination)}</div>
    <div class="meta">
      <div>預約：${esc(o.ride_time||"未提供")}</div>
      <div>人數：${o.passengers||"未提供"} 位</div>
      <div>距離：${Number(o.distance_km||0).toFixed(1)} 公里</div>
      <div>車資：${fare} 元</div>
      <div>司機：${esc(o.driver_name||"未指派")}</div>
      <div>電話：${esc(o.driver_phone||"—")}</div>
      <div>車牌：${esc(o.driver_plate||"—")}</div>
      <div>${o.in_service_area===false?"服務區外":"服務區內"}</div>
    </div>
    <div class="actions">
      ${o.status==="pending"?`<button class="green" onclick="assign(${o.id},${o.estimated_fare||0})">派單</button>`:""}
      ${o.status==="accepted"?`<button class="blue" onclick="action(${o.id},'complete')">完成</button>`:""}
      ${!["completed","cancelled"].includes(o.status)?`<button class="red" onclick="action(${o.id},'cancel')">取消</button>`:""}
      <button class="secondary" onclick="nav('${encodeURIComponent(o.pickup)}')">導航上車</button>
      <button class="secondary" onclick="nav('${encodeURIComponent(o.destination)}')">導航目的地</button>
    </div>
  </article>`;
}

async function assign(id,estimate){
  if(!drivers.length){alert("請先建立司機資料");return}
  const choices=drivers.filter(d=>d.is_active!==false).map(d=>`${d.id}：${d.name}（${d.status}）`).join("\n");
  const driverId=prompt("輸入司機 ID\n"+choices);
  if(!driverId)return;
  const finalFare=prompt("確認最終車資",estimate);
  if(finalFare===null)return;
  await api(`/api/admin/orders/${id}/assign`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({driverId:Number(driverId),finalFare:Number(finalFare)})
  });
  await refresh();
}

async function action(id,action){
  if(!confirm("確定執行此操作？"))return;
  await api(`/api/admin/orders/${id}/action`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action})
  });
  await refresh();
}

function nav(place){
  window.open(`https://www.google.com/maps/search/?api=1&query=${place}`,"_blank");
}
function fmt(v){return v?new Date(v).toLocaleString("zh-TW"):"—"}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

setInterval(()=>{if(document.getElementById("auto").checked&&token)refresh()},15000);
if(token)refresh();
</script>
</body>
</html>
