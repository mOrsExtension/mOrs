//background/helperBG.js

// background global constants used within folder
const orsRegExp =
  /\b0*([1-9]\d{0,2}([a-c]|[A-C])?)(\.\d{3,4})?(?=(?:[\D\b]|$))/; // finds "chapter" or "chapter.section", e.g. "459A"
const tabRegExp = "(?:(?:&nbsp;|\\s)*)";

var verbose;
if (verbose == undefined) {
  verbose = true;
}

/** Sends infoTxt from background script to service worker inspection console; helperBG.js
 * @param {string} infoTxt
 * @param {string} script
 * @param {string} calledBy
 * @param {string} color
 * @param {boolean} verboseOverride */
const infoBG = (
  infoTxt,
  script = "helperBG.js",
  calledBy = "",
  color = "yellow",
  verboseOverride = false
) => {
  if (!verbose && !verboseOverride) {
    return;
  }
  console.info(`${script} ${calledBy}: %c${infoTxt}`, `color:${color}`);
};

/** Sends warnMsg information from background script to service worker inspection console; helperBG.js
 * @param {string} warnTxt
 * @param {string} script
 * @param {string} calledBy
 * @param {string} color */
const warnBG = (
  warnTxt,
  script = "helperBG.js",
  calledBy = "",
  color = "#9ff"
) => {
  console.warn(
    `%c${script} ${calledBy}:%c ${warnTxt}`,
    "color:#E46962",
    `color:${color}`
  );
};

/**Listens for first installation; Deletes if necessary & reinstalls initial variables on new installation */
browser.runtime.onInstalled.addListener(async (details) => {
  try {
    if (details.reason == "install") {
      await browser.storage.sync.clear();
      const userInitData = await readJsonFile("userInitialData.json");
      browser.storage.sync.set(userInitData); // no need to await this, nothing returned
      infoBG("Set initial user variables from data/userInitialData.json");
    }
  } catch (error) {
    warnBG(
      `Failed to set user initial variables from data/userInitialData.json, ${error}`,
      "helperBG.js",
      "onInstalled.addListener"
    );
    throw error;
  }
});
