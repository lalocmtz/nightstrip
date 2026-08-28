import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ",
  description: "How NIGHTSTRIP paid ranking, districts, crypto payments, and safety rules work.",
  alternates: { canonical: "/faq" },
};

const FAQ = [
  {
    question: "What is NIGHTSTRIP?",
    answer:
      "An advertising board where the order is bought. Casino Row and Red District are fully independent. NIGHTSTRIP is advertising, not gambling.",
  },
  {
    question: "How does ranking work?",
    answer:
      "The server ranks bids highest first; ties go to the earliest bid. Taking #1 costs $5 more than the current #1, or $10 when the district is empty. The minimum bid is $10.",
  },
  {
    question: "What if I already have a listing?",
    answer:
      "If your wallet already holds a spot in that district, you pay only the difference required to raise your bid.",
  },
  {
    question: "Does my rank ever reset?",
    answer: "No. There is no midnight wipe. You stay ranked until someone outbids you.",
  },
  {
    question: "How do I pay?",
    answer:
      "Payments are crypto through NOWPayments, including USDT and Binance Pay where available. NIGHTSTRIP does not process bets or take cards through this flow.",
  },
  {
    question: "Does NIGHTSTRIP host adult content?",
    answer:
      "No. The feed is SFW. Explicit destinations remain off-site behind Visitar and an 18+ confirmation. NIGHTSTRIP hosts zero adult media.",
  },
  {
    question: "Are the listings real?",
    answer:
      "Yes. Empty districts show Take #1 for $10. There are no fake listings, fake live visitor counts, or invented activity.",
  },
  {
    question: "What happens after I pay?",
    answer:
      "Your rank is applied after the signed final payment notification arrives from NOWPayments. NIGHTSTRIP then creates a receipt.",
  },
  {
    question: "Can I link anywhere?",
    answer:
      "No. Destinations must use HTTPS and pass automated URL safety checks. Malicious, phishing, shortened, or illegal destinations are prohibited and can be removed.",
  },
] as const;

export default function FaqPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <p className="text-xs tracking-[0.3em] text-[var(--magenta)]">NIGHTSTRIP</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-white">FAQ</h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">
        The rules behind the paid-rank board, payments, and off-site destinations.
      </p>
      <dl className="mt-10 space-y-8">
        {FAQ.map((item) => (
          <div key={item.question} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <dt className="text-lg font-semibold text-white">{item.question}</dt>
            <dd className="mt-2 leading-7 text-[var(--muted)]">{item.answer}</dd>
          </div>
        ))}
      </dl>
      <Link href="/" className="mt-10 inline-flex text-[var(--cta)]">
        Back to the Board
      </Link>
    </main>
  );
}
