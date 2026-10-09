import type { AnchorHTMLAttributes } from 'react';
export function useRouter(){return {push:(path:string)=>{window.location.href=path;},refresh:()=>{},replace:(path:string)=>{window.location.href=path;}};}
export function usePathname(){return window.location.pathname;}
export default function Link(props:AnchorHTMLAttributes<HTMLAnchorElement>){return <a {...props}/>;}
