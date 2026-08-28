export const DISTRICTS = ["casino", "red"] as const;
export type District = (typeof DISTRICTS)[number];

export const MIN_BID_USD = 10;
export const TAKE_STEP_USD = 5;
export const DEMO_GRANT_USD = 5000;

export const DISTRICT_META: Record<
  District,
  {
    label: string;
    short: string;
    kicker: string;
    color: string;
    hex: string;
  }
> = {
  casino: {
    label: "Casino Row",
    short: "Casino",
    kicker: "Tipsters · Sports · Casino bonuses",
    color: "gold",
    hex: "#F5C451",
  },
  red: {
    label: "Red District",
    short: "Red",
    kicker: "Creators · Paid Telegram · Teasers 18+",
    color: "magenta",
    hex: "#FF4D8D",
  },
};

export function isDistrict(value: string | null | undefined): value is District {
  return value === "casino" || value === "red";
}
