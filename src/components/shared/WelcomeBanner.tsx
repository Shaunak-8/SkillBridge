import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Users } from "lucide-react";

interface WelcomeBannerProps {
  role: "student" | "business";
  userName?: string;
  title: string;
  highlightWord?: string;
  description: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  badgeText?: string;
}

export function WelcomeBanner({
  role,
  userName,
  title,
  highlightWord,
  description,
  primaryActionLabel,
  primaryActionHref,
  secondaryActionLabel,
  secondaryActionHref,
  badgeText,
}: WelcomeBannerProps) {
  // Render title with golden yellow highlighted keyword
  const renderTitle = () => {
    if (!highlightWord || !title.includes(highlightWord)) {
      return title;
    }
    const parts = title.split(highlightWord);
    return (
      <>
        {parts[0]}
        <span className="inline-block mx-1 px-2 py-0.5 bg-[#F2BE4E] border-2 border-[#111111] text-[#151515] font-black shadow-[3px_3px_0_#111111] rotate-[-1deg]">
          {highlightWord}
        </span>
        {parts[1]}
      </>
    );
  };

  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl border-2 border-[#111111] bg-[#F7F0D2] shadow-[6px_6px_0_#111111]">
      {/* Real background artwork */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <Image
          src="/images/neoflux-banner.jpg"
          alt="SkillBridge Collaboration Art"
          fill
          priority
          className={`object-cover ${
            role === "student" ? "object-right sm:object-right-top" : "object-left sm:object-left-top"
          } opacity-40 mix-blend-multiply`}
        />
        {/* Responsive gradient overlay ensuring razor-sharp contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#F7F0D2] via-[#F7F0D2]/90 to-transparent sm:w-3/4" />
      </div>

      {/* Banner content */}
      <div className="relative z-10 p-6 sm:p-8 lg:p-10 max-w-2xl">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 rounded-md border-2 border-[#111111] bg-white px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#151515] shadow-[2px_2px_0_#111111]">
            <span className="size-2 rounded-full bg-[#D83D63]" />
            {role === "student" ? "Student Discovery" : "Local Business Hub"}
          </div>

          {badgeText && (
            <div className="inline-flex items-center gap-1.5 rounded-md border-2 border-[#111111] bg-[#F2BE4E] px-2.5 py-0.5 text-[11px] font-black text-[#151515] shadow-[2px_2px_0_#111111]">
              <Sparkles size={12} strokeWidth={2.5} />
              {badgeText}
            </div>
          )}
        </div>

        {userName && (
          <p className="text-xs sm:text-sm font-bold text-[#D83D63] uppercase tracking-wider mb-1">
            Welcome back, {userName}
          </p>
        )}

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#151515] leading-[1.2]">
          {renderTitle()}
        </h1>

        <p className="mt-3 text-xs sm:text-sm font-medium leading-relaxed text-[#655F52] max-w-xl">
          {description}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href={primaryActionHref}>
            <button className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#111111] bg-[#D83D63] px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-[3px_3px_0_#111111] hover:bg-[#C02C51] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#111111] transition-all">
              <span>{primaryActionLabel}</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </Link>

          {secondaryActionLabel && secondaryActionHref && (
            <Link href={secondaryActionHref}>
              <button className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#111111] bg-white px-5 py-2.5 text-xs sm:text-sm font-black text-[#151515] shadow-[3px_3px_0_#111111] hover:bg-[#F7F0D2] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#111111] transition-all">
                <Users size={16} strokeWidth={2.5} />
                <span>{secondaryActionLabel}</span>
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
