/* exported orsRegExp, tabRegExp,  */
/* global browser, readJsonFile */
//background/helperBG.js

// background global constants used within folder
const orsRegExp =
  /\b0*([1-9]\d{0,2}([a-c]|[A-C])?)(\.\d{3,4})?(?=(?:[\D\b]|$))/; // finds "chapter" or "chapter.section", e.g. "459A"
const tabRegExp = "(?:(?:&nbsp;|\\s)*)";

/**Listens for first installation; Deletes if necessary & reinstalls initial variables on new installation */
browser.runtime.onInstalled.addListener(async (details) => {
  try {
    if (details.reason == "install") {
      await browser.storage.sync.clear();
      const userInitData = await readJsonFile("userInitialData.json");
      browser.storage.sync.set(userInitData);
    }
  } catch (error) {
    console.warn(
      `Failed to set user initial variables from data/userInitialData.json, ${error}`,
      "helperBG.js",
      "onInstalled.addListener"
    );
    throw error;
  }
});