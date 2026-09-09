import { Check, Loader2, X } from "lucide-react";
import type { QueueItem } from "./usePhotoUpload";

export function UploadQueue({ items }: { items: QueueItem[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-5 grid gap-1.5 text-left">
      {items.map((item) => (
        <li key={item.key} className="flex items-start gap-2 font-raleway text-sm">
          <StatusIcon status={item.status} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-foreground/80">{item.name}</span>
            {item.message && (
              <span className="block text-xs text-destructive">{item.message}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function StatusIcon({ status }: { status: QueueItem["status"] }) {
  const shared = "mt-0.5 h-4 w-4 shrink-0";
  if (status === "done")
    return <Check className={`${shared} text-primary`} strokeWidth={2} />;
  if (status === "error")
    return <X className={`${shared} text-destructive`} strokeWidth={2} />;
  return (
    <Loader2
      className={`${shared} animate-spin text-muted-foreground motion-reduce:animate-none`}
      strokeWidth={2}
    />
  );
}
