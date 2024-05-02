# Search Help

Either you pressed the help button, or something went wrong when you tried to use the omnibox (search bar) to search with mORS (for Oregon Revised Statutes), so you ended up here.

## Valid Searches

### ORS Chapters

* Type into browser omnibox:

   >ors `ors 695A`

* It will work without the ORS:
   >ors `91`

### ORS Sections

* Type:

   > ors `ORS 97.200`

* Or:

   > ors `72a.3070`

### Session Laws (year and chapter)

* Type:
   >ors `2019 c.1`
* Or just year and chapter:
   >ors `1999 333`
* Also special sessions:
   >ors `2020 s.s.1 13`
* You can also switch your reader (otherwise, it will use the default in the popup):
  * HeinOnline`*`:
   >ors `hein 2005 c.550`
  * OregonLegislature.gov`**`:
   >ors `orLeg 2014 c.501`

## Notes

* You can type a string a valid terms separated by any non alphanumeric character (except a period):
  > ors `9.460 ; 701 / 2019 c.444, hein 1989 658`
  > Will pull up four tabs =>
  >`ORS 9.460`|`ORS chapter 701`|`chapter 444, Oregon Laws 2019`|`chapter 658, Oregon Laws 1989` (in HeinOnline)

If something seems broken, email <mOrs.Extension@gmail.com> or post an issue to [GitHub](https://github.com/mOrsExtension/mOrs/issues)

`*` HeinOnline requires a subscription and defaults to a login through the [State Law Library of Oregon](https://soll.libguides.com/index/StateAgencies). See readMe for more details.

`**` Session law on the [Oregon Legislature website](https://www.oregonlegislature.gov/bills_laws/Pages/Oregon-Laws.aspx) currently goes back to 1999.
