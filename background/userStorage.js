//background/userStorage.js

/**
 * @param {string} objKey */
const getFromStorage = async (objKey) => {
  try {
    const storedObj = await browser.storage.sync.get(objKey);
    if (storedObj) {
      let objStr =
        typeof storedObj[objKey] == "string"
          ? storedObj[objKey]
          : JSON.stringify(storedObj[objKey]);
      infoBG(`'${objKey}' : '${objStr}'`, "userStorage.js", "getFromStorage"); //helper.js
      if (objKey == "doShowVerbose") {
        verbose = storedObj[objKey];
      }
      return storedObj[objKey];
    } else {
      warnBG(
        `Unable to retrieve stored user for: ${objKey}`,
        "userStorage.js",
        "getFromStorage"
      ); //helper.js
      throw new Error("Unable to retrieve stored user preference");
    }
  } catch (error) {
    warnBG(`Error: ${error}`, "userStorage.js", "getFromStorage"); //helper.js
    throw error;
  }
};

var verbose = (async () => {
  verbose = await getFromStorage("doShowVerbose");
  console.log(`From getStorage; verbose = ${verbose}`);
  return verbose;
})();

const getTabIdsFromTabQuery = async (queryObj) => {
  const tabList = await browser.tabs.query(queryObj);
  let idList = [];
  tabList.forEach((aTab) => {
    idList.push(aTab.id);
  });
  return idList;
};
