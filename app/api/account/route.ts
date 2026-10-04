import {getChatGPTUser} from '@/app/chatgpt-auth';
export async function GET(){const user=await getChatGPTUser();return Response.json(user?{id:user.userId,name:user.displayName}:{error:'Sign in again.'},{status:user?200:401,headers:{'Cache-Control':'private, no-store'}});}
