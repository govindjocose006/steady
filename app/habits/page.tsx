import {readRoute,routeURL} from '@/lib/navigation';
import {requireChatGPTUser} from '../chatgpt-auth';
import Dashboard from '../dashboard';
export const dynamic='force-dynamic';
export default async function HabitsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams,id=typeof params.record==='string'&&/^[a-f0-9-]{36}$/i.test(params.record)?params.record:null;const route=readRoute('/habits'+(id?'?record='+id:'')+(typeof params.tab==='string'?(id?'&':'?')+'tab='+encodeURIComponent(params.tab):''));await requireChatGPTUser(routeURL(route));return <Dashboard initialView="habits" initialHabitRecordId={id} initialHabitTab={route.habitTab}/>;}
