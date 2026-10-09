// Test-only local server: real components/routes/SQL, synthetic identity/provider.
// Never load environment files or point this server at Neon.
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createServer as createVite} from 'vite';
delete process.env.DATABASE_URL;
delete process.env.OPENAI_API_KEY;
delete process.env.LLM_API_KEY;
process.env.GEMINI_API_KEY='synthetic-browser-fixture-key';
process.env.APP_URL='http://localhost:4179';
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>String(url).includes('generativelanguage.googleapis.com')?String(url).includes('embedContent')?Response.json({},{status:503}):Response.json({candidates:[{content:{parts:[{text:JSON.stringify({title:'Shop order tracker',problem_statement:'Our shop needs to track customer orders.',business_goal:'Track every order through completion.',category:'Retail',mode:'individual',proposed_deliverables:['Order list with status updates'],required_skills:[{skillName:'Web development'}],open_questions:['Which order statuses do you need?'],language:'en'})}]}}]}):originalFetch(url,options);
const root=resolve('tests/browser');
const alias=[{find:'@/lib/db',replacement:resolve(root,'db.ts')},{find:'@/lib/auth/profile',replacement:resolve(root,'identity.ts')},{find:'server-only',replacement:resolve(root,'empty.ts')},{find:'next/navigation',replacement:resolve(root,'router.tsx')},{find:'next/link',replacement:resolve(root,'router.tsx')},{find:'@',replacement:resolve('src')}];
const vite=await createVite({root,configFile:false,server:{middlewareMode:true,hmr:false},resolve:{alias,dedupe:['react','react-dom']},esbuild:{jsx:'automatic'},optimizeDeps:{include:['react','react-dom/client','lucide-react','zod']}});
const db=await vite.ssrLoadModule(resolve(root,'db.ts'));await db.initialize();
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/__test/reset'){await db.reset();res.end('reset');return;}
  if(req.url?.startsWith('/api/')){
   const url=new URL(req.url,process.env.APP_URL);let route=url.pathname;
   let id;
   const idMatch=route.match(/^\/api\/(?:business\/)?projects\/([\w-]+)/);if(idMatch&&idMatch[1]!=='discover'){id=idMatch[1];route=route.replace(id,'[id]');}
   const handler=await vite.ssrLoadModule(resolve('src/app',route.slice(1),'route.ts'));
   const buffers=[];for await(const data of req)buffers.push(data);
   const request=new Request(url,{method:req.method,headers:req.headers,...(req.method==='GET'?{}:{body:Buffer.concat(buffers).toString()})});
   const response=await handler[req.method](request,{params:Promise.resolve({id})});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
  }
  vite.middlewares(req,res,async()=>{const html=await vite.transformIndexHtml(req.url,readFileSync(resolve(root,'index.html'),'utf8'));res.setHeader('Content-Type','text/html');res.end(html);});
 }catch{res.writeHead(503);res.end('Isolated test service unavailable');}
});
server.listen(4179,'localhost',()=>console.log('Isolated business browser fixture ready on localhost:4179'));
