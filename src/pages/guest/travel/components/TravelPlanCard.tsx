import type { GuestTravelPlan } from '@/types/access';

interface TravelPlanCardProps {
  plan: GuestTravelPlan;
  placeName?: string;
  onEdit: (plan: GuestTravelPlan) => void;
  onDelete: (planId: string) => void;
}

const LABEL_MAP: Record<string, { label: string; icon: string }> = {
  accommodation: { label: 'Accommodation', icon: 'ri-hotel-line' },
  transport: { label: 'Transport', icon: 'ri-train-line' },
  note: { label: 'Travel Note', icon: 'ri-sticky-note-line' },
};

export default function TravelPlanCard({ plan, placeName, onEdit, onDelete }: TravelPlanCardProps) {
  const info = LABEL_MAP[plan.plan_type] || { label: plan.plan_type, icon: 'ri-map-pin-line' };

  const formatDate = (d?: string) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const checkIn = formatDate(plan.check_in_date);
  const checkOut = formatDate(plan.check_out_date);

  return (
    <div className="bg-white rounded-lg border border-secondary-200/70 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center rounded-md bg-secondary-50 text-secondary-400 flex-shrink-0">
            <i className={`${info.icon} text-sm`} />
          </div>
          <div>
            <h3 className="text-sm font-label font-semibold text-foreground-900">{info.label}</h3>
            {placeName && <p className="text-[11px] text-foreground-400">{placeName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onEdit(plan)}
            className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
            title="Edit"
          >
            <i className="ri-edit-line text-xs" />
          </button>
          <button
            onClick={() => onDelete(plan.id)}
            className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            title="Delete"
          >
            <i className="ri-delete-bin-line text-xs" />
          </button>
        </div>
      </div>

      {(checkIn || checkOut) && (
        <div className="flex flex-wrap gap-3 mb-2">
          {checkIn && (
            <div className="flex items-center gap-1 text-[11px] text-foreground-500">
              <i className="ri-calendar-check-line text-xs text-foreground-400" />
              <span>Check-in: <strong className="font-medium text-foreground-700">{checkIn}</strong></span>
            </div>
          )}
          {checkOut && (
            <div className="flex items-center gap-1 text-[11px] text-foreground-500">
              <i className="ri-calendar-close-line text-xs text-foreground-400" />
              <span>Check-out: <strong className="font-medium text-foreground-700">{checkOut}</strong></span>
            </div>
          )}
        </div>
      )}

      {plan.booking_reference && (
        <div className="flex items-center gap-1 text-[11px] text-foreground-500 mb-1">
          <i className="ri-key-line text-xs text-foreground-400" />
          <span>Ref: <strong className="font-medium text-foreground-700">{plan.booking_reference}</strong></span>
        </div>
      )}

      {plan.transport_needs && (
        <div className="flex items-center gap-1 text-[11px] text-foreground-500 mb-1">
          <i className="ri-car-line text-xs text-foreground-400" />
          <span>{plan.transport_needs}</span>
        </div>
      )}

      {plan.notes && (
        <p className="text-[11px] text-foreground-400 leading-relaxed mt-1">{plan.notes}</p>
      )}
    </div>
  );
}