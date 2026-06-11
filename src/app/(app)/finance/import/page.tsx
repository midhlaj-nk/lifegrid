import { requireUser } from "@/lib/session";
import {
  getAccountsWithBalances,
  getCategories,
  getRules,
} from "@/lib/finance-queries";
import { ImportClient } from "./import-client";

export default async function ImportPage() {
  const user = await requireUser();
  const [accounts, categories, rules] = await Promise.all([
    getAccountsWithBalances(user.id),
    getCategories(user.id),
    getRules(user.id),
  ]);

  return (
    <ImportClient
      accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
      categories={categories}
      rules={rules}
    />
  );
}
