type Props = {
  message: string;
};

export default function ErrorBox({ message }: Props) {
  return (
    <div className="rounded-xl bg-red-400 text-center max-w-min">
      <h1 className="p-2">{message}</h1>
    </div>
  );
}
