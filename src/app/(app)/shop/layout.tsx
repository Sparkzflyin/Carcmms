import { PageHeader } from "@/components/ui";
import { ShopTabs } from "./tabs";

export default function ShopLayout({ children }: LayoutProps<"/shop">) {
  return (
    <>
      <PageHeader eyebrow="Parts, suppliers & procedures" title="Shop" />
      <ShopTabs />
      {children}
    </>
  );
}
