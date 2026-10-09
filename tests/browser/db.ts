import { fixtureDatabase } from '../fixtures/postgres';
let fixture:Awaited<ReturnType<typeof fixtureDatabase>>;
export async function initialize(){ fixture=await fixtureDatabase(); }
export function database(){return fixture.sql;}
export async function reset(){await fixture.pg.exec('TRUNCATE skillbridge.projects CASCADE;DELETE FROM skillbridge.business_profiles;');}
