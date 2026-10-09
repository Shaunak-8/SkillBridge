// Live provider-only check. Does not connect to Neon or load account credentials.
import env from '@next/env';
import {createServer} from 'vite';
import {resolve} from 'node:path';
env.loadEnvConfig(process.cwd());
delete process.env.DATABASE_URL;
const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false},resolve:{alias:[{find:'server-only',replacement:resolve('tests/browser/empty.ts')},{find:'@',replacement:resolve('src')}]}});
try{
 const {generateProjectDraft}=await vite.ssrLoadModule(resolve('src/lib/ai/generator.ts'));
 const result=await generateProjectDraft({rawProblemText:'A test shop receives orders through WhatsApp and needs a simple way to track pending and completed orders.',preferredLanguage:'en',category:'Retail',format:'individual'});
 if(result.isFallback){console.log('Live AI check failed: generator returned a fallback.');process.exitCode=1;}
 else console.log('Live AI brief verified:',result.providerUsed,'; structured fields validated; questions:',result.draft.open_questions.length);
}finally{await vite.close();}
