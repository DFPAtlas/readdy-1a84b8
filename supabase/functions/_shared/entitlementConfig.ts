export type EntitlementPlan = "free" | "essential" | "complete" | "luxury";
export const PLAN_LIMITS = {
  "free": {
    "maxGuests": 20,
    "maxCollaborators": 1,
    "maxAlbums": 2,
    "maxCustomSections": 1,
    "maxEmailCampaigns": 0,
    "maxInvitations": 0,
    "galleryStorageMb": 100,
    "whiteLabel": false,
    "prioritySupport": false,
    "seatingPlanner": false,
    "budgetTracker": false,
    "travelConcierge": false,
    "customDomain": false,
    "apiAccess": false
  },
  "essential": {
    "maxGuests": 80,
    "maxCollaborators": 3,
    "maxAlbums": 5,
    "maxCustomSections": 3,
    "maxEmailCampaigns": 5,
    "maxInvitations": 80,
    "galleryStorageMb": 500,
    "whiteLabel": true,
    "prioritySupport": false,
    "seatingPlanner": false,
    "budgetTracker": false,
    "travelConcierge": true,
    "customDomain": false,
    "apiAccess": false
  },
  "complete": {
    "maxGuests": 200,
    "maxCollaborators": 10,
    "maxAlbums": 15,
    "maxCustomSections": 5,
    "maxEmailCampaigns": 20,
    "maxInvitations": 200,
    "galleryStorageMb": 2000,
    "whiteLabel": true,
    "prioritySupport": true,
    "seatingPlanner": true,
    "budgetTracker": true,
    "travelConcierge": true,
    "customDomain": false,
    "apiAccess": false
  },
  "luxury": {
    "maxGuests": null,
    "maxCollaborators": null,
    "maxAlbums": null,
    "maxCustomSections": null,
    "maxEmailCampaigns": null,
    "maxInvitations": null,
    "galleryStorageMb": 10000,
    "whiteLabel": true,
    "prioritySupport": true,
    "seatingPlanner": true,
    "budgetTracker": true,
    "travelConcierge": true,
    "customDomain": true,
    "apiAccess": true
  }
} as const;
export const FEATURE_PLANS = {
  "invitations": "essential",
  "communications": "essential",
  "travel": "essential",
  "gallery": "essential",
  "planning": "complete",
  "suppliers": "complete",
  "budget": "complete",
  "seating": "complete",
  "weddingDay": "luxury",
  "customDomain": "luxury",
  "premiumDesigns": "luxury",
  "apiAccess": "luxury",
  "prioritySupport": "complete",
  "websiteCustomization": "essential",
  "whiteLabel": "essential"
} as const;
export type PaidFeature = keyof typeof FEATURE_PLANS;
export function hasFeature(plan: EntitlementPlan, feature: PaidFeature): boolean {
 const order = ["free", "essential", "complete", "luxury"];
 return order.indexOf(plan) >= order.indexOf(FEATURE_PLANS[feature]);
}
