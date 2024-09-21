# mORS

Chromium browser (Google Chrome/Edge) extension that alters appearance of Oregon Revised Statutes on Oregon State Legislature website and allows for easier retrieval of Oregon session law from the Oregon Legislative Assembly. The Oregon Revised Statutes are the codified laws of the State of Oregon.

## Installation instructions (Chrome/Edge)

* Navigate to <https://github.com/mOrsExtension/mOrs>
* From green "Code" button > "Download Zip"
* Unzip to a folder
* Chrome:
  * Navigate to chrome://extensions/ (or ... > More Tools > Extensions)
* Edge:
  * Navigate to edge://extensions/
  * Turn on "Developer Mode Slider"
* "Load Unpacked"
* Select folder

## To use

* Navigate to [ORS website](https://www.oregonlegislature.gov/bills_laws/Pages/ORS.aspx) and select a chapter;
* Type 'ors' + {space} in the "omnibox" (search bar) or in popup then type:
  * An ORS chapter ('659A')
  * An ORS section ('174.020')
  * An Oregon Session Law ('2015 c.614')
* Use popup & options menu (button on popup or right click popup > extension options) to customize display

## Disclaimers

* Chrome Manifest version 3
* [MIT License](https://github.com/mOrsExtension/mOrs?tab=MIT-1-ov-file). Provided "AS IS".
* This uses regular expressions and DOM manipulation to alter how the Oregon Revised States are displayed with the goal of making it clearer to read. It's possible that parsing of the existing files can cause text to be deleted, shuffled or otherwise misdisplayed.
* The official text of the Oregon Revised Statutes is the [printed published copy](https://apps.oregon.gov/ecommerce/storefrontmt/lcc/).
* See further disclaimers on [ORS website](https://www.oregonlegislature.gov/bills_laws/Pages/ORS.aspx)

## Bugs

* Report any issues [on Github issue page](https://github.com/mOrsExtension/mOrs/issues)
