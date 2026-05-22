import Link from "next/link";

export type WorkflowHubCard = {
  href: string;
  title: string;
  description: string;
  status?: string;
  action: string;
};

export function WorkflowHub({ cards }: { cards: WorkflowHubCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="rounded-lg border border-border bg-panel p-5 shadow-sm transition hover:border-accent hover:bg-white"
        >
          {card.status ? <div className="mb-3 text-xs font-semibold text-muted">{card.status}</div> : null}
          <h2 className="text-base font-semibold text-ink">{card.title}</h2>
          <p className="mt-2 text-sm text-muted">{card.description}</p>
          <div className="mt-4 text-sm font-semibold text-accent">{card.action}</div>
        </Link>
      ))}
    </div>
  );
}
