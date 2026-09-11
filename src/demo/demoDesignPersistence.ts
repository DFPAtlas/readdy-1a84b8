import type { InvitationDocument } from '@/pages/app/invitations/[invitationId]/edit/types';
import { DEFAULT_INVITATION } from '@/pages/app/invitations/[invitationId]/edit/data';

const DEMO_DESIGNS_KEY = 'vowora.demo.designs';
const DEMO_DESIGN_ACTIVE_ID = 'vowora.demo.design.activeId';

interface StoredDesign {
  id: string;
  title: string;
  document: InvitationDocument;
  updated_at: string;
}

function getAllDesigns(): StoredDesign[] {
  try {
    const raw = localStorage.getItem(DEMO_DESIGNS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAllDesigns(designs: StoredDesign[]) {
  localStorage.setItem(DEMO_DESIGNS_KEY, JSON.stringify(designs));
}

export function getActiveDesignId(): string | null {
  return localStorage.getItem(DEMO_DESIGN_ACTIVE_ID);
}

export function loadDemoDesign(id: string): { success: boolean; data?: StoredDesign; error?: string } {
  const designs = getAllDesigns();
  const found = designs.find((d) => d.id === id);
  if (!found) {
    return { success: false, error: 'Design not found' };
  }
  return { success: true, data: found };
}

export function createDemoDesign(document: InvitationDocument, title: string): { success: boolean; id: string; updatedAt: string; error?: string } {
  const designs = getAllDesigns();
  const id = `demo-design-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const design: StoredDesign = { id, title, document, updated_at: now };
  designs.push(design);
  saveAllDesigns(designs);
  localStorage.setItem(DEMO_DESIGN_ACTIVE_ID, id);
  return { success: true, id, updatedAt: now };
}

export function saveDemoDesign(id: string, document: InvitationDocument, title: string): { success: boolean; updatedAt: string; error?: string } {
  const designs = getAllDesigns();
  const idx = designs.findIndex((d) => d.id === id);
  const now = new Date().toISOString();
  if (idx === -1) {
    return { success: false, error: 'Design not found' };
  }
  designs[idx] = { ...designs[idx], title, document, updated_at: now };
  saveAllDesigns(designs);
  return { success: true, updatedAt: now };
}

export function getDefaultDemoDocument(): InvitationDocument {
  return JSON.parse(JSON.stringify(DEFAULT_INVITATION));
}