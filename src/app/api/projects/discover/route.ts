import { discoverProjects } from '@/lib/ws5/repo';
import { pageParams, unavailable } from '@/lib/ws5/guard';

const MAX_FILTER_LEN = 100;
const text = (v: string | null) => (v?.trim().slice(0, MAX_FILTER_LEN) || null);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const remote = url.searchParams.get('remote');
  try {
    return Response.json(await discoverProjects({
      q: text(url.searchParams.get('q')), category: text(url.searchParams.get('category')), skill: text(url.searchParams.get('skill')),
      remote: remote === 'true' ? true : remote === 'false' ? false : null,
    }, pageParams(url)));
  } catch {
    return unavailable();
  }
}
