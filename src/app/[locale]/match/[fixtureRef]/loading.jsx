import { RouteSkeleton } from "../../../../components/coreui/route-skeleton";

export default function Loading() {
  return <RouteSkeleton cards={4} showFilters={false} />;
}
