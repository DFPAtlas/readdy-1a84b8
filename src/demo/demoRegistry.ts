import type { DemoRegistryItem } from './demoTypes';
import { DEMO_CONFIG } from './demoConfig';

const W = DEMO_CONFIG.weddingId;

export const demoRegistryItems: DemoRegistryItem[] = [
  {
    id: 'demo-registry-kitchenaid', wedding_id: W, registry_id: 'demo-registry-1', name: 'KitchenAid Artisan Stand Mixer',
    description: 'The classic 4.8L stand mixer in Pistachio. Perfect for our weekend baking experiments and Sunday morning pancake sessions.',
    price: 449, currency: 'GBP', item_type: 'gift',
    image_prompt: 'KitchenAid Artisan stand mixer in pistachio green on a marble kitchen counter with soft morning light, editorial product photography, clean minimalist background',
    reserved: false, contribution_count: 0, total_contributed: 0,
  },
  {
    id: 'demo-registry-lecreuset', wedding_id: W, registry_id: 'demo-registry-1', name: 'Le Creuset Signature Cast Iron Casserole Dish',
    description: 'A timeless 26cm casserole dish in Meringue. For slow-cooked Sunday roasts, hearty winter stews, and everything in between.',
    price: 285, currency: 'GBP', item_type: 'gift',
    image_prompt: 'Le Creuset cast iron casserole dish in cream meringue color on a rustic wooden table, warm kitchen lighting, editorial food photography style',
    reserved: true, contribution_count: 0, total_contributed: 0,
  },
  {
    id: 'demo-registry-honeymoon', wedding_id: W, registry_id: 'demo-registry-1', name: 'Honeymoon Safari Experience',
    description: 'Contribute towards our dream honeymoon — a three-day safari in the Maasai Mara, Kenya. This fund will help cover game drives, accommodation, and unforgettable wildlife encounters.',
    price: 2500, currency: 'GBP', item_type: 'fund',
    image_prompt: 'African savanna at golden hour with acacia trees and wildlife in the distance, warm amber light, dreamy travel photography aesthetic',
    reserved: false, contribution_count: 3, total_contributed: 450,
  },
];