import { ListPageSkeleton } from "@/components/PageSkeletons";

export default function Loading() {
  return <ListPageSkeleton withAction withStats filters={2} cols={6} />;
}
