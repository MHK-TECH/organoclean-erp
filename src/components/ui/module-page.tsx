import ModulePlaceholder from "@/components/ui/module-placeholder";
import { navGroups } from "@/lib/nav";

export default function ModulePage({ href }: { href: string }) {
  const item = navGroups.flatMap((g) => g.items).find((i) => i.href === href);
  if (!item) throw new Error(`Unknown module route: ${href}`);
  return <ModulePlaceholder item={item} />;
}
