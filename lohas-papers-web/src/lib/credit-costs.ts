export const CREDIT_COSTS = {
  search: 1.0,
  paper_detail: 0.3,
  fulltext: 3.0,
} as const;

export type CreditOperation = keyof typeof CREDIT_COSTS;
