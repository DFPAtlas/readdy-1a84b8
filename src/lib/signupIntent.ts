import type { BillingPlanKey } from "@/types/billing";

export function safeReturnPath(
  value: string | null | undefined,
): string | null {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return null;
  return value;
}

export function selectedPlan(value: unknown): BillingPlanKey | null {
  return ["free", "essential", "complete", "luxury"].includes(String(value))
    ? (value as BillingPlanKey)
    : null;
}

export function accountDestination(
  metadata: Record<string, unknown> | undefined,
): string {
  const join = safeReturnPath(
    typeof metadata?.signup_return_to === "string"
      ? metadata.signup_return_to
      : null,
  );
  if (join?.startsWith("/join/")) return join;
  const plan = selectedPlan(metadata?.selected_plan);
  return plan && plan !== "free"
    ? `/app/onboarding?plan=${plan}`
    : "/app/onboarding";
}
