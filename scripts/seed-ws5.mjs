// Idempotent WS5 seed (values derived from src/data/mock-data.ts). Safe to re-run.
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { createHash } from 'node:crypto';

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
const sql = neon(process.env.DATABASE_URL);

// Deterministic uuid from a seed key so re-runs hit ON CONFLICT (id).
const uid = (key) => {
  const h = createHash('md5').update(`ws5:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const businesses = [
  ['b1', 'Green Leaf Café'], ['b2', 'Thread & Loom'], ['b3', 'Saffron Bakehouse'], ['b4', 'Mango & Co.'],
];

// [key, name, bio, level, year, skills, interests, preferred_categories, hours, remote, location, visibility, portfolio[{title, description, skills_used}]]
const students = [
  ['s1', 'Aarav Mehta', 'I turn messy workflows into simple, friendly digital products.', 'B.Tech Computer Science', 3, ['React', 'Data analytics', 'Graphic design'], ['Food & beverage', 'Product design'], ['Web development', 'Data & analytics'], 10, 'either', 'Pune, MH', 'public',
    [{ title: 'Campus canteen pre-order app', description: 'Mobile-first ordering UI for a college canteen.', skills: ['React', 'Graphic design'] }, { title: 'Hostel mess feedback dashboard', description: 'Charts of weekly meal ratings.', skills: ['Data analytics', 'React'] }]],
  ['s2', 'Maya Shah', 'Product, food and lifestyle photographer helping local brands look their best.', 'BA Visual Communication', 2, ['Photography', 'Graphic design', 'Social media'], ['Fashion', 'Food & beverage'], ['Photography', 'Marketing'], 6, 'onsite', 'Mumbai, MH', 'matching',
    [{ title: 'Thrift store lookbook', description: 'Editorial product photo set for a thrift store.', skills: ['Photography', 'Graphic design'] }]],
  ['s3', 'Kabir Rao', 'I find patterns in data and build tools that help teams make better decisions.', 'B.Sc Statistics', 3, ['Data analytics', 'AI / ML', 'React'], ['Retail', 'Machine learning'], ['Data & analytics', 'Web development'], 15, 'remote', 'Bengaluru, KA', 'public',
    [{ title: 'Sales forecasting notebook', description: 'Weekly demand forecast for a stationery shop.', skills: ['Data analytics', 'AI / ML'] }, { title: 'Reorder alert prototype', description: 'Small web tool flagging low stock.', skills: ['React', 'Data analytics'] }]],
  ['s4', 'Nisha Kulkarni', 'Experimenting with regional ingredients and documenting every delicious result.', 'Diploma in Culinary Arts', 1, ['Baking', 'Menu development', 'Social media'], ['Regional cuisine', 'Food & beverage'], ['Culinary'], 12, 'onsite', 'Nashik, MH', 'public',
    [{ title: 'Millet bakes recipe series', description: 'Twelve tested millet-based recipes with photos.', skills: ['Baking', 'Menu development'] }]],
  ['s5', 'Zoya Khan', 'I help neighborhood businesses build genuine relationships online and offline.', 'BBA Marketing', 2, ['Social media', 'Copywriting', 'Event planning'], ['Community', 'Local brands'], ['Marketing', 'Events', 'Writing & content'], 8, 'either', 'Hyderabad, TS', 'matching',
    [{ title: 'Neighborhood bookstore Instagram revamp', description: 'Content calendar and captions for a bookstore.', skills: ['Social media', 'Copywriting'] }, { title: 'College fest sponsorship drive', description: 'Coordinated vendors and volunteers.', skills: ['Event planning'] }]],
  ['s6', 'Dev Menon', 'Shipping pragmatic software, from inventory spreadsheets to production apps.', 'BCA', 3, ['React', 'Data analytics', 'Copywriting'], ['Small business tools'], ['Web development', 'Data & analytics'], 20, 'remote', 'Kochi, KL', 'public',
    [{ title: 'Pharmacy inventory tracker', description: 'Spreadsheet-to-web inventory tool for a pharmacy.', skills: ['React', 'Data analytics'] }]],
  ['s7', 'Ishita Joshi', 'Civil engineering student who loves drafting layouts and making small spaces work.', 'B.E. Civil Engineering', 2, ['CAD drafting', 'Space planning', 'Graphic design'], ['Interiors', 'Retail'], ['Design', 'Events'], 10, 'onsite', 'Pune, MH', 'public',
    [{ title: 'Studio apartment layout set', description: 'Floor plans and furniture layouts in AutoCAD.', skills: ['CAD drafting', 'Space planning'] }]],
  ['s8', 'Rohan Desai', 'Commerce student who enjoys turning receipts into clear books.', 'B.Com Accounting', 2, ['Bookkeeping', 'Data analytics', 'Financial planning'], ['Small business', 'Retail'], ['Finance', 'Data & analytics'], 8, 'remote', 'Mumbai, MH', 'matching',
    [{ title: 'Family shop bookkeeping cleanup', description: 'Organized one year of sales into monthly statements.', skills: ['Bookkeeping', 'Financial planning'] }]],
  ['s9', 'Tanvi Iyer', 'Psychology student who runs surveys and interviews to learn what customers really want.', 'BA Psychology', 3, ['User research', 'Copywriting', 'Data analytics'], ['Customer experience', 'Community'], ['Research', 'Writing & content'], 12, 'either', 'Bengaluru, KA', 'public',
    [{ title: 'Cafe customer interview study', description: 'Ran fifteen interviews and summarized findings.', skills: ['User research', 'Copywriting'] }]],
  ['s10', 'Arjun Nair', 'Mechanical engineering student making short videos for local makers.', 'B.Tech Mechanical Engineering', 1, ['Video editing', 'Photography', 'Social media'], ['Makers', 'Events'], ['Photography', 'Marketing', 'Events'], 6, 'either', 'Kochi, KL', 'private',
    [{ title: 'Maker fair highlight reel', description: 'Edited a three-minute recap of a local maker fair.', skills: ['Video editing', 'Photography'] }]],
];

// [key, owner, title, summary, problem, category, required_skills, location, remote_ok, timeline, compensation, status, owner_confirmed]
const projects = [
  ['p1', 'b1', 'Make our café orders flow', 'Build a simple order management experience for our growing café.', 'We currently manage orders across paper tickets and chat messages. Help us design a lightweight, mobile-first workflow for our counter team.', 'Web development', ['React', 'Graphic design'], 'Pune', true, '4–6 weeks', 'unpaid', 'published', true],
  ['p2', 'b1', 'A seasonal menu with a story', 'Develop six fresh menu items inspired by local ingredients.', 'We want a small seasonal menu that is delicious, practical for our kitchen and easy for customers to understand.', 'Culinary', ['Menu development', 'Copywriting'], 'Pune', false, '3 weeks', 'expense_only', 'published', true],
  ['p3', 'b2', 'Product photography for our new drop', 'Create a versatile image library for a local clothing collection.', 'We need warm, editorial product and lifestyle photographs for our online shop and launch campaign.', 'Photography', ['Photography', 'Graphic design'], 'Mumbai', false, '2–3 weeks', 'paid', 'published', true],
  ['p4', 'b2', 'Know what is in stock', 'Turn our inventory spreadsheet into a clear, reliable tracker.', 'Create a simple inventory dashboard that helps our small team know what to reorder and when.', 'Data & analytics', ['Data analytics', 'React'], null, true, '5 weeks', 'unpaid', 'in_progress', true],
  ['p5', 'b3', 'A social launch for Saffron', 'Plan and create a two-week social media campaign.', 'Help us launch our festive menu with a thoughtful content plan, beautiful stories and a way to measure what works.', 'Marketing', ['Social media', 'Photography'], 'Nashik', true, '2–4 weeks', 'paid', 'published', true],
  ['p6', 'b3', 'Recipes that feel like home', 'Develop and document a small collection of regional bakes.', 'We are looking for a curious baker to co-create recipes that bring local ingredients into our display case.', 'Culinary', ['Baking', 'Menu development'], 'Nashik', false, '4 weeks', 'expense_only', 'published', true],
  ['p7', 'b4', 'Tell the Mango & Co. story', 'Shape a clear brand story and refreshed website copy.', 'We have great work and too many words. Help us make our story easier to understand for local businesses.', 'Writing & content', ['Copywriting', 'Social media'], 'Bengaluru', true, '2 weeks', 'unpaid', 'published', true],
  ['p8', 'b4', 'Community makers meetup', 'Design and run a friendly launch event for local makers.', 'Bring makers, customers and curious neighbors together for an afternoon of workshops and good conversations.', 'Events', ['Event planning', 'Social media'], 'Bengaluru', false, '6 weeks', 'paid', 'completed', true],
  ['p9', 'b1', 'Redesign our café floor layout', 'Plan a seating layout that fits more guests without feeling crowded.', 'Our small café feels cramped at peak hours. We need a measured floor plan and a few layout options.', 'Design', ['CAD drafting', 'Space planning'], 'Pune', false, '3 weeks', 'negotiable', 'published', true],
  ['p10', 'b2', 'Clean up our books', 'Organize a year of sales and expenses into simple monthly statements.', 'Our records are scattered across notebooks and chat. We want clean monthly books and a basic budget.', 'Finance', ['Bookkeeping', 'Financial planning'], null, true, '4 weeks', 'paid', 'published', true],
  ['p11', 'b4', 'What do our customers think', 'Interview customers and summarize what they value.', 'We assume we know why customers choose us. Help us run interviews and write up the real reasons.', 'Research', ['User research', 'Copywriting'], 'Bengaluru', true, '3 weeks', 'unpaid', 'published', true],
  ['p12', 'b3', 'Festive bake box video', 'Shoot and edit a short video showing our festive bake box.', 'We need a thirty-second vertical video for social media that shows the box being packed.', 'Photography', ['Video editing', 'Photography'], 'Nashik', false, '2 weeks', 'paid', 'published', true],
  ['p13', 'b1', 'Loyalty card idea (draft)', 'Rough idea for a digital loyalty card.', 'Not ready to publish. Still working out the scope.', 'Web development', ['React'], 'Pune', true, null, 'unpaid', 'draft', false],
];

// [project, student, status, cover_note]
const applications = [
  ['p1', 's1', 'shortlisted', 'I would love to map the current workflow and prototype something your team can actually use.'],
  ['p1', 's6', 'viewed', 'I have built small internal tools and can help take this from idea to a working pilot.'],
  ['p3', 's2', 'accepted', 'The story behind local craft is exactly what I love to capture.'],
  ['p5', 's5', 'submitted', 'I have run content calendars for a local bookstore and would enjoy planning your festive campaign.'],
  ['p6', 's4', 'submitted', 'I have been documenting millet bakes and would love to explore regional recipes with you.'],
  ['p10', 's8', 'submitted', 'I cleaned up my family shop books last year and can set up monthly statements for you.'],
];


// Deliverables are required by Member 6's projects_publish_ready constraint for published/in_progress/completed projects.
const deliverables = {
  p1: ['Mobile-first order screen for the counter team', 'Order status board', 'Short handover guide'],
  p2: ['Six tested menu items with costings', 'Menu copy for print and web', 'Ingredient sourcing list'],
  p3: ['30 edited product photographs', 'Five lifestyle hero images', 'Shot list and file naming guide'],
  p4: ['Inventory dashboard with reorder alerts', 'Cleaned stock spreadsheet', 'One-page user guide'],
  p5: ['Two-week content calendar', 'Ten ready-to-post stories and reels', 'Simple weekly results summary'],
  p6: ['Six documented regional bake recipes', 'Photos of each finished bake', 'Allergen and storage notes'],
  p7: ['Brand story page copy', 'Refreshed homepage and about copy', 'Short tone-of-voice guide'],
  p8: ['Event plan and run sheet', 'Maker and vendor line-up', 'Post-event summary'],
  p9: ['Measured floor plan', 'Two seating layout options', 'Capacity comparison'],
  p10: ['Monthly sales and expense statements', 'Simple annual budget', 'Bookkeeping routine for the team'],
  p11: ['Ten customer interviews', 'Summary of what customers value', 'Three recommended actions'],
  p12: ['30-second vertical video', 'Square cut for the feed', 'Raw clips folder'],
  p13: ['Loyalty card concept sketch', 'Scope outline'],
};
const TARGET_STATUS = { p4: 'in_progress', p8: 'completed' };
const unrepaired = [];

// Follows Member 6's guard_project rules: brief edits on a published project reset it to draft, so the
// brief is written first, then the project is confirmed (confirmed_version = brief_version) and published,
// then advanced draft -> published -> in_progress -> completed. Locked rows are reported, never forced.
async function seedProject(p) {
  const target = p.status;
  const [existing] = await sql`SELECT status FROM skillbridge.projects WHERE id = ${p.id}`;
  if (!existing) {
    await sql`INSERT INTO skillbridge.projects (id, owner_profile_id, title, summary, problem_statement, category, location_text, required_skills, deliverables, timeline, remote_ok, compensation, status, owner_confirmed)
      VALUES (${p.id}, ${p.owner}, ${p.title}, ${p.summary}, ${p.problem}, ${p.category}, ${p.loc}, ${p.req}, ${p.deliverables}, ${p.timeline}, ${p.remote}, ${p.comp}, 'draft', false)`;
  } else if (['draft', 'published'].includes(existing.status)) {
    await sql`UPDATE skillbridge.projects SET title = ${p.title}, summary = ${p.summary}, problem_statement = ${p.problem}, category = ${p.category}, location_text = ${p.loc},
        required_skills = ${p.req}, deliverables = ${p.deliverables}, timeline = ${p.timeline}, remote_ok = ${p.remote}, compensation = ${p.comp}
      WHERE id = ${p.id} AND (ROW(title, summary, problem_statement, category, location_text, required_skills, deliverables, timeline, remote_ok, compensation)
        IS DISTINCT FROM ROW(${p.title}::text, ${p.summary}::text, ${p.problem}::text, ${p.category}::text, ${p.loc}::text, ${p.req}::text[], ${p.deliverables}::text[], ${p.timeline}::text, ${p.remote}::boolean, ${p.comp}::text))`;
  }
  let [row] = await sql`SELECT status, owner_confirmed, confirmed_version, brief_version, deliverables FROM skillbridge.projects WHERE id = ${p.id}`;
  if (['in_progress', 'completed'].includes(row.status) && row.deliverables.length === 0) {
    unrepaired.push(`${p.key} (${row.status}, empty deliverables, brief locked by guard_project)`);
    return;
  }
  if (target !== 'draft' && row.status === 'draft') {
    await sql`UPDATE skillbridge.projects SET owner_confirmed = true, confirmed_version = brief_version, status = 'published', published_at = COALESCE(published_at, now()) WHERE id = ${p.id}`;
  } else if (row.status === 'published' && (!row.owner_confirmed || row.confirmed_version !== row.brief_version)) {
    await sql`UPDATE skillbridge.projects SET owner_confirmed = true, confirmed_version = brief_version WHERE id = ${p.id}`;
  }
  const want = TARGET_STATUS[p.key];
  if (want) {
    [row] = await sql`SELECT status FROM skillbridge.projects WHERE id = ${p.id}`;
    if (row.status === 'published') await sql`UPDATE skillbridge.projects SET status = 'in_progress' WHERE id = ${p.id}`;
    if (want === 'completed' && row.status !== 'completed') await sql`UPDATE skillbridge.projects SET status = 'completed' WHERE id = ${p.id}`;
  }
}

const profileIds = {};
async function upsertProfile(key, role, name, username) {
  const [row] = await sql`
    INSERT INTO skillbridge.profiles (auth_user_id, username, email, full_name, role, onboarding_completed)
    VALUES (${`seed:${key}`}, ${username}, ${`${username}@seed.invalid`}, ${name}, ${role}, true)
    ON CONFLICT (auth_user_id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, onboarding_completed = true, updated_at = now()
    RETURNING id`;
  profileIds[key] = row.id;
}

try {
  for (const [key, name] of businesses) await upsertProfile(key, 'business', name, `seed_${key}`);
  for (const s of students) await upsertProfile(s[0], 'student', s[1], `seed_${s[0]}`);

  for (const [key, , bio, level, year, skills, interests, cats, hours, remote, loc, vis, portfolio] of students) {
    const studentId = uid(`sp:${key}`);
    await sql`
      INSERT INTO skillbridge.student_profiles (id, profile_id, bio, education_level, study_year, skills, interests, preferred_categories, availability_hours_per_week, remote_preference, location_text, visibility)
      VALUES (${studentId}, ${profileIds[key]}, ${bio}, ${level}, ${year}, ${skills}, ${interests}, ${cats}, ${hours}, ${remote}, ${loc}, ${vis})
      ON CONFLICT (profile_id) DO UPDATE SET bio = EXCLUDED.bio, education_level = EXCLUDED.education_level, study_year = EXCLUDED.study_year, skills = EXCLUDED.skills, interests = EXCLUDED.interests,
        preferred_categories = EXCLUDED.preferred_categories, availability_hours_per_week = EXCLUDED.availability_hours_per_week, remote_preference = EXCLUDED.remote_preference,
        location_text = EXCLUDED.location_text, visibility = EXCLUDED.visibility, updated_at = now()`;
    // Resolve the real id (a pre-existing row for this profile may carry a different id).
    const [{ id }] = await sql`SELECT id FROM skillbridge.student_profiles WHERE profile_id = ${profileIds[key]}`;
    profileIds[`sp:${key}`] = id;
    for (const [i, item] of portfolio.entries()) {
      await sql`
        INSERT INTO skillbridge.student_portfolio_items (id, student_id, title, description, skills_used)
        VALUES (${uid(`pi:${key}:${i}`)}, ${id}, ${item.title}, ${item.description}, ${item.skills})
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, skills_used = EXCLUDED.skills_used, updated_at = now()`;
    }
  }

  for (const [key, owner, title, summary, problem, category, req, loc, remote, timeline, comp, status] of projects) {
    await seedProject({ id: uid(`pr:${key}`), key, owner: profileIds[owner], title, summary, problem, category, req, loc, remote, timeline, comp, status, deliverables: deliverables[key] });
  }

  for (const [project, student, status, note] of applications) {
    await sql`
      INSERT INTO skillbridge.applications (id, project_id, student_id, status, cover_note)
      VALUES (${uid(`ap:${project}:${student}`)}, ${uid(`pr:${project}`)}, ${profileIds[`sp:${student}`]}, ${status}, ${note})
      ON CONFLICT (project_id, student_id) DO UPDATE SET status = EXCLUDED.status, cover_note = EXCLUDED.cover_note, updated_at = now()`;
  }
  if (unrepaired.length) console.warn(`Could not repair: ${unrepaired.join('; ')}`);
  console.log(`Seeded ${businesses.length} businesses, ${students.length} students, ${projects.length} projects, ${applications.length} applications.`);
} catch (error) {
  console.error('Seed failed:', error.code || error.name, error.message);
  process.exitCode = 1;
}
