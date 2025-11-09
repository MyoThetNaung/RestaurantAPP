import type { Timestamp } from "firebase/firestore";

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

export function formatStatusLabel(status: string) {
  switch (status) {
    case "Pending":
      return "Pending";
    case "Cooking":
      return "Cooking";
    case "Ready":
      return "Ready";
    case "Delivered":
      return "Delivered";
    default:
      return status;
  }
}

export function timeSince(timestamp?: Timestamp) {
  if (!timestamp) return "just now";
  const diff = Date.now() - timestamp.toDate().getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 min ago";
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hr ago";
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}


