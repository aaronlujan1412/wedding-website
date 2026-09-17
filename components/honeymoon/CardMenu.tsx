"use client";

import {
  ArrowLeftRight,
  CalendarDays,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Link as LinkIcon,
  MapPin,
  Pencil,
  Pin,
  Plus,
  Scissors,
  Stamp,
  Star,
  Ticket,
  Trash2,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useBoardData } from "./BoardContext";
import { useClip } from "./clipboard";
import type { CardActions } from "./ItemCard";
import {
  BOOKING_STATUSES,
  LANES,
  LANE_ORDER,
  formatDayShort,
  isBlockout,
  legForDay,
  legsIn,
  mapsLink,
  todayISO,
} from "./trip";
import type { BookingStatus, Lane, TripItem } from "./types";

/**
 * The right-click menu.
 *
 * The card's own buttons are the moves you make constantly — a day left, a day
 * right, agreed, gone. Everything else about a card used to mean opening the
 * form: where it is on a map, what the note says, whether it's booked. None of
 * those deserve a seventh button on a card the size of a business card, and
 * all of them are one right-click away from the card itself.
 *
 * Two menus, because a paste needs somewhere to land: one on a card, one on
 * the cell around it, so an empty Thursday can still be pasted into. A
 * right-click on a card inside a cell opens only the card's — the trigger
 * beneath it sees an event whose default is already prevented and leaves it
 * alone.
 */

/** A day radio can't carry an empty value, so the pile gets a name. */
const PILE = "__pile__";

