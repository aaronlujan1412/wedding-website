"use client";

import { useId, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ErrorBox from "@/components/ErrorBox/ErrorBox";
import type { GroupOption } from "@/components/rsvp/types";
import type { PhotoSession } from "./types";
import { usePhotoUpload } from "./usePhotoUpload";
import { UploadQueue } from "./UploadQueue";
import {
  attachOriginal,
  uploadGuestPhoto,
  verifyGuestForPhotos,
  signOutOfPhotos,
} from "@/app/actions/photos";

type Props = {
  session: PhotoSession | null;
  guestGroups: GroupOption[];
};

export function UploadPanel({ session, guestGroups }: Props) {
  const [group, setGroup] = useState<PhotoSession | null>(session);

  return (
    <div className="mb-16 rounded-lg border border-border bg-card p-6 md:mb-20 md:p-8">
      {group ? (
        <Uploader group={group} onSignOut={() => setGroup(null)} />
      ) : (
        <Verify guestGroups={guestGroups} onVerified={setGroup} />
      )}
    </div>
  );
}

function Verify({
  guestGroups,
  onVerified,
}: {
  guestGroups: GroupOption[];
  onVerified: (group: PhotoSession) => void;
}) {
  const [selected, setSelected] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastFourId = useId();

  const ready = selected !== "" && lastFour.length === 4;

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const result = await verifyGuestForPhotos(Number(selected), lastFour);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    const name = guestGroups.find((g) => String(g.id) === selected)?.name ?? "";
    onVerified({ id: Number(selected), name });
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <Camera
        className="mx-auto h-7 w-7 text-primary"
        strokeWidth={1.25}
        aria-hidden="true"
      />
      <p className="mt-3 font-garamond text-xl text-foreground">
        Got photos? Add them here.
      </p>
      <p className="mt-2 font-raleway text-sm text-muted-foreground">
        No account, no app. Just tell us who you are — the same way you RSVP&apos;d.
      </p>

      <div className="mt-5 grid gap-3 text-left">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="border-border bg-background">
            <SelectValue placeholder="Which group are you with?" />
          </SelectTrigger>
          <SelectContent className="bg-card" avoidCollisions={false}>
            {guestGroups.map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selected && (
          <div className="grid gap-1.5">
            <label
              htmlFor={lastFourId}
              className="font-raleway text-sm text-muted-foreground"
            >
              Last four digits of your phone number
            </label>
            <Input
              id={lastFourId}
              className="bg-background"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="0000"
              value={lastFour}
              onChange={(e) =>
                setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex justify-center">
          <ErrorBox message={error} />
        </div>
      )}

      <Button className="mt-5" size="lg" disabled={!ready || busy} onClick={submit}>
        {busy ? "Checking…" : "Continue"}
      </Button>
    </div>
  );
}

function Uploader({
  group,
  onSignOut,
}: {
  group: PhotoSession;
  onSignOut: () => void;
}) {
  const { queue, busy, archiving, inputRef, handleFiles, done } =
    usePhotoUpload(uploadGuestPhoto, attachOriginal);

  return (
    <div className="mx-auto max-w-md text-center">
      <p className="font-garamond text-xl text-foreground">
        Posting as <span className="text-primary">{group.name}</span>
      </p>
      <p className="mt-2 font-raleway text-sm text-muted-foreground">
        Pick as many as you like. We shrink them for the web and strip location
        data before anything is saved.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <Button
        className="mt-5"
        size="lg"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            Uploading…
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" strokeWidth={1.5} />
            Choose photos
          </>
        )}
      </Button>

      <UploadQueue items={queue} />

      {done > 0 && !busy && (
        <p className="mt-4 font-garamond text-lg text-primary">
          {done === 1 ? "Got it. Thank you!" : `Got all ${done}. Thank you!`}
        </p>
      )}

      {archiving && (
        <p className="mt-2 font-raleway text-xs text-muted-foreground">
          Tucking away full-size copies. Feel free to close this — your photos
          are already saved.
        </p>
      )}

      <button
        type="button"
        onClick={async () => {
          await signOutOfPhotos();
          onSignOut();
        }}
        className="mt-5 font-raleway text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
      >
        Not {group.name}?
      </button>
    </div>
  );
}
