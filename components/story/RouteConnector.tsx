export function RouteConnector({ direction }: { direction: "left" | "right" }) {
  const d =
    direction === "right"
      ? "M 12 0 C 24 40, 24 80, 12 120"
      : "M 12 0 C 0 40, 0 80, 12 120";

  return (
    <svg
      viewBox="0 0 24 120"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="w-full min-h-0 flex-1"
    >
      <path
        d={d}
        fill="none"
        className="stroke-primary"
        strokeWidth={2}
        strokeDasharray="1 7"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
