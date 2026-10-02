import {requireChatGPTUser} from '../chatgpt-auth';
import Dashboard from '../dashboard';
export const dynamic='force-dynamic';
export default async function HabitsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams,id=typeof params.record==='string'&&/^[a-f0-9-]{36}$/i.test(params.record)?params.record:null;await requireChatGPTUser('/habits'+(id?'?record='+id:''));return <Dashboard initialView="habits" initialHabitRecordId={id}/>;}
