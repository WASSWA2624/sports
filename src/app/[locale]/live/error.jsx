"use client";

import { RouteError } from "../../../components/coreui/route-error";

export default function Error({ reset }) {
  return (
    <RouteError
      title="Live page unavailable"
      body="We couldn't build the live feed right now. Try the request again."
      reset={reset}
    />
  );
}
