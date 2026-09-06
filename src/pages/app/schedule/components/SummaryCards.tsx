interface SummaryCardsProps {
  summary: {
    total: number;
    published: number;
    draft: number;
    missingInfo: number;
  };
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Total events',
      value: summary.total,
      icon: 'ri-calendar-event-line',
      color: 'text-foreground-700',
      bg: 'bg-background-100',
    },
    {
      label: 'Published',
      value: summary.published,
      icon: 'ri-check-double-line',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Draft or hidden',
      value: summary.draft,
      icon: 'ri-draft-line',
      color: 'text-secondary-600',
      bg: 'bg-secondary-50',
    },
    {
      label: 'Missing times or venues',
      value: summary.missingInfo,
      icon: 'ri-error-warning-line',
      color: summary.missingInfo > 0 ? 'text-amber-600' : 'text-foreground-400',
      bg: summary.missingInfo > 0 ? 'bg-amber-50' : 'bg-background-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl p-5 bg-white border border-secondary-100">
          <div className={`w-9 h-9 flex items-center justify-center rounded-lg ${card.bg} ${card.color} mb-3`}>
            <i className={`${card.icon} text-base`} />
          </div>
          <p className="text-2xl font-heading font-semibold text-foreground-900">{card.value}</p>
          <p className="text-xs text-foreground-500 font-label mt-0.5">{card.label}</p>
        </div>
      ))}
    </div>
  );
}