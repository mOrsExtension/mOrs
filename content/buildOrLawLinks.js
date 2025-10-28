//buildOrLawLinks.js

/** Returns #main id of body of document with updated links to Oregon Session Laws for HeinOnline or oregonLegislature.gov
 * @param {Node} bodyMain // already tagged with anchors classed as 'sessionLaw' */
const newOrUpdateOrLawLinks = async (bodyMain) => {
  try {
    const anchorList = getAnchorList(bodyMain);
    const orLaw = await sendAwait({ getStorage: "lawsReader" }); // check user form input for source of OrLaws lookup (Hein/OrLeg)
    switch (orLaw.lawsReader) {
      case "Hein":
        {
          buildHeinLinks(anchorList);
        }
        break;
      case "OrLeg":
        {
          const sortedAnchors = sortByDate(anchorList);
          deleteAllLinks(sortedAnchors.oldList);
          buildOrLegLinks(sortedAnchors.newList);
        }
        break;
      case "Both":
        {
          const sortedAnchors = sortByDate(anchorList);
          buildHeinLinks(sortedAnchors.oldList);
          buildOrLegLinks(sortedAnchors.newList);
        }
        break;
      default:
        {
          infoCS(
            "Removing any links",
            "buildOrLawLinks.js",
            "newOrUpdateOrLawLinks"
          );
          deleteAllLinks(anchorList);
        }
        break;
    }
    return bodyMain;
  } catch (error) {
    const warning = `Error attempting to generate OrLaws links: ${error}`;
    warnCS(warning, "navigate.js", "OrLawLinking");
    throw error;
  }
};
const sortByDate = (anchors) => {
  let newList = [];
  let oldList = [];
  anchors.forEach((anAnchor) => {
    anAnchor.dataset.year > 1998
      ? newList.push(anAnchor)
      : oldList.push(anAnchor);
  });
  return { oldList: oldList, newList: newList };
};

/**TODO: #45 Build into Class for Anchor Handling? */
/** put info into anchors (data-year, data-chapter, data-ss) to keep data gathering & link building separate */
const getAnchorList = (html) => {
  const sessionLawAnchors = html.querySelectorAll("a.sessionLaw");
  if (sessionLawAnchors.length < 1) {
    return [];
  }
  if (isAnchorListTagged[0]) {
    return sessionLawAnchors;
  }
  addTagsToAllAnchors(sessionLawAnchors);
  return sessionLawAnchors;
};
const isAnchorListTagged = (anchor) => {
  let isTagged = anchor.dataset.year != null;
  infoCS(
    `Laws ${isTagged ? "were" : "need"} tagged with data.`,
    "orLawLinking.js",
    "OrLawLinking"
  );
  return isTagged;
};
const addTagsToAllAnchors = (anchorList) => {
  anchorList.forEach((anAnchor) => {
    const anchorText = anAnchor.textContent;
    const anchorData = anAnchor.dataset;
    anchorData.year = setYear(anchorText);
    const isLong = /hapter/.test(anchorText); // e.g. "Chapter 13, Oregon Laws 2023" v. "2023 c.13"`
    anchorData.chapter = setChapter(anchorText, isLong);
    const shortSession = setShortSession(anchorText, isLong);
    if (shortSession != null) {
      anchorData.shortSession = shortSession;
    }
  });
  return anchorList;
};
const setYear = (text) => {
  return text.replace(/[^]*((?:20|19)\d{2})[^]*/, "$1");
};
const setChapter = (text, isLong) => {
  return isLong
    ? text.replace(/[^]*hapter (\d{1,4})[^]*/, "$1")
    : text.replace(/[^]*c\.(\d{1,4})[^]*/, "$1");
};
const setShortSession = (text, isLong) => {
  if (isLong && /\sspecial\ssession/.test(text)) {
    let sessionOrdinal = text
      .replace(/[^]*\(([\w]+)\sspecial\ssession\)[^]*/, "$1")
      .toLowerCase();
    return ["0", "first", "second", "third", "forth", "fifth"].forEach(
      (ordinal, index) => {
        if (ordinal == sessionOrdinal) {
          return index.toString();
        }
      }
    );
  }
  return /s\.s\./.test(text) ? text.replace(/[^]*s\.s\.(\d)[^]*/, "$1") : null;
};

