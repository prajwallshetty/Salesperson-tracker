import { ListPageSkeleton } from "@/components/PageSkeletons";

export default function Loading() {
  return <ListPageSkeleton withAction filters={2} cols={7} />;
}
