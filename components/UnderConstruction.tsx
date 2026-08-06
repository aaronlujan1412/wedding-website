type Props = {
  eyebrow: string;
  title: string;
  message: string;
};

export function UnderConstruction({ eyebrow, title, message }: Props) {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 pt-40 pb-24 text-center">
      <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-corinthia text-7xl text-pop md:text-8xl">
        {title}
      </h1>
      <p className="mx-auto mt-4 max-w-xl font-garamond text-xl italic text-muted-foreground md:text-2xl">
        {message}
      </p>
    </main>
  );
}
