import { createClient } from "npm:@supabase/supabase-js@2";
Deno.serve(async (req: Request) => {
 const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"https://eh-date.vercel.app","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
 if(req.method==="OPTIONS")return new Response(null,{headers});
 if(req.method!=="POST")return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers});
 const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const auth=req.headers.get("Authorization")??"";
 if(!auth.startsWith("Bearer "))return new Response(JSON.stringify({error:"Sign in required"}),{status:401,headers});
 const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});
 const {data:{user},error}=await client.auth.getUser();
 if(error||!user)return new Response(JSON.stringify({error:"Invalid session"}),{status:401,headers});
 const body=await req.json().catch(()=>({}));
 if(body.confirm!=="DELETE MY ACCOUNT")return new Response(JSON.stringify({error:"Confirmation required"}),{status:400,headers});
 const admin=createClient(url,service);
 // Remove stored photos before deleting the auth user, which cascades profile, matches and messages.
 const {data:files,error:listError}=await admin.storage.from("profile-photos").list(user.id,{limit:1000});
 if(listError)return new Response(JSON.stringify({error:"Could not inspect profile photos"}),{status:500,headers});
 const paths=(files??[]).filter(f=>f.name&&f.name!==".emptyFolderPlaceholder").map(f=>user.id+"/"+f.name);
 if(paths.length){const {error:removeError}=await admin.storage.from("profile-photos").remove(paths);if(removeError)return new Response(JSON.stringify({error:"Could not remove profile photos"}),{status:500,headers});}
 // Remove private selfie-verification evidence as well as profile photos.
 const {data:evidenceFiles,error:evidenceListError}=await admin.storage.from("verification-evidence").list(user.id,{limit:1000});
 if(evidenceListError)return new Response(JSON.stringify({error:"Could not inspect verification photos"}),{status:500,headers});
 const evidencePaths=(evidenceFiles??[]).filter(f=>f.name&&!f.name.startsWith(".")).map(f=>user.id+"/"+f.name);
 if(evidencePaths.length){const {error:evidenceRemoveError}=await admin.storage.from("verification-evidence").remove(evidencePaths);if(evidenceRemoveError)return new Response(JSON.stringify({error:"Could not remove verification photos"}),{status:500,headers});}
 const {error:deleteError}=await admin.auth.admin.deleteUser(user.id);
 if(deleteError)return new Response(JSON.stringify({error:"Account deletion failed. Please contact support."}),{status:500,headers});
 return new Response(JSON.stringify({deleted:true}),{status:200,headers});
});