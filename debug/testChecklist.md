# Test Checklist

1. Uninstall existing version
1. Load Extension.
1. Inspect service worker:
    * Eight files successfully loaded
    * volumeOutline.json unpacked
    * userInitialData.json unpacked & user variables set
1. Open popup
    * Version (should match manifest & \README.md)
    * Display mode: Dark
    * Session lookup: Ore. Leg.
    * Checkboxes: true, true, false, false, true
1. Inspect service worker:
    * No errors
    * Seven items retrieved from from storage
    * Successful webResources calls
1. Chapter/section input `90` -> `Launch`
    * Load time < 2 seconds
    * Popup in lower right
    * Dark theme
    * Quick scan top to bottom for sanity
1. Inspect service worker:
    * No errors
1. (On ORS 90 page) Check Top Heading:
    * In rectangular box, width set to max line:
    * Volume: `Volume 3`
    * Title: `Title 10: Property Rights and Transactions`
    * Chapter: `Chapter 90: Residential Landlord and Tenant`
    * Edition: `Oregon Revised Statutes (2021 Edition)`
1. Check Table of Contents:
    * Two/three columns
    * (Begins) ~16pt `GENERAL PROVISIONS`
    * (followed by) ~12pt `90.100 Definitions`
    * (followed by) ~14pt ***italic `(Temporary provisions relating to COVID-19...)`***
    * (later) ~16pt `MANUFACTURED DWELLING PARKS AND MARINAS`
    * (followed by:) ~14pt not italic `(General Provisions)`
    * (TOC ends with) `90.875 Remedy for failure to give notice`
    * (followed by) End of 2px box; new 2px box starting `GENERAL PROVISIONS`
1. (Detour) Navigate to ORS chapter 458
    * (TOC ends with)  `458.740 Project Facilitation`
    * (followed by) closed TOC box & burnt sections for 458.005 through 458.065
    * (followed by) new box for COMMUNITY-BASED HOUSING DEVELOPMENT
    * Close tab
1. (Back in ORS 90) Check Main Body:
    * From TOC, click `90.425`
    * Top Heading `LANDLORD REMEDIES`
    * Hover, collapse & expand via heading button
    * Toggle full width/reading mode from hovered button
    * Check ORS 90.425 (10) and (sub-sub-sub) paragraph indentation levels
    * Check source note in text & ctrl-click source note for `2001 c.44`
        * Confirm navigation in new tab (`Chapter 44 Oregon Laws 2001 / HB 2031`)
        * Close tab
    * Scroll to 90.453 (3) form
        * Confirm form Div top & bottom (no form ending mend line)
        * Confirm form headings are formatted bold & heading color
        * Confirm text in parenthesis (`Signature of party...`) and underlines are normal/unformatted
        * Confirm form closes before sub (4) to (7)
        * Click `90.100` in form
1. Detour (navigate to `ors 105.124, 105.464` in omnibox)
    * Should load both in two separate windows
    * Both should be scrolled to correct pin cite.
    * Scroll down to confirm form in future amend section inside note
1. (Back in ORS 90)
    * Scroll to note following ORS 90.100 ***I`(Temporary provisions relating to COVID-19...)`***
    * Confirm 5 separate "Notes:" within temp provisions box
    * Confirm (Temp heading) sticks to top of box.
    * In first note section (Sec. 1.), click button
        * Confirm collapse & expansion.
    * Click `chapter 13, Oregon Laws 2020 (first special session)` link in button
        * Confirm navigation (`Oregon Laws 2020 First Special Session/Chapter 13/HB 4213`)
        * Close tab
    * Click source note for `2020 s.s.3 c.3`
        * Confirm navigation (`Oregon Laws 2020 Third Special Session/Chapter 3/HB 4401`)
        * Close tab
    * Scroll to ORS `90.394`
        * Confirm note div follows
        * Confirm div contains note and note section & both end before ORS 90.396
        * Confirm future amend section expands & collapses
        * Confirm date & border are highlighted (red = not true)
    * Ctrl-Click on link to `105.105`
        * Confirm navigation & auto scroll to section
        * Close tab
    * Scroll to `90.510` and confirm proper indentation for `90.510 (1)(L)` (L is paragraph)
    * Scroll to `90.643` and confirm proper indentation for `90.643 (3)(b)(L)` (L is subparagraph)
    * Scroll to end of chapter
    * Confirm ends with [`Former ORS 90.940`] followed by close of both heading & subheading div boxes
    * Confirm heading & subheading both "stuck" to top of page
1. In omnibox enter `ors 403.415`
    * Confirm navigation and auto scroll (requires chrome://flags or edge://flags "Smooth scrolling" on)
    * Confirm display of delayed repeal note within a section
    * Collapse and expand burnt section for ORS `403.415`
    * Scroll down to check ORS `403.435` as well (doesn't have period after section number, but should still work)
1. Go back to popup; type two ORS into Navigate box & enter two ORS (e.g. 197.96.040; 215.283"):
    * Turn source note off & on; confirm they disappear from page (and undisplayed page)
    * Turn burnt section off & back on & confirm that it works on page (and undisplayed page)
    * Turn on collapse all - confirm collapse on page (and undisplayed page)
    * Turn off menu - confirm menu gone (and undisplayed page)
    * Collapse all; expand and re-collapse a section manually with button on section
    * Navigate to different section from TOC; confirm automatically expands upon scroll
    * Under Session Law Lookup, select HeinOnline; confirm link works for:
        * Ordinary source note link (except 2021 not up as of 3/2/2022)
        * Special session source note link
        * Chapter xx, Oregon Laws YYYY link
    * Under Color scheme test "Custom", "Dark Grey" & "Light"
1. From popup, select non-custom option and select `Set Custom Colors`
    * Select a few colors and save.
    * Confirm change of colors on popup & on sections
1. Repeat steps above in MS Edge?
