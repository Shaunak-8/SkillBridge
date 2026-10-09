import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";
export function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: LucideIcon }) { return <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-emerald-600">{detail}</p></div><span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><Icon size={19} /></span></div></Card>; }
