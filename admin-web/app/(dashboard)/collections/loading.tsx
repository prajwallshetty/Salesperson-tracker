import { ListPageSkeleton } from "@/components/PageSkeletons";

export default function Loading() {
  return <ListPageSkeleton filters={3} cols={5} />;
}
