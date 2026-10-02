import { requireChatGPTUser } from './chatgpt-auth';
import Dashboard,{type View} from './dashboard';
export const dynamic='force-dynamic';
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams;const view:View=params.view==='upcoming'?'upcoming':params.view==='history'?'history':'today';return <Protected view={view}/>;}
async function Protected({view}:{view:View}){await requireChatGPTUser(view==='today'?'/':'/?view='+view);return <Dashboard initialView={view}/>;}
