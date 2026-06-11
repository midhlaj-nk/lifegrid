import { requireUser } from "@/lib/session";
import { getVaultMeta, listVaultItems } from "@/actions/vault";
import { VaultClient } from "./vault-client";

export default async function VaultPage() {
  await requireUser();
  const [meta, items] = await Promise.all([getVaultMeta(), listVaultItems()]);

  return (
    <VaultClient
      initialized={!!meta}
      salt={meta?.salt ?? null}
      keyCheck={meta?.keyCheck ?? null}
      iterations={meta?.iterations ?? 600000}
      items={items.map((i) => ({
        id: i.id,
        type: i.type,
        data: i.data,
        updatedAt: i.updatedAt.toISOString(),
      }))}
    />
  );
}
