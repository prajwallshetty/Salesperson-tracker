"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Container } from "../Container";
import { SectionHeading } from "../SectionHeading";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "What is Sales Grid?",
    a: "Sales Grid is a field sales management platform for companies that manage sales teams, customers, visits, leads, orders and field operations.",
  },
  {
    q: "Who is Sales Grid built for?",
    a: "Companies with a field sales team — distribution, FMCG, retail, B2B sales and service teams that need visibility into what their salespeople are doing in the field.",
  },
  {
    q: "Can I manage multiple salespeople?",
    a: "Yes. Add salespeople, assign managers and territories, and manage them all from one admin dashboard. Plans differ by how many salespeople you can add.",
  },
  {
    q: "Does Sales Grid support GPS tracking?",
    a: "Yes. Salespeople check in and out of visits with real device GPS, and admins can see field activity on a live map during active field work.",
  },
  {
    q: "Can I manage customers and leads?",
    a: "Yes. Customers, leads and their full visit and order history are organized in one place, owned by the assigned salesperson.",
  },
  {
    q: "Can I track field visits?",
    a: "Yes. Plan visits, check in and out with GPS verification, attach notes and photos, and see visit status in real time.",
  },
  {
    q: "Can I manage targets?",
    a: "Yes. Set daily, weekly or monthly targets per salesperson and track achievement percentage as orders come in.",
  },
  {
    q: "Can Sales Grid support multiple companies?",
    a: "Yes. Sales Grid is multi-tenant — each company's data is fully isolated in its own workspace.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Creating a workspace starts a trial on the Starter plan — no credit card required to get started.",
  },
  {
    q: "Can I upgrade my plan later?",
    a: "Yes. You can move to a higher plan at any time as your team grows.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-16 bg-muted/40 py-20 sm:py-28">
      <Container className="max-w-3xl">
        <SectionHeading title="Frequently asked questions" />
        <div className="mt-10 divide-y divide-border/70 rounded-2xl border border-border/70 bg-card shadow-card">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
                >
                  <span className="text-sm font-semibold text-foreground sm:text-base">{item.q}</span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground sm:px-6">{item.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
