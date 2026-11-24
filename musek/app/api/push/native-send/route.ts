import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";
export const runtime="nodejs";
export async function POST(request:Request) {
 const secret=process.env.MUSEK_PUSH_API_SECRET;
 if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`) return NextResponse.json({error:"Unauthorized."},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) return NextResponse.json({error:"Push service not configured."},{status:503});
 const body=await request.json().catch(()=>null);
 const userId=typeof body?.userId==="string"?body.userId:"";
 const title=typeof body?.title==="string"?body.title.slice(0,100):"MUSEK";
 const message=typeof body?.body==="string"?body.body.slice(0,240):"You have a new update.";
 const link=typeof body?.url==="string"&&body.url.startsWith("/")&&!body.url.startsWith("//")?body.url:"/";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) return NextResponse.json({error:"Valid recipient required."},{status:400});
 try {
  const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:tokens,error}=await admin.from("native_push_tokens").select("id,token").eq("user_id",userId);
  if(error) throw error;
  const expo=new Expo(); const messages:ExpoPushMessage[]=(tokens||[]).filter(row=>Expo.isExpoPushToken(row.token)).map(row=>({to:row.token,sound:"default",title,body:message,data:{url:link}}));
  const chunks=expo.chunkPushNotifications(messages); const tickets=[];
  for(const chunk of chunks) tickets.push(...await expo.sendPushNotificationsAsync(chunk));
  return NextResponse.json({targeted:messages.length,tickets:tickets.length});
 } catch(error) { console.error("Native push send failed",error); return NextResponse.json({error:"Native push delivery failed."},{status:500}); }
}
