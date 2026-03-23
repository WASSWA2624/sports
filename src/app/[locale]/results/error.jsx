"use client";

import { RouteError } from "../../../components/coreui/route-error";

export default function Error({ reset }) {
  return (
    <RouteError
      title="Results page unavailable"
      body="We couldn't load the latest result snapshots right now. Try again."
      reset={reset}
    />
  );
}
