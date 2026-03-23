"use client";

import { RouteError } from "../../../../components/coreui/route-error";

export default function Error({ reset }) {
  return (
    <RouteError
      title="Match centre unavailable"
      body="We hit a rendering issue while assembling this fixture view. Try again."
      reset={reset}
    />
  );
}
