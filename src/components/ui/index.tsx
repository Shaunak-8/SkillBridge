import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "gold" | "ghost" | "danger";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold tracking-tight transition-all duration-100 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "border-2 border-[#111111] bg-[#D83D63] text-white shadow-[3px_3px_0_#111111] hover:bg-[#C02C51] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#111111]",
        variant === "secondary" &&
          "border-2 border-[#111111] bg-white text-[#151515] shadow-[3px_3px_0_#111111] hover:bg-[#F7F0D2] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#111111]",
        variant === "gold" &&
          "border-2 border-[#111111] bg-[#F2BE4E] text-[#151515] shadow-[3px_3px_0_#111111] hover:bg-[#E0AC3C] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#111111]",
        variant === "danger" &&
          "border-2 border-[#111111] bg-[#D83D63] text-white shadow-[3px_3px_0_#111111] hover:bg-[#C02C51] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#111111]",
        variant === "ghost" &&
          "text-[#151515] hover:bg-[#111111]/5 active:bg-[#111111]/10",
        className
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: "default" | "flat" | "elevated" | "accent" }) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-[#111111] bg-white transition-all",
        variant === "default" && "shadow-[4px_4px_0_#111111]",
        variant === "elevated" && "shadow-[6px_6px_0_#111111]",
        variant === "flat" && "shadow-none",
        variant === "accent" && "bg-[#FDFBF7] shadow-[4px_4px_0_#111111]",
        className
      )}
      {...props}
    />
  );
}

export function Badge({
  children,
  className,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "green" | "amber" | "purple" | "blue" | "pink" | "gold";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border-[1.5px] border-[#111111] px-2 py-0.5 text-[11px] font-bold tracking-tight shadow-[1.5px_1.5px_0_#111111]",
        tone === "default" && "bg-white text-[#151515]",
        (tone === "pink" || tone === "purple") && "bg-[#FCE8ED] text-[#D83D63]",
        (tone === "gold" || tone === "amber") && "bg-[#F2BE4E] text-[#151515]",
        tone === "green" && "bg-[#E6F4EA] text-[#137333]",
        tone === "blue" && "bg-[#E8F0FE] text-[#1A73E8]",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border-2 border-[#111111] bg-white px-3.5 py-2.5 text-xs sm:text-sm text-[#151515] outline-none transition-all placeholder:text-[#655F52]/60 focus:bg-white focus:shadow-[3px_3px_0_#111111]",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border-2 border-[#111111] bg-white px-3.5 py-2.5 text-xs sm:text-sm text-[#151515] outline-none transition-all placeholder:text-[#655F52]/60 focus:bg-white focus:shadow-[3px_3px_0_#111111]",
        props.className
      )}
    />
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  highlightWord,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  highlightWord?: string;
}) {
  // If highlightWord is provided in title, wrap it in a yellow neo-highlight box
  const renderTitle = () => {
    if (!highlightWord || !title.includes(highlightWord)) {
      return title;
    }
    const parts = title.split(highlightWord);
    return (
      <>
        {parts[0]}
        <span className="inline-block mx-1 px-1.5 py-0.5 bg-[#F2BE4E] border-2 border-[#111111] text-[#151515] shadow-[2px_2px_0_#111111] font-black">
          {highlightWord}
        </span>
        {parts[1]}
      </>
    );
  };

  return (
    <div className="mb-6">
      {eyebrow && (
        <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-[#111111] bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#151515] shadow-[1.5px_1.5px_0_#111111]">
          <span className="size-1.5 rounded-full bg-[#D83D63]" />
          {eyebrow}
        </div>
      )}
      <h1 className="text-2xl font-black tracking-tight text-[#151515] sm:text-3xl lg:text-4xl">
        {renderTitle()}
      </h1>
      {description && (
        <p className="mt-2 max-w-2xl text-xs sm:text-sm font-medium leading-relaxed text-[#655F52]">
          {description}
        </p>
      )}
    </div>
  );
}

export function NeoHighlight({
  children,
  color = "gold",
}: {
  children: React.ReactNode;
  color?: "gold" | "pink" | "cream";
}) {
  return (
    <span
      className={cn(
        "inline-block px-1.5 py-0.5 border-2 border-[#111111] font-black shadow-[2px_2px_0_#111111]",
        color === "gold" && "bg-[#F2BE4E] text-[#151515]",
        color === "pink" && "bg-[#D83D63] text-white",
        color === "cream" && "bg-[#F7F0D2] text-[#151515]"
      )}
    >
      {children}
    </span>
  );
}
