import { requireUser } from "@/lib/session";
import { getAccountsWithBalances } from "@/lib/finance-queries";
import { AccountsClient } from "./accounts-client";

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await getAccountsWithBalances(user.id);
  return <AccountsClient accounts={accounts} />;
}
