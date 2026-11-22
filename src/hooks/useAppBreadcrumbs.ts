import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { BreadcrumbItem } from '@/components/base/Breadcrumbs';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { supabase } from '@/lib/supabase';
import { getSeatingPlanName, rememberSeatingPlanName } from '@/lib/seatingPlanNames';
import { getSeatingProposalTitle, rememberSeatingProposalTitle } from '@/lib/seatingProposalNames';

/** The app area always starts here. */
export const APP_ENTRY: BreadcrumbItem = { label: 'Dashboard', to: '/app/dashboard' };

/** In-bar trail for the full-screen invitation editor. */
export const INVITATION_EDITOR_TRAIL: BreadcrumbItem[] = [
  APP_ENTRY,
  { label: 'Invitations', to: '/app/invitations' },
  { label: 'Edit invitation' },
];

/**
 * In-bar trail for the full-screen seating canvas.
 * The final crumb uses the plan's real name so the bar says which plan is open.
 */
export function seatingPlanTrail(planName?: string): BreadcrumbItem[] {
  const name = planName?.trim();
  return [
    APP_ENTRY,
    { label: 'Seating', to: '/app/seating' },
    { label: 'Plans', to: '/app/seating/plans' },
    { label: name || 'Seating plan' },
  ];
}

/** Fallback trail used before the plan has loaded. */
export const SEATING_PLAN_TRAIL: BreadcrumbItem[] = seatingPlanTrail();

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  wedding: 'Wedding details',
  styleboard: 'Styleboard',
  onboarding: 'Onboarding',
  guests: 'Guests',
  households: 'Households',
  tags: 'Tags',
  import: 'Import guests',
  export: 'Export',
  invitations: 'Invitations',
  templates: 'Templates',
  responses: 'Responses',
  preview: 'Preview',
  access: 'Share access',
  questions: 'Guest questions',
  updates: 'Updates',
  travel: 'Travel',
  tasks: 'Tasks',
  suppliers: 'Vendors',
  gallery: 'Gallery',
  'gallery-control': 'Gallery',
  budget: 'Budget',
  categories: 'Categories',
  payments: 'Payments',
  scenarios: 'Scenarios',
  reports: 'Reports',
  settings: 'Settings',
  seating: 'Seating',
  plans: 'Plans',
  versions: 'Versions',
  groups: 'Groups',
  rules: 'Rules',
  conflicts: 'Conflicts',
  assistant: 'Assistant',
  publish: 'Publish',
  'day-mode': 'Day mode',
  'table-cards': 'Table cards',
  'place-cards': 'Place cards',
  audit: 'Audit',
  exports: 'Exports',
  schedule: 'Schedule',
  website: 'Wedding website',
  domain: 'Domain',
  seo: 'SEO',
  calendar: 'Calendar',
  timeline: 'Day timeline',
  notifications: 'Notifications',
  activity: 'Activity',
  search: 'Search',
  billing: 'Plans & billing',
  'getting-started': 'Getting started',
  help: 'Help Centre',
  admin: 'Admin',
  'system-readiness': 'System readiness',
  operations: 'Operations',
  incidents: 'Incidents',
  support: 'Support',
  releases: 'Releases',
  analytics: 'Analytics',
  feedback: 'Feedback',
  improvements: 'Improvements',
  backups: 'Backups',
  recovery: 'Recovery',
  'data-protection': 'Data protection',
  performance: 'Performance',
  account: 'Account',
  profile: 'Profile',
  security: 'Account security',
  privacy: 'Privacy & data',
  collaborators: 'Collaborators',
  'rsvp-settings': 'RSVP settings',
  'after-wedding': 'After the wedding',
};

/** Friendly names for "new" pages, keyed by parent segment. */
const NEW_LABELS: Record<string, string> = {
  guests: 'Add guest',
  households: 'New household',
  invitations: 'New invitation',
  templates: 'New template',
  seating: 'New plan',
  design: 'New design',
};

/** Friendly names for "edit" pages, keyed by the entity segment two levels up. */
const EDIT_LABELS: Record<string, string> = {
  guests: 'Edit guest',
  households: 'Edit household',
  invitations: 'Edit invitation',
  templates: 'Edit template',
};

/** Friendly names for record ids, keyed by parent segment. */
const RECORD_LABELS: Record<string, string> = {
  guests: 'Guest details',
  households: 'Household',
  invitations: 'Invitation',
  templates: 'Template',
  plans: 'Seating plan',
  assistant: 'Proposal',
  proposals: 'Proposal',
};

/** Segments that have no page of their own, so the crumb is plain text. */
const NON_LINKABLE_SEGMENTS = new Set(['account', 'admin', 'design']);

