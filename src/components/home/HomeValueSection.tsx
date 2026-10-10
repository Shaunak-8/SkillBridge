'use client';

import Link from "next/link";
import { ArrowRight, CheckCircle2, HeartHandshake, Search, Sparkles, Users } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

export function HomeValueSection() {
  const { t } = useLanguage();

  return (
    <section className="border-t-2 border-[#111111] bg-[#F7F0D2] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-[#111111] bg-white px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-[#D83D63] shadow-[1.5px_1.5px_0_#111111]">
            <Sparkles size={13} />
            <span>One platform, many ways to contribute</span>
          </div>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#151515] sm:text-4xl">
            From code to croissants, bring what you&apos;re good at.
          </h2>
          <p className="mt-3 text-base font-medium leading-relaxed text-[#655F52]">
            SkillBridge removes the friction between classroom theory and real-world execution.
          </p>
        </div>

        {/* 3 Pillars Cards */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {/* Card 1: Students */}
          <div className="group flex flex-col justify-between rounded-2xl border-2 border-[#111111] bg-white p-6 shadow-[4px_4px_0_#111111] transition hover:-translate-y-1 hover:shadow-[6px_6px_0_#111111]">
            <div>
              <div className="grid size-12 place-items-center rounded-xl border-2 border-[#111111] bg-[#FCE8ED] text-[#D83D63] shadow-[2px_2px_0_#111111]">
                <Users size={22} strokeWidth={2.5} />
              </div>
              <h3 className="mt-5 text-xl font-black text-[#151515]">For students</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-[#655F52]">
                Build a portfolio with projects that matter and mentors who care. Work on actual business bottlenecks instead of toy classroom assignments.
              </p>
              <ul className="mt-4 space-y-2 text-xs font-bold text-[#151515]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#10b981]" strokeWidth={2.5} />
                  <span>Verified deliverables for your CV</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#10b981]" strokeWidth={2.5} />
                  <span>Direct collaboration with founders</span>
                </li>
              </ul>
            </div>
            <Link
              href="/projects"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-black text-[#D83D63] hover:underline"
            >
              <span>Explore student challenges</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Card 2: Businesses */}
          <div className="group flex flex-col justify-between rounded-2xl border-2 border-[#111111] bg-white p-6 shadow-[4px_4px_0_#111111] transition hover:-translate-y-1 hover:shadow-[6px_6px_0_#111111]">
            <div>
              <div className="grid size-12 place-items-center rounded-xl border-2 border-[#111111] bg-[#FEF7E6] text-[#F2BE4E] shadow-[2px_2px_0_#111111]">
                <HeartHandshake size={22} strokeWidth={2.5} />
              </div>
              <h3 className="mt-5 text-xl font-black text-[#151515]">For businesses</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-[#655F52]">
                Get a fresh perspective and practical help from emerging talent. Describe what is difficult or slow, and get structured brief deliverables.
              </p>
              <ul className="mt-4 space-y-2 text-xs font-bold text-[#151515]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#10b981]" strokeWidth={2.5} />
                  <span>Guided project brief generator</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#10b981]" strokeWidth={2.5} />
                  <span>Targeted skills-based applicants</span>
                </li>
              </ul>
            </div>
            <Link
              href="/register"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-black text-[#D83D63] hover:underline"
            >
              <span>Post a business problem</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Card 3: Skills-first */}
          <div className="group flex flex-col justify-between rounded-2xl border-2 border-[#111111] bg-white p-6 shadow-[4px_4px_0_#111111] transition hover:-translate-y-1 hover:shadow-[6px_6px_0_#111111]">
            <div>
              <div className="grid size-12 place-items-center rounded-xl border-2 border-[#111111] bg-[#dbf5ed] text-[#059669] shadow-[2px_2px_0_#111111]">
                <Search size={22} strokeWidth={2.5} />
              </div>
              <h3 className="mt-5 text-xl font-black text-[#151515]">Skills-first matching</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-[#655F52]">
                Discover people by what they can do, not just what they studied. Transparent briefs, milestones, and Reddit-style peer community keep teams aligned.
              </p>
              <ul className="mt-4 space-y-2 text-xs font-bold text-[#151515]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#10b981]" strokeWidth={2.5} />
                  <span>Objective capability matching</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-[#10b981]" strokeWidth={2.5} />
                  <span>Shared community discussions</span>
                </li>
              </ul>
            </div>
            <Link
              href="/about"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-black text-[#D83D63] hover:underline"
            >
              <span>Learn how matching works</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-14 rounded-2xl border-2 border-[#111111] bg-white p-8 shadow-[6px_6px_0_#111111] sm:p-10">
          <div className="flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#D83D63]">
                Start Today
              </p>
              <h3 className="mt-1 text-2xl font-black text-[#151515] sm:text-3xl">
                Ready to turn real problems into real experience?
              </h3>
              <p className="mt-2 text-sm font-medium text-[#655F52]">
                Join students and local business owners building verified deliverables together.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-[#F2BE4E] px-5 py-3 text-sm font-black text-[#151515] shadow-[3px_3px_0_#111111] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#111111] active:translate-x-[1px] active:translate-y-[1px]"
              >
                <span>Get Started</span>
                <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-white px-5 py-3 text-sm font-black text-[#151515] shadow-[3px_3px_0_#111111] transition hover:bg-[#F7F0D2] active:translate-x-[1px] active:translate-y-[1px]"
              >
                <span>Browse Projects</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
