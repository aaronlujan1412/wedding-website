export function TimelineConnector() {
  return (
    <div
      aria-hidden="true"
      className="min-h-0 w-[3px] flex-1"
      style={{
        backgroundImage:
          "radial-gradient(circle at center, var(--color-primary) 0 1px, transparent 1px)",
        backgroundSize: "3px 8px",
        backgroundRepeat: "repeat-y",
        backgroundPosition: "center",
      }}
    />
  );
}
