import {requireChatGPTUser} from '../chatgpt-auth';
import Dashboard from '../dashboard';
export const dynamic='force-dynamic';
export default async function ApplicationsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const params=await searchParams,raw=params.application,id=typeof raw==='string'&&/^[a-f0-9-]{36}$/i.test(raw)?raw:null;
  return <Protected applicationId={id}/>;
}
async function Protected({applicationId}:{applicationId:string|null}){await requireChatGPTUser('/applications'+(applicationId?'?application='+applicationId:''));return <Dashboard initialView="applications" initialApplicationId={applicationId}/>;}
