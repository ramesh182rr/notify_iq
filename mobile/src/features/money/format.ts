const symbols: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

/** Formats minor units; INR uses Indian digit grouping (1,23,456). No Intl dependency. */
export function formatMoney(minor: number, currency: string, options: { compact?: boolean; whole?: boolean } = {}) {
  const symbol = symbols[currency] ?? `${currency} `;
  const major = Math.abs(minor) / 100;
  if (options.compact && major >= 100000 && currency === 'INR') return `${symbol}${trim(major / 100000)}L`;
  if (options.compact && major >= 1000) return `${symbol}${trim(major / 1000)}k`;
  const dropPaise = options.whole || options.compact;
  const [whole, fraction] = (dropPaise ? Math.round(major).toFixed(2) : major.toFixed(2)).split('.');
  const grouped = currency === 'INR' ? groupIndian(whole) : whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${symbol}${grouped}${fraction === '00' ? '' : `.${fraction}`}`;
}

function trim(value: number) {
  return value >= 10 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, '');
}

function groupIndian(whole: string) {
  if (whole.length <= 3) return whole;
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

export type MoneyCategoryMeta = { label: string; emoji: string; color: string };

/** Spending and income categories with a distinct chart colour that reads on light and dark surfaces. */
export const moneyCategories: Record<string, MoneyCategoryMeta> = {
  food: { label: 'Food & dining', emoji: '🍽️', color: '#F2994A' },
  snacks: { label: 'Snacks & cafés', emoji: '☕', color: '#C77D4A' },
  groceries: { label: 'Groceries', emoji: '🛒', color: '#27AE60' },
  fuel: { label: 'Fuel', emoji: '⛽', color: '#EB5757' },
  transport: { label: 'Transport', emoji: '🚕', color: '#F2C94C' },
  tickets: { label: 'Tickets & travel', emoji: '✈️', color: '#2D9CDB' },
  entertainment: { label: 'Movies & fun', emoji: '🎬', color: '#BB6BD9' },
  subscriptions: { label: 'Subscriptions', emoji: '🔁', color: '#9B51E0' },
  shopping: { label: 'Shopping', emoji: '🛍️', color: '#E94E77' },
  bills: { label: 'Bills & recharges', emoji: '💡', color: '#56CCF2' },
  rent: { label: 'Rent & home', emoji: '🏠', color: '#6FCF97' },
  health: { label: 'Health', emoji: '💊', color: '#EF6F6C' },
  education: { label: 'Education', emoji: '🎓', color: '#5B7CFA' },
  personal_care: { label: 'Personal care', emoji: '💇', color: '#F78FB3' },
  loans_insurance: { label: 'Loans & insurance', emoji: '🛡️', color: '#8D99AE' },
  investments: { label: 'Investments', emoji: '📈', color: '#1ABC9C' },
  transfers: { label: 'Sent to people', emoji: '↗️', color: '#7F8C8D' },
  cash: { label: 'Cash', emoji: '🏧', color: '#A0A08B' },
  other: { label: 'Other', emoji: '🧾', color: '#9AA0A6' },
  salary: { label: 'Salary', emoji: '💼', color: '#27AE60' },
  refund: { label: 'Refunds', emoji: '↩️', color: '#2D9CDB' },
  cashback: { label: 'Cashback & rewards', emoji: '🎁', color: '#F2C94C' },
  interest: { label: 'Interest & dividends', emoji: '🏦', color: '#1ABC9C' },
  transfers_in: { label: 'From people', emoji: '↙️', color: '#BB6BD9' },
  other_income: { label: 'Other income', emoji: '💰', color: '#9AA0A6' },
};

export const spendCategoryKeys = ['food', 'snacks', 'groceries', 'fuel', 'transport', 'tickets', 'entertainment', 'subscriptions', 'shopping', 'bills', 'rent', 'health', 'education', 'personal_care', 'loans_insurance', 'investments', 'transfers', 'cash', 'other'];
export const incomeCategoryKeys = ['salary', 'refund', 'cashback', 'interest', 'transfers_in', 'other_income'];

export function categoryMeta(key: string): MoneyCategoryMeta {
  return moneyCategories[key] ?? moneyCategories.other;
}

/** Kept for older callers. */
export const spendCategoryNames = moneyCategories;

export const actionKinds: Record<string, { label: string; emoji: string }> = {
  bill_due: { label: 'Bill due', emoji: '🧾' },
  subscription_renewal: { label: 'Renews', emoji: '🔁' },
  expiry: { label: 'Expires', emoji: '⏳' },
  appointment: { label: 'Appointment', emoji: '🩺' },
  task: { label: 'To do', emoji: '✅' },
};

export function dueLabel(dueAt: number, hasTime: boolean, now = Date.now()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const dueDay = new Date(dueAt); dueDay.setHours(0, 0, 0, 0);
  const days = Math.round((dueDay.getTime() - start.getTime()) / 86_400_000);
  const time = hasTime ? ` · ${new Date(dueAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : '';
  if (days < 0) return { text: `${-days === 1 ? 'Yesterday' : `${-days} days ago`}${time}`, tone: 'overdue' as const };
  if (days === 0) return { text: `Today${time}`, tone: 'soon' as const };
  if (days === 1) return { text: `Tomorrow${time}`, tone: 'soon' as const };
  const date = new Date(dueAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return { text: `${date}${time} · in ${days} days`, tone: days <= 7 ? ('week' as const) : ('later' as const) };
}
