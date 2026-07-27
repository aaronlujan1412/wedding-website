export function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-8">
      <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-garamond text-3xl text-foreground md:text-4xl">
        {title}
      </h2>
    </div>
  );
}
