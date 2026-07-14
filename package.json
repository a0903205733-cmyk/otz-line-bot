export async function getRoute(origin,destination,apiKey){
  const r=await fetch("https://routes.googleapis.com/directions/v2:computeRoutes",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "X-Goog-Api-Key":apiKey,
      "X-Goog-FieldMask":"routes.distanceMeters,routes.duration"
    },
    body:JSON.stringify({
      origin:{address:normalize(origin)},
      destination:{address:normalize(destination)},
      travelMode:"DRIVE",
      routingPreference:"TRAFFIC_AWARE",
      languageCode:"zh-TW",
      units:"METRIC"
    })
  });
  const raw=await r.text();
  if(!r.ok) throw new Error(`Routes API ${r.status}: ${raw}`);
  const route=JSON.parse(raw).routes?.[0];
  if(!route) throw new Error("找不到路線");
  return {distanceKm:route.distanceMeters/1000,durationMin:Number(String(route.duration).replace("s",""))/60};
}
function normalize(v){const t=String(v).trim();return /台灣|臺灣/.test(t)?t:`${t}, 台灣`;}
