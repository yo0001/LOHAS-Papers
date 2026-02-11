import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    });
  }
  return _stripe;
}

export const PRICE_MAP = {
  starter: {
    priceId: process.env.STRIPE_PRICE_STARTER || "",
    credits: 6,
    amount: 600,
  },
  standard: {
    priceId: process.env.STRIPE_PRICE_STANDARD || "",
    credits: 25,
    amount: 2200,
  },
  premium: {
    priceId: process.env.STRIPE_PRICE_PREMIUM || "",
    credits: 70,
    amount: 5500,
  },
  pro: {
    priceId: process.env.STRIPE_PRICE_PRO || "",
    credits: 60,
    amount: 4980,
  },
  lab: {
    priceId: process.env.STRIPE_PRICE_LAB || "",
    credits: 200,
    amount: 29800,
  },
  institutional: {
    priceId: process.env.STRIPE_PRICE_INSTITUTIONAL || "",
    credits: 1000,
    amount: 98000,
  },
} as const;

export type PlanKey = keyof typeof PRICE_MAP;

export const ONE_TIME_PLANS: PlanKey[] = ["starter", "standard", "premium"];
export const SUBSCRIPTION_PLANS: PlanKey[] = ["pro", "lab", "institutional"];
