export function safeReturnPath(input:string|null|undefined):string{
 if(!input?.startsWith('/')||input.startsWith('//')||input.includes('\\'))return '/';
 try{const u=new URL(input,'https://steady.invalid');if(u.origin!=='https://steady.invalid'||/^\/(auth|login)(\/|$)/.test(u.pathname))return '/';return u.pathname+u.search+u.hash;}catch{return '/';}
}
export function sameOrigin(request:Request):boolean{return Boolean(request.headers.get('origin')===new URL(request.url).origin)&&request.headers.get('sec-fetch-site')!=='cross-site';}
