import type { Room } from "./rooms";

export function RoomCard({ room }: { room: Room }) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl leading-none" aria-hidden="true">
          {room.icon}
        </span>
        <h3 className="font-garamond text-xl text-foreground">{room.name}</h3>
      </div>

      <div className="mt-4 space-y-1 font-raleway text-sm text-muted-foreground">
        <p>🛏 {room.traditional}</p>
        {room.bunks && <p>🪜 {room.bunks}</p>}
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="font-raleway text-xs uppercase tracking-[0.2em] text-primary">
          Reserved for
        </p>
        <p className="mt-1 font-garamond text-lg text-foreground">
          {room.assignedTo}
        </p>
      </div>

      {room.bunks && (
        <p className="mt-4 rounded-md bg-pop2/10 px-3 py-2 font-raleway text-xs leading-relaxed text-pop2">
          🎒 Bunk beds are carpeted — pack a sleeping bag and pillow.
        </p>
      )}
    </div>
  );
}
