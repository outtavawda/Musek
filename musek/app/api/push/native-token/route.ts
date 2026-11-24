import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
function admin() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) throw new Error("Native push storage is not configured.");
 return createAdmin(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
export async function POST(request:Request) {
 try {
  const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:"Sign in required."},{status:401});
  const body=await request.json().catch(()=>null);
  const token=typeof body?.token==="string"?body.token:"";
  const platform=body?.platform;
  if(token.length<20||token.length>4096||!["ios","android"].includes(platform)) return NextResponse.json({error:"Valid native device token and platform required."},{status:400});
  const {error}=await admin().from("native_push_tokens").upsert({user_id:user.id,token,platform,updated_at:new Date().toISOString()},{onConflict:"token"});
  if(error) throw error;
  return NextResponse.json({success:true});
 } catch(error) { console.error("Native token save failed",error); return NextResponse.json({error:"Could not save device token."},{status:500}); }
}
export async function DELETE(request:Request) {
 try {
  const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:"Sign in required."},{status:401});
  const body=await request.json().catch(()=>null); const token=typeof body?.token==="string"?body.token:"";
  if(!token) return NextResponse.json({error:"Device token required."},{status:400});
  const {error}=await admin().from("native_push_tokens").delete().eq("user_id",user.id).eq("token",token);
  if(error) throw error;
  return NextResponse.json({success:true});
 } catch(error) { console.error("Native token removal failed",error); return NextResponse.json({error:"Could not remove device token."},{status:500}); }
}
