const symbols: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

/** Formats minor units; INR uses Indian digit grouping (1,23,456). No Intl dependency. */
export function formatMoney(minor: number, currency: string, options: { compact?: boolean } = {}) {
  const symbol = symbols[currency] ?? `${currency} `;
  const major = Math.abs(minor) / 100;
  if (options.compact && major >= 100000 && currency === 'INR') return `${symbol}${trim(major / 100000)}L`;
  if (options.compact && major >= 1000) return `${symbol}${trim(major / 1000)}k`;
  const [whole, fraction] = major.toFixed(2).split('.');
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

export const spendCategoryNames: Record<string, { label: string; emoji: string }> = {
  food: { label: 'Food & dining', emoji: '🍽️' },
  groceries: { label: 'Groceries', emoji: '🛒' },
  shopping: { label: 'Shopping', emoji: '🛍️' },
  subscriptions: { label: 'Subscriptions', emoji: '🔁' },
  travel: { label: 'Travel & transport', emoji: '🚕' },
  fuel: { label: 'Fuel', emoji: '⛽' },
  bills: { label: 'Bills & utilities', emoji: '💡' },
  health: { label: 'Health', emoji: '💊' },
  transfers: { label: 'Transfers', emoji: '↔️' },
  cash: { label: 'Cash withdrawals', emoji: '🏧' },
  income: { label: 'Money in', emoji: '💰' },
  other: { label: 'Other', emoji: '🧾' },
};

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
