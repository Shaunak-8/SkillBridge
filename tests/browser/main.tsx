import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import '@/app/globals.css';
import {Sidebar} from '@/components/layout/Sidebar';
import {BusinessNav} from '@/components/business/BusinessNav';
import {BusinessProfileForm} from '@/components/business/BusinessProfileForm';
import {ProblemForm} from '@/components/business/ProblemForm';
import {BriefEditor} from '@/components/business/BriefEditor';
import {ProjectList} from '@/components/business/ProjectList';
import {SectionTitle} from '@/components/ui';
import {businessRequest} from '@/lib/business/client';
import type {BusinessProfile,BusinessProject} from '@/lib/business/contracts';
function App(){
 const [loaded,setLoaded]=useState(false),[business,setBusiness]=useState<BusinessProfile|null>(null),[projects,setProjects]=useState<BusinessProject[]>([]),[project,setProject]=useState<BusinessProject|null>(null),[error,setError]=useState('');
 const path=window.location.pathname;
 useEffect(()=>{async function load(){try{setBusiness(await businessRequest<BusinessProfile|null>('/api/business/me','GET'));setProjects(await businessRequest<BusinessProject[]>('/api/business/projects','GET'));const match=path.match(/\/projects\/([\w-]+)(?:\/edit)?$/);if(match&&match[1]!=='new')setProject(await businessRequest<BusinessProject>(`/api/projects/${match[1]}`,'GET'));}catch(e){setError(e instanceof Error?e.message:'Unable to load');}finally{setLoaded(true);}}void load();},[path]);
 return <div className="flex min-h-screen bg-canvas"><Sidebar role="business"/><main className="min-w-0 flex-1"><header className="border-b border-line bg-white p-5 font-bold">skillbridge</header><BusinessNav mobile/><div className="business-workspace mx-auto max-w-7xl p-5 sm:p-8">{error?<p role="alert">{error}</p>:!loaded?<p role="status">Loading your business workspace…</p>:path.endsWith('/onboarding')||path.endsWith('/profile')?<><SectionTitle title="Tell us a little about your business"/><BusinessProfileForm profile={business} onboarding/></>:!business?<a href="/business/onboarding">Complete your business profile</a>:path.endsWith('/new')?<><SectionTitle title="What problem can we help you solve?"/><ProblemForm business={business}/></>:project?<><SectionTitle title={project.title||'Review your project brief'}/><BriefEditor initial={project} editing={path.endsWith('/edit')}/></>:<><SectionTitle title={`Welcome back, ${business.business_name}!`}/><ProjectList projects={projects}/></>}</div></main></div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
