-- Three things the Ring can do that aren't a bout.
--
-- The ring settles an argument by making you have it. These are the three
-- moves for the arguments you already know the shape of: the idea that was
-- never up for debate, the idea one of you refuses to carry any further, and
-- the pair you are not going to agree on tonight.
--
-- All three are deliberately SCARCE or SLOW. Three wishes and three finishers
-- each, per person, for the whole tournament: an unlimited "this one is
-- special" button is the `must_do` flag, and 109 of 112 cards on this board
-- were once left at the default because a free answer gets given for free.

-- 預かり (azukari) is a real sumo verdict: the bout is held over rather than
-- decided. That is exactly the deadlock -- both cards stay in, neither rating
-- moves, and the PAIR is set aside until the rest of the tournament is done.
--
-- It is not `skip`. Skip is "ask me again later" and the matchmaker is free to
-- come straight back to it; a deadlock is "we tried, and we are not doing this
-- one now", so the pair is excluded outright until you go looking for it.
alter type trip_bout_outcome add value 'deadlock';

-- 願い -- a wish. The card leaves the tournament upward: it never enters the
-- ring again and it is in the trip, hours and all.
--
-- Not `must_do`, which already exists and means something weaker and
-- unlimited ("we'd like to"). A wish costs one of three, and the whole point
-- is that spending it hurts.
alter table trip_items add column saved_by trip_planner;

-- 必殺 -- a finisher. The card leaves the tournament downward, with no bout
-- and no appeal from the other side.
--
-- `cut_at` still gets set, because a finished card is cut like any other and
-- belongs in the same eliminated list; this column only records whose move it
-- was, which is what makes the count of remaining finishers derivable and what
-- lets a comeback refund the right person.
alter table trip_items add column vetoed_by trip_planner;

-- Both budgets are counted per planner, so this is the read behind every
-- "●●○" on screen.
create index trip_items_ring_moves on trip_items (trip_id, saved_by, vetoed_by);
