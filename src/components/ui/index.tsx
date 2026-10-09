import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from "react";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50", variant === "primary" && "bg-brand text-white shadow-sm hover:bg-brand-dark", variant === "secondary" && "border border-line bg-white text-ink hover:border-brand/30 hover:text-brand", variant === "ghost" && "text-muted hover:bg-canvas hover:text-ink", className)} {...props} />;
}
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("rounded-2xl border border-line bg-white shadow-soft", className)} {...props} />; }
export function Badge({ children, className, tone = "default" }: { children: React.ReactNode; className?: string; tone?: "default" | "green" | "amber" | "purple" | "blue" }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tone === "default" && "bg-canvas text-muted", tone === "green" && "bg-mint text-emerald-700", tone === "amber" && "bg-amber text-amber-700", tone === "purple" && "bg-brand-soft text-brand-dark", tone === "blue" && "bg-blue-50 text-blue-700", className)}>{children}</span>;
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={cn("w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10", props.className)} />; }
export function SectionTitle({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) { return <div className="mb-6"><div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-brand">{eyebrow}</div><h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>}</div>; }
