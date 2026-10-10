import { redirect } from 'next/navigation';

// Old "Find Students" link target; the directory now lives at /business/students.
export default function Page() { redirect('/business/students'); }
