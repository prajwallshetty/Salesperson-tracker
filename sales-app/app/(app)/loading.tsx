import { SkeletonList } from "@/components/Skeleton";

// Shown by the App Router while a route segment's JS chunk is being fetched/hydrated
// (e.g. the first navigation into a tab on a slow 3G/4G connection) — a generic skeleton
// beats a blank screen for that brief window. Individual pages still own their own
// data-loading skeletons for the fetch that happens after the page has mounted.
export default function AppSectionLoading() {
  return (
    <div className="px-4 pt-4">
      <SkeletonList count={4} />
    </div>
  );
}
