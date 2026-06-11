import { requireUser } from "@/lib/session";
import {
  getAccountsWithBalances,
  getCategories,
  getSubscriptions,
} from "@/lib/finance-queries";
import { SubscriptionsClient } from "./subscriptions-client";

export default async function SubscriptionsPage() {
  const user = await requireUser();
  const [subs, accounts, categories] = await Promise.all([
    getSubscriptions(user.id),
    getAccountsWithBalances(user.id),
    getCategories(user.id),
  ]);

  return (
    <SubscriptionsClient
      subscriptions={subs}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
      categories={categories.filter((c) => c.kind === "expense")}
    />
  );
}