/** building links for HeinOnline through State of Oregon Law Library for each anchor (session law reference) in chapter
 * @param {any} sessionLawAnchors // will be list of anchors */
const buildHeinLinks = (sessionLawAnchors) => {
  infoCS("Building HeinOnline Links", "buildOrLawLinks.js", "buildHeinLinks");
  sessionLawAnchors.forEach((anAnchor) => {
    const HeinUrl = buildHeinURL(
      anAnchor.dataset.year,
      anAnchor.dataset.chapter
    );
    appendLinkData(anAnchor, HeinUrl);
  });
};
const buildHeinURL = (year, chapter) => {
  return `https://heinonline-org.soll.idm.oclc.org/HOL/SSLSearchCitation?journal=ssor&yearhi=${year}&chapter=${chapter}&sgo=Search&collection=ssl&search=go`;
};

/**builds links for oregonLegislature.gov session laws for each anchor (session law reference) in chapter */
const buildOrLegLinks = (anchorList) => {
  infoCS("building OrLeg links", "buildOrLawLinks.js", "buildOrLegLinks");
  anchorList.forEach(async (anAnchor) => {
    const orLegUrl = await buildOrLegUrl(
      anAnchor.dataset.year,
      anAnchor.dataset.chapter,
      anAnchor.dataset.shortSession
    );
    appendLinkData(anAnchor, orLegUrl);
  });
};

/** module used for json lookup, hopefully runs once*/
let oreLegLookupJson = null; // Caching global object
let fetchPromise = null; // Promise to track the fetching process
let counter = 0;

const fetchOrLegLookupJson = async () => {
  counter++;
  if (oreLegLookupJson) {
    return oreLegLookupJson; // Return cached data if available
  }

  // If fetching is already in progress, wait for it to complete
  if (!fetchPromise) {
    fetchPromise = (async () => {
      infoCS(
        "retrieving OrLegLookup",
        "buildOrLawLinks.js",
        "getOrLegLookupJson"
      );
      oreLegLookupJson = await sendAwait({ fetchJson: "OrLawLegLookup" }, true);
      fetchPromise = null; // Reset the promise for future calls
      return oreLegLookupJson;
    })();
  }

  return await fetchPromise; // Wait for the promise to resolve
};

/** Converts data fields in anchor <a data=''> into OrLeg urls for session law;
 * Based on lookup table for year & special session at ../data/OrLawLegLookup.json
 * @param {string} year
 * @param {string} chapter
 * @param {string} specialSession */
const buildOrLegUrl = async (year, chapter, specialSession) => {
  const addSpecialSession = specialSession ? ` s.s.${specialSession}` : "";
  const yearAndSS = `${year}${addSpecialSession}`;
  const jsonData = await fetchOrLegLookupJson();
  const pdfFileCode = jsonData[yearAndSS];
  if (pdfFileCode != null) {
    let orLawFileName = pdfFileCode.replace(/~/, "000" + chapter);
    orLawFileName = orLawFileName.replace(
      /([^]*?\w)0*(\d{4}(?:\.|\w)*)/,
      "$1$2"
    ); /** trims excess zeros */
    return `https://www.oregonlegislature.gov/bills_laws/lawsstatutes/${orLawFileName}`;
  } else {
    warnCS(
      `Cannot find [${yearAndSS}] in ORS lookup.`,
      "buildOrLawLinks.js",
      "buildOrLegUrl"
    );
    return "";
  }
};

/** Deletes the <a> links, keeps the tags so they can be created later without recalculating */
const deleteAllLinks = (anchors) => {
  anchors.forEach((anAnchor) => {
    anAnchor.classList.add("linkOff");
    anAnchor.removeAttribute("rel");
    anAnchor.removeAttribute("href");
  });
};

/** Adds a single <a> link from either Hein or OrLeg pathway */
const appendLinkData = (anchor, url) => {
  if (url.length > 0) {
    anchor.rel = "noopener";
    anchor.classList.remove("linkOff");
    anchor.href = url;
  }
};
