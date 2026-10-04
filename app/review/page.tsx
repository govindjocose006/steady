import {requireChatGPTUser} from '../chatgpt-auth';
import Dashboard from '../dashboard';
export const dynamic='force-dynamic';
export default async function ReviewPage(){await requireChatGPTUser('/review');return <Dashboard initialView="review"/>;}
