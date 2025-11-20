/* exported RegExpHandler, toggleFullWidth, showBurnt, showMenu, showVolumeOutline, showSourceNotes, showTOC, showAnnos, expandSingle, collapseAllSections, expandAllSections */
/* global chrome */
//helper.js

let browser;
try {
  browser = chrome;
} catch (error) {
  console.warn(`Assignment of chrome to browser failed:'${error}'`);
}

class RegExpHandler {
  constructor(searchFor, flags = "") {
    this.RE = this.buildRegExp(searchFor, flags);
  }

  buildRegExp(searchFor, flags) {
    if (typeof searchFor == "string") {
      return new RegExp(searchFor, flags);
    } else if (searchFor && searchFor.constructor == RegExp) {
      return new RegExp(searchFor.source, flags);
    } else return new RegExp("", flags);
  }

  replaceAll(/**@type {string} */ oldText, /** @type {string} */ replaceWith) {
    return oldText.replace(new RegExp(this.RE.source, "g"), replaceWith);
  }

  /** single use replacement, no storage */
  static replaceAllWith(oldText, searchFor, replaceWith) {
    let regExpTemp = new RegExpHandler(searchFor);
    return regExpTemp.replaceAll(oldText, replaceWith);
  }

  replacePerFlags(
    /**@type {string} */ oldText,
    /** @type {string} */ replaceWith
  ) {
    return oldText.replace(this.RE, replaceWith);
  }

  /** boolean answers whether text is found this included */
  doesContain(testedString) {
    return RegExp(this.RE.source, "").test(testedString); // no flag to prevent sticky tests (searching for add'l)
  }

  static doesContainThis(searchFor, searchedText) {
    let regExpTemp = new RegExpHandler(searchFor);
    return regExpTemp.doesContain(searchedText);
  }

  /** returns entire first match ($%), if any */
  firstMatch(testedString) {
    return this.doesContain(testedString)
      ? testedString.match(RegExp(this.RE.source, "g"))[0] // global flag prevents it from returning capturing groups
      : null;
  }
  // returns the index # capturing group of the first match (starting with 1, not 0)
  firstMatchGroupNo(testedString, index) {
    if (this.doesContain(testedString)) {
      let match = [...testedString.match(RegExp(this.RE.source, ""))]; // no flag means it will return capturing groups
      return match[index];
    }
    return null;
  }
}

class MessageSenderCS {
  constructor(message, doRespond) {
    this.message = message;
    this.doRespond = doRespond;

  }

  async sendMessage() {
    this.doRespond ? await this.#sendAwait() : this.#sendOneWay();
    return "success";
  }
  async #sendAwait() {
    try {
      let response = await browser.runtime.sendMessage({
        message: this.message,
      });
      if ("response" in response) {
        this.response = response.response;
      }
    } catch (error) {
      throw new Error (`Error sending '${JSON.stringify(this.message)}': ${error}`);
    }
  }
  #sendOneWay() {
    browser.runtime.sendMessage({ message: this.message });
  }
  respond() {
    return this.response;
  }
}

//sendAwait default
const sendAwait = async (messageItem, doAwaitResponse = true) => {
  let msg = new MessageSenderCS(messageItem, doAwaitResponse);
  if ((await msg.sendMessage()) == "success" && doAwaitResponse) {
    return msg.respond();
  }
};

// SET INITIAL/CHANGED VARIABLES

/** toggle Full Width of ORS display from 85ch to 100% */
const toggleFullWidth = () => {
  setFullWidth(
    document.documentElement.style.getPropertyValue("--SectionWidth") == "85ch"
  );
};
/**set width of document & updates menu button, if it exists) as set by popup or at startup. Could store data, but I don't think that's used anywhere */
const setFullWidth = (isFull, doStore = false) => {
  document.documentElement.style.setProperty(
    "--SectionWidth",
    isFull ? "100%" : "85ch"
  );
  const fwButtonLabel = document.getElementById("fullWidth");
  if (fwButtonLabel) {
    fwButtonLabel.textContent = isFull ? "Reading Mode" : "Full Width";
  }
  if (doStore) {
    storeKey({ showFullWidth: isFull }); // saves to user preferences; does not await result.
  }
};

/** Sets visibility of query selection as set by popup or at startup*/
const makeVisible = (querySelection, isVisible) => {
  document.querySelectorAll(querySelection).forEach((anElement) => {
    isVisible
      ? anElement.classList.remove("invisibility")
      : anElement.classList.add("invisibility");
  });
};
const showBurnt = (doShow) => {
  makeVisible("div.section.burnt", doShow);
};
const showMenu = (doShow) => {
  makeVisible("div#floatMenu", doShow);
};
const showVolumeOutline = (doShow) => {
  makeVisible("div#volumeOutline", doShow);
};
const showSourceNotes = (doShow) => {
  makeVisible("p.sourceNote", doShow);
};
const showTOC = (doShow) => {
  makeVisible("div#toc", doShow);
};
const showAnnos = (doShow) => {
  makeVisible("div.annotations", doShow);
};

/** expands single ORS section (internal links or pin cite link in url)
 * @param {Element} expandedElem  */
const expandSingle = (expandedElem) => {
  if (expandedElem && expandedElem.classList.contains("section")) {
    expandedElem.children[1]?.classList.remove("invisibility");
  }
};

/**  Collapses (actually, makes invisible now) all ORS sections  */
const collapseAllSections = () => {
  document.querySelectorAll("div.collapsible").forEach((hidable) => {
    hidable.classList.add("invisibility");
  });
};

/**  Makes visible all ORS sections */
const expandAllSections = () => {
  document.querySelectorAll("div.collapsible").forEach((hidable) => {
    hidable.classList.remove("invisibility");
  });
};

const storeKey = async (keyValueObj) => {
  try {
    await browser.storage.sync.set(keyValueObj);
    return true;
  } catch (error) {
    console.warn(`Could not store key: ${error}`);
    throw error;
  }
};