export function ItemMenu({
  item,
  actions,
  children,
}: {
  item: TripItem;
  actions: CardActions;
  children: React.ReactNode;
}) {
  const { days, legs } = useBoardData();
  const clip = useClip();
  // Whose route names the days: this card's lane, falling back to the agreed
  // one. Unfiltered, `legForDay` answers with whichever lane's leg was written
  // first, so half the trip was labelled with the other person's draft.
  const dayLeg = (day: string) =>
    legForDay(legsIn(legs, item.lane), day) ??
    legForDay(legsIn(legs, "decided"), day);
  const blockout = isBlockout(item);
  const maps = mapsLink(item);
  const today = todayISO();
  const mod = modKey();

  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {/* What the card says out of the corner of its mouth. On the board a
            note is invisible until the form is open, which is where notes go
            to be forgotten. */}
        {item.notes?.trim() && (
          <>
            <p className="line-clamp-6 max-w-[16rem] px-2 py-1.5 font-garamond text-xs leading-snug whitespace-pre-wrap text-muted-foreground">
              {item.notes.trim()}
            </p>
            <ContextMenuSeparator />
          </>
        )}

        {/* One frame later: the menu hands focus back to the card as it
            closes, and a form opened in the same tick gets that restore after
            its own autofocus, which leaves the keyboard on nothing at all. */}
        <ContextMenuItem
          onSelect={() => requestAnimationFrame(() => actions.onEdit(item))}
        >
          <Pencil />
          Edit…
        </ContextMenuItem>

        {!blockout && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem asChild>
              <a href={maps.href} target="_blank" rel="noreferrer">
                <MapPin />
                {maps.saved ? "Open the map" : "Look it up on maps"}
              </a>
            </ContextMenuItem>
            {item.url && (
              <ContextMenuItem asChild>
                <a href={item.url} target="_blank" rel="noreferrer">
                  <LinkIcon />
                  Open the website
                </a>
              </ContextMenuItem>
            )}
            {item.booking_url && (
              <ContextMenuItem asChild>
                <a href={item.booking_url} target="_blank" rel="noreferrer">
                  <Ticket />
                  Open the booking page
                </a>
              </ContextMenuItem>
            )}
          </>
        )}

        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => actions.onClip(item, false)}>
          <Copy />
          Copy
          <ContextMenuShortcut>{mod}C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => actions.onClip(item, true)}>
          <Scissors />
          Cut
          <ContextMenuShortcut>{mod}X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!clip}
          onSelect={() => actions.onPaste(item.lane, item.on_date)}
        >
          <ClipboardPaste />
          <span className="min-w-0 truncate">
            {clip ? `Paste ${clip.item.title}` : "Paste"}
          </span>
          <ContextMenuShortcut>{mod}V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => actions.onDuplicate(item)}>
          <CopyPlus />
          Duplicate
        </ContextMenuItem>

        <ContextMenuSeparator />
        {!blockout && (
          <ContextMenuCheckboxItem
            checked={item.must_do}
            onCheckedChange={(on) => actions.onFlag(item, "must_do", on)}
          >
            <Star />
            Must do
          </ContextMenuCheckboxItem>
        )}
        <ContextMenuCheckboxItem
          checked={item.pinned}
          onCheckedChange={(on) => actions.onFlag(item, "pinned", on)}
        >
          <Pin />
          Pinned
        </ContextMenuCheckboxItem>

        {!blockout && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Stamp />
              Booking
              {/* The card already carries its lane and its day, so those two
                  say only what they change. The stamp is small enough to read
                  wrong, so this one says where it stands. */}
              <span className="ml-auto pl-4 text-xs text-muted-foreground">
                {BOOKING_STATUSES[item.booking_status].label}
              </span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuRadioGroup
                value={item.booking_status}
                onValueChange={(value) =>
                  actions.onStatus(item, value as BookingStatus)
                }
              >
                {(Object.keys(BOOKING_STATUSES) as BookingStatus[]).map(
                  (status) => (
                    <ContextMenuRadioItem key={status} value={status}>
                      {BOOKING_STATUSES[status].label}
                    </ContextMenuRadioItem>
                  ),
                )}
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <ArrowLeftRight />
            Whose
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuRadioGroup
              value={item.lane}
              onValueChange={(lane) =>
                actions.onSend(item, lane as Lane, item.on_date)
              }
            >
              {LANE_ORDER.map((lane) => (
                <ContextMenuRadioItem key={lane} value={lane}>
                  <span style={{ color: LANES[lane].accent }}>
                    {LANES[lane].label}
                  </span>
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <CalendarDays />
            Which day
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="max-h-[22rem]">
            <ContextMenuRadioGroup
              value={item.on_date ?? PILE}
              onValueChange={(value) =>
                actions.onSend(item, item.lane, value === PILE ? null : value)
              }
            >
              <ContextMenuRadioItem value={PILE}>
                {LANES[item.lane].pile}
              </ContextMenuRadioItem>
              {days.length > 0 && <ContextMenuSeparator />}
              {days.map((day) => {
                const leg = dayLeg(day);
                return (
                  <ContextMenuRadioItem key={day} value={day}>
                    <span className="tabular-nums slashed-zero">
                      {formatDayShort(day)}
                    </span>
                    {/* The city, so a twenty-day list reads as a route rather
                        than as twenty dates. */}
                    {leg && (
                      <span className="ml-auto pl-4 text-xs text-muted-foreground">
                        {day === today ? "today" : leg.name}
                      </span>
                    )}
                  </ContextMenuRadioItem>
                );
              })}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onSelect={() => actions.onDelete(item)}
        >
          <Trash2 />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * The menu on the space around the cards: a lane's day, or a pile.
 *
 * It exists for the paste. Without it a copied card could only ever land in a
 * cell that already had a card in it to right-click, which is the opposite of
 * where you want to put things.
 */
export function CellMenu({
  lane,
  date,
  actions,
  onAdd,
  children,
}: {
  lane: Lane;
  date: string | null;
  actions: CardActions;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const clip = useClip();

  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onAdd}>
          <Plus />
          {date ? "Add a card here" : "Add an idea"}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!clip}
          onSelect={() => actions.onPaste(lane, date)}
        >
          <ClipboardPaste />
          <span className="min-w-0 truncate">
            {clip ? `Paste ${clip.item.title}` : "Paste"}
          </span>
          <ContextMenuShortcut>{modKey()}V</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * Copy, cut and paste from the keyboard, while the focus is inside a card.
 *
 * Guarded on the selection: someone who has highlighted the words on a card
 * and pressed copy means the words, not the card.
 */
export function cardKeys(
  event: React.KeyboardEvent,
  item: TripItem,
  actions: CardActions,
) {
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
    return;
  }
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) return;

  switch (event.key.toLowerCase()) {
    case "c":
      actions.onClip(item, false);
      break;
    case "x":
      actions.onClip(item, true);
      break;
    case "v":
      actions.onPaste(item.lane, item.on_date);
      break;
    default:
      return;
  }
  event.preventDefault();
}

/**
 * Which modifier this keyboard says. Read only while a menu is open, never
 * during a server render — the menu's contents don't exist until a click.
 */
function modKey(): string {
  if (typeof navigator === "undefined") return "Ctrl ";
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl ";
}
