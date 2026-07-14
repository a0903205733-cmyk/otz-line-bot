export function parseRideRequest(text){
  const n=String(text).replace(/\s+/g," ").replace(/→|➡️|➡|➜|前往|到達/g,"到").trim();
  let pickup="",destination="";
  for(const p of [
    /(?:從|上車(?:地點)?[:：]?)\s*(.+?)\s*(?:到|去|下車(?:地點)?[:：]?)\s*(.+?)(?=(?:[,，。；;]|\d+\s*(?:位|人)|$))/,
    /^(.+?)\s*(?:到|去)\s*(.+?)(?=(?:[,，。；;]|\d+\s*(?:位|人)|$))/
  ]){
    const m=n.match(p); if(m){pickup=clean(m[1]);destination=clean(m[2]);break;}
  }
  const pm=n.match(/(\d+)\s*(?:位|人)/);
  const tm=n.match(/((?:今天|明天|後天|星期[一二三四五六日天]|週[一二三四五六日天])?\s*(?:早上|上午|中午|下午|晚上|凌晨)?\s*\d{1,2}(?::\d{2})?\s*(?:點|時)?(?:半)?)/);
  return {pickup,destination,passengers:pm?Number(pm[1]):null,rideTime:tm?tm[1].trim():""};
}
function clean(v){
  return String(v)
    .replace(/(?:今天|明天|後天|星期[一二三四五六日天]|週[一二三四五六日天])?\s*(?:早上|上午|中午|下午|晚上|凌晨)?\s*\d{1,2}(?::\d{2})?\s*(?:點|時)?(?:半)?/g,"")
    .replace(/\d+\s*(?:位|人)/g,"").replace(/[，,。；;]+$/g,"").trim();
}