/** Layouts that own the whole viewport, where a trail bar would crowd the workspace. */
const WORKSPACE_ROUTES: RegExp[] = [
  /^\/app\/invitations\/[^/]+\/edit$/,
  /^\/app\/seating\/plans\/[^/]+$/,
];

function isRecordId(segment: string): boolean {
  if (/^\d+$/.test(segment)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true;
  return /^[0-9a-f]{16,}$/i.test(segment);
}

function humanise(segment: string): string {
  const spaced = segment.replace(/[-_]+/g, ' ').trim();
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

function labelForSegment(
  segment: string,
  parent: string | undefined,
  grandParent: string | undefined,
): string {
  if (isRecordId(segment)) {
    // Seating plan sub-pages (groups, rules, reports…) are named after the real plan.
    if (parent === 'plans') {
      const planName = getSeatingPlanName(segment);
      if (planName) return planName;
    }
    // Assistant proposals are named after the scope they were generated with.
    if (parent === 'assistant' || parent === 'proposals') {
      const proposalTitle = getSeatingProposalTitle(segment);
      if (proposalTitle) return proposalTitle;
    }
    return (parent && RECORD_LABELS[parent]) || 'Details';
  }
  if (segment === 'new') return (parent && NEW_LABELS[parent]) || 'New';
  if (segment === 'edit') return (grandParent && EDIT_LABELS[grandParent]) || 'Edit';
  if (parent === 'help') return 'Help article';
  if (segment === 'design' && parent === 'invitations') return 'Create a design';
  if (segment === 'setup' && parent === 'budget') return 'Set up budget';
  if (segment === 'gift-funding' && parent === 'budget') return 'Gift fund';
  return SEGMENT_LABELS[segment] ?? humanise(segment);
}

/**
 * Builds a semantic trail for the current /app route: Dashboard > section > sub-page > current.
 * Record ids are never printed as raw ids – they become a readable page name.
 */
export default function useAppBreadcrumbs(): BreadcrumbItem[] {
  const { pathname } = useLocation();
  const { weddingId } = useActiveWedding();
  const [, refreshPlanName] = useState(0);

  // Any /app/seating/plans/:planId route – the canvas and every sub-page under it.
  const planIdMatch = pathname.match(/^\/app\/seating\/plans\/([^/]+)/);
  const planId = planIdMatch ? planIdMatch[1] : undefined;

  // A single assistant proposal – the trail names it after its scope.
  const proposalIdMatch = pathname.match(/^\/app\/seating\/plans\/[^/]+\/assistant\/([^/]+)/);
  const proposalId = proposalIdMatch ? proposalIdMatch[1] : undefined;

  useEffect(() => {
    if (!planId || !weddingId || isDemoMode) return;

    let cancelled = false;
    supabase
      .from('seating_plans')
      .select('id, name')
      .eq('id', planId)
      .eq('wedding_id', weddingId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const name = (data as { name?: string | null } | null)?.name?.trim();
        if (!name || getSeatingPlanName(planId) === name) return;
        rememberSeatingPlanName(planId, name);
        refreshPlanName((version) => version + 1);
      });

    return () => { cancelled = true; };
  }, [planId, weddingId]);

  useEffect(() => {
    if (!proposalId || !weddingId || isDemoMode) return;
    if (getSeatingProposalTitle(proposalId)) return;

    let cancelled = false;
    supabase
      .from('seating_assistant_proposals')
      .select('id, scope')
      .eq('id', proposalId)
      .eq('wedding_id', weddingId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const scope = (data as { scope?: string | null } | null)?.scope;
        if (!scope) return;
        rememberSeatingProposalTitle(proposalId, scope);
        refreshPlanName((version) => version + 1);
      });

    return () => { cancelled = true; };
  }, [proposalId, weddingId]);

  if (!pathname.startsWith('/app/') && pathname !== '/app') return [];
  if (WORKSPACE_ROUTES.some((pattern) => pattern.test(pathname))) return [];

  const segments = pathname.replace(/^\/app\/?/, '').split('/').filter(Boolean);
  if (segments.length === 0) return [];

  // The dashboard is the app root – don't print it twice as both entry and current page.
  const items: BreadcrumbItem[] = segments[0] === 'dashboard' ? [] : [APP_ENTRY];

  segments.forEach((segment, index) => {
    const parent = index > 0 ? segments[index - 1] : undefined;
    const grandParent = index > 1 ? segments[index - 2] : undefined;
    const label = labelForSegment(segment, parent, grandParent);
    const canLink = !NON_LINKABLE_SEGMENTS.has(segment);
    const to = canLink ? `/app/${segments.slice(0, index + 1).join('/')}` : undefined;
    items.push(to ? { label, to } : { label });
  });

  // A single crumb ("Dashboard") adds no value on the dashboard itself.
  if (items.length < 2) return [];

  return items;
}