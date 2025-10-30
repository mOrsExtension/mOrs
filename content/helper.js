//helper.js

let browser;
try {
  browser = chrome;
} catch (error) {
  console.warn(`Assignment of chrome to browser failed:'${error}'`); // using warn rather than warnCS, because browser isn't registering right
}

var verbose = true;

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
    this.msgStringy = JSON.stringify(this.message);
    this.isLog = typeof this.message == "object" && "log" in this.message;
  }

  async sendMessage() {
    if (!this.isLog) {
      infoCS(
        `Content script is sending to background scripts: ${this.msgStringy}'`,
        "helper.js",
        "sendMessage"
      );
    }
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
      } else {
        console.warn(
          `Warning. Response received to ${JSON.stringify(
            this.message
          )} was ${JSON.stringify(response)}`
        );
      }
    } catch (error) {
      if (!this.isLog) {
        warnCS(
          `Error sending '${this.msgStringy}': ${error}`,
          "helper.js",
          "sendAwait"
        );
      }
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

/** Toggles whether to show most info in console.log */
const showVerbose = (isVerbose) => {
  verbose = isVerbose;
  infoCS(
    `Verbose = ${verbose} for content script purposes`,
    "helper.js",
    "showVerbose",
    "#f04",
    true
  );
};

/** toggle Full Width of ORS display from 85ch to 100% */
const toggleFullWidth = () => {
  setFullWidth(
    document.documentElement.style.getPropertyValue("--SectionWidth") == "85ch"
  );
};
/**set width on document (& on the menu button, if it exists) as set by popup or at startup */
const setFullWidth = (isFull) => {
  document.documentElement.style.setProperty(
    "--SectionWidth",
    isFull ? "100%" : "85ch"
  );
  const fwButtonLabel = document.getElementById("fullWidth");
  if (fwButtonLabel) {
    fwButtonLabel.textContent = isFull ? "Reading Mode" : "Full Width";
  }
  storeKey({ showFullWidth: isFull }); // saves to user's computer. No need to await result.
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

/** Sends info message to service worker console (for displaying).
 * @param {string} infoMsg
 * @param {string} scriptFileName
 * @param {string} functionName
 * @param {string} color
 * @param {boolean} verboseOverride */
const infoCS = (
  infoMsg,
  scriptFileName = "helper.js",
  functionName = "",
  color = "pink",
  verboseOverride = false
) => {
  if (!verbose && !verboseOverride) {
    return;
  }
  if (functionName == "") {
    try {
      functionName = infoCS.caller.name;
    } catch {
      functionName = "??";
    }
  }
  sendAwait(
    {
      log: {
        doWarn: false,
        txt: infoMsg,
        script: scriptFileName,
        aCaller: functionName,
        color: color,
      },
    },
    false
  );
};

/**Sends "warning" message to console;
 * viewable in "inspect service worker" & content script's log
 * content/helper.js
 * @param {string} warnMsg
 * @param {string} scriptFileName
 * @param {string} functionName*/
const warnCS = (warnMsg, scriptFileName = "helper.js", functionName = "") => {
  if (functionName == "") {
    try {
      functionName = warnCS.caller.name;
    } catch {
      functionName = "??";
    }
  }
  console.warn(`${scriptFileName} - ${functionName}: ${warnMsg}`); // want to make sure it gets noticed in both places
  sendAwait(
    {
      log: {
        doWarn: true,
        txt: warnMsg,
        script: scriptFileName,
        aCaller: functionName,
        color: "yellow",
      },
    },
    false
  );
};

/** expands single ORS section (internal links or pin cite link in url)
 * @param {Element} expandedElem  */
const expandSingle = (expandedElem) => {
  if (expandedElem && expandedElem.classList.contains("section")) {
    expandedElem.children[1].classList.remove("invisibility");
  } else {
    warnCS(
      `Target '${expandedElem.textContent?.slice(0, 60)}' is '${
        expandedElem.classList
      }' & not a section`,
      "helper.js",
      "expandSingle"
    );
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
    infoCS(
      `stored user data: ${JSON.stringify(keyValueObj)}`,
      "helper.js",
      "StoreUserKey"
    );
    return true;
  } catch (error) {
    warnCS(error, "helper.js", "storeUserKey");
    throw error;
  }
};
