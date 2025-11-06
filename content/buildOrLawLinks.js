//buildOrLawLinks.js

class OrLawsDisplay {
  /** @param {HTMLElement} bodyMain*/
  constructor(bodyMain) {
    this.bodyDiv = bodyMain;
    this.anchorList = [];
    this.isTagged = false;
    this.reader = {};
    this.sortedAnchors = {};
    this.reader.JSON = {};
  }
  static async buildHandler(bodyMain) {
    const displayMe = new OrLawsDisplay(bodyMain);
    displayMe.getAnchorList();
    displayMe.addDataTags();
    await displayMe.getReaderType();
    console.log(displayMe.reader);
    if (displayMe.reader.name == "OrLeg") {
      displayMe.getOrLawsList();
    }
    displayMe.updateLinks();
    return displayMe;
  }
  getAnchorList() {
    if (this.anchorList.length) {
      this.anchorList = this.bodyDiv.querySelectorAll("a.sessionLaw");
    }
  }
  addDataTags() {
    if (!this.isTagged) {
      this.anchorList.forEach((anAnchor) => {
        const anchorText = anAnchor.textContent;
        const isLong = /hapter/.test(anchorText); // e.g. "Chapter 13, Oregon Laws 2023" v. "2023 c.13"`
        const shortSession = this.#setShortSession(anchorText, isLong); // specialSession number or null
        const anchorData = anAnchor.dataset;
        anchorData.year = anchorText.replace(/[^]*((?:20|19)\d{2})[^]*/, "$1");
        anchorData.chapter = isLong
          ? text.replace(/[^]*hapter (\d{1,4})[^]*/, "$1")
          : text.replace(/[^]*c\.(\d{1,4})[^]*/, "$1");
        if (shortSession != null) {
          anchorData.shortSession = shortSession;
        }
      });
    }
  }
  #setShortSession = (text, isLong) => {
    let /**@type {string} */ specialSessionNum;
    if (isLong && /\sspecial\ssession/.test(text)) {
      specialSessionNum = [
        "first",
        "second",
        "third",
        "forth",
        "fifth",
      ].findIndex((ordinal) => {
        return RegExp(`${ordinal}\\sspecial\\ssession)[^]`).test(
          text.toLowerCase()
        );
      });
      if (specialSessionNum != null) {
        specialSessionNum++; // add one to deal with 0 index
      }
    } else {
      specialSessionNum = /s\.s\./.test(text)
        ? text.replace(/[^]*s\.s\.(\d)[^]*/, "$1")
        : null;
    }
    return specialSessionNum;
  };

  async getReaderType() {
    const { lawsReader } = await sendAwait({ getStorage: "lawsReader" });
    this.reader.name = lawsReader;
    console.log(this.reader.name);
  }

  updateLinks() {
    switch (this.reader.name.toLowerCase) {
      case "hein":
        this.buildHeinLinks("all");
        break;
      case "orleg":
        this.sortAnchorsByDate();
        this.deleteLinks("old");
        this.buildOrLegLinks();
        break;
      case "both":
        this.sortAnchorsByDate();
        this.buildHeinLinks("old");
        this.buildOrLegLinks();
        break;
      default:
        infoCS(
          "Removing any links",
          "buildOrLawLinks.js",
          "OrLawsDisplay.updateLinks"
        );
        this.deleteLinks("all");
    }
  }

  sortAnchorsByDate() {
    if (this.sortAnchorsByDate == {}) {
      this.sortAnchorsByDate.oldList = [];
      this.sortAnchorsByDate.newList = [];
      this.anchorList.forEach((anAnchor) => {
        anAnchor.dataset.year > 1998
          ? this.sortAnchorsByDate.newList.push(anAnchor)
          : this.sortAnchorsByDate.oldList.push(anAnchor);
      });
    }
  }

  buildHeinLinks(whichOnes) {
    infoCS("Building HeinOnline Links", "buildOrLawLinks.js", "buildHeinLinks");
    let anchorList =
      whichOnes == "all" ? this.anchorList : this.sortAnchorsByDate.oldList;
    anchorList.forEach((anAnchor) => {
      const HeinUrl = this.#buildHeinURL(
        anAnchor.dataset.year,
        anAnchor.dataset.chapter
      );
      appendLinkData(anAnchor, HeinUrl);
    });
  }
  #buildHeinURL(year, chapter) {
    return `https://heinonline-org.soll.idm.oclc.org/HOL/SSLSearchCitation?journal=ssor&yearhi=${year}&chapter=${chapter}&sgo=Search&collection=ssl&search=go`;
  }

  buildOrLegLinks() {
    infoCS(
      "building OrLeg links",
      "buildOrLawLinks.js",
      "OrLawsDisplay.buildOrLegLinks"
    );
    this.sortAnchorsByDate.oldList.forEach(async (anAnchor) => {
      const orLegUrl = await this.buildOrLegUrl(
        anAnchor.dataset.year,
        anAnchor.dataset.chapter,
        anAnchor.dataset.shortSession
      );
      this.appendLinkData(anAnchor, orLegUrl);
    });
  }

  /** gets JSON list of session law URLs from ../data/OrLawLegLookup.json*/
  async getOrLawsList() {
    if (this.reader.JSON == {}) {
      if (this.reader.JSON.fetchPromise == null) {
        this.reader.fetchPromise = (async () => {
          infoCS(
            "retrieving OrLegLookup",
            "buildOrLawLinks.js",
            "getOrLegLookupJson"
          );
          this.reader.JSON = await sendAwait(
            { fetchJson: "OrLawLegLookup" },
            true
          );
          this.reader.fetchPromise = null; // Reset the promise for future calls ?? #TODO Do I need this?
        })();
      }
    }
  }

  /** Converts data fields in anchor <a data=''> into OrLeg urls for session law;
   * @param {string} chapter
   * @param {string} year
   * @param {string} specialSession blank/null if none */
  async buildOrLegUrl(year, chapter, specialSession) {
    const addSpecialSession = specialSession ? ` s.s.${specialSession}` : "";
    const yearAndSS = `${year}${addSpecialSession}`;
    const pdfFileCode = this.reader.JSON[yearAndSS];
    if (pdfFileCode != null) {
      let orLawFileName = pdfFileCode.replace(/~/, "000" + chapter);
      orLawFileName = orLawFileName.replace(
        /([^]*?\w)0*(\d{4}(?:\.|\w)*)/,
        "$1$2"
      ); /** adds leading zeros and then trims excess 0s */
      return `https://www.oregonlegislature.gov/bills_laws/lawsstatutes/${orLawFileName}`;
    } else {
      warnCS(
        `Cannot find [${yearAndSS}] in ORS lookup.`,
        "buildOrLawLinks.js",
        "buildOrLegUrl"
      );
      return "";
    }
  }

  /** Deletes the <a> links, but tags and anchors remain to be created later without recalculating */
  deleteLinks = (whichOnes) => {
    let anchorList =
      whichOnes == "all" ? this.anchorList : this.sortedAnchors.oldList;
    anchorList.forEach((anAnchor) => {
      anAnchor.classList.add("linkOff");
      anAnchor.removeAttribute("rel");
      anAnchor.removeAttribute("href");
    });
  };

  /** Adds a single <a> link from either Hein or OrLeg pathway */
  appendLinkData(anchor, url) {
    if (url.length > 0) {
      anchor.rel = "noopener";
      anchor.classList.remove("linkOff");
      anchor.href = url;
    }
  }
} // end class OrLawsDisplay

/**  triggered by main.js or msgListener.js; gets anchor list; builds anchor data if needed; retrieves anchor data & reader; builds anchor urls, returns updated htmlElement
 * @param {HTMLElement} bodyMain */
displayOrLaws = async (bodyMain) => {
  let /** @type {OrLawsDisplay} */ newBody =
      await OrLawsDisplay.buildHandler(bodyMain);
  return newBody.bodyDiv;
};

// ...
//     return bodyMain;
//   } catch (error) {
//     const warning = `Error attempting to generate OrLaws links: ${error}`;
//     warnCS(warning, "navigate.js", "OrLawLinking");
//     throw error;
//   }
// };
