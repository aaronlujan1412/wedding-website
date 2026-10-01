-- What a pack weighs, so a price can be compared to a different-sized pack.
--
-- The price book can say a 6.5 lb pack of chicken thighs is $22.94, and the
-- food database can say that food is 144 kcal and 20.9 g of protein per 100 g.
-- Neither can answer the question a household on a budget that is also counting
-- protein actually asks: which of these is the cheapest protein in the shop.
-- One number bridges them.
--
-- WHY GRAMS AND NOT THE PACK TEXT. `pack` is deliberately human -- '~6.5 lb
-- pack', '24 ct', 'jar' -- because that is what makes a shopping line checkable
-- against what turns up in the box, and parsing it would throw exactly that
-- away. So this is a second, machine-readable field beside it rather than a
-- replacement for it, and the two are allowed to disagree: '~6.5 lb' is a
-- shelf approximation and 2948 is what the scale said.
--
-- NULLABLE FOREVER, and most rows will stay null. A count pack ('24 ct') has no
-- honest gram weight until somebody weighs one, and a jar of harissa paste is
-- not something anybody is going to cost per gram of protein. Every figure
-- derived from this is shown only where it exists -- never as a zero, and never
-- as an average standing in for a measurement.

alter table meal_items
  add column pack_grams numeric(10, 2);

comment on column meal_items.pack_grams is
  'What the whole pack weighs, in grams. Null until somebody weighs it. With the linked food''s per-100g figures this gives cost per 100 g and cost per gram of protein; without it those are simply not shown.';

alter table meal_items
  add constraint meal_items_pack_grams_positive
    check (pack_grams is null or pack_grams > 0);

-- "Which packs can be costed per gram" is the question this gets asked, and it
-- is the one the price book's gap chips count.
create index meal_items_weighed on meal_items (pack_grams) where pack_grams is not null;
