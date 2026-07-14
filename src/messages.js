export const orderNo=id=>`OTZ-${String(id).padStart(6,"0")}`;
export function quoteFlex(o){
  const row=(label,value)=>({type:"box",layout:"horizontal",contents:[
    {type:"text",text:label,size:"sm",color:"#777777",flex:2},
    {type:"text",text:String(value),size:"sm",wrap:true,flex:5}
  ]});
  return {
    type:"flex",
    altText:`${orderNo(o.id)} 預估車資 ${o.estimated_fare} 元`,
    contents:{
      type:"bubble",
      header:{type:"box",layout:"vertical",contents:[{type:"text",text:"🚖 OTZ 車隊",weight:"bold",size:"xl"}]},
      body:{type:"box",layout:"vertical",spacing:"md",contents:[
        row("訂單",orderNo(o.id)),row("上車",o.pickup),row("下車",o.destination),
        row("時間",o.ride_time||"尚未提供"),row("人數",o.passengers?`${o.passengers} 位`:"尚未提供"),
        row("距離",`${Number(o.distance_km).toFixed(1)} 公里`),row("車程",`約 ${Math.ceil(Number(o.duration_min))} 分鐘`),
        {type:"separator"},row("起跳",`${o.base_fare} 元`),row("里程",`${o.mileage_fare} 元`),
        row("時間",`${o.time_fare} 元`),row("高速費",`${o.toll||0} 元（預估）`),
        row("夜間加成",`${o.night_surcharge||0} 元`),
        {type:"text",text:`預估車資：約 ${o.estimated_fare} 元`,weight:"bold",size:"xl",align:"center",margin:"lg"}
      ]},
      footer:{type:"box",layout:"vertical",spacing:"sm",contents:[
        {type:"button",style:"primary",action:{type:"postback",label:"確認叫車",data:`action=confirm&id=${o.id}`,displayText:`確認叫車 ${orderNo(o.id)}`}},
        {type:"button",style:"secondary",action:{type:"postback",label:"取消",data:`action=cancel&id=${o.id}`,displayText:`取消 ${orderNo(o.id)}`}}
      ]}
    }
  };
}
