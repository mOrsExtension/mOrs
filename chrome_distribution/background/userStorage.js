/* exported getTabIdsFromTabQuery*/
/* globals browser */
//background/userStorage.js

/**
 * @param {string} objKey */
const getFromStorage = async (objKey) => {
  try {
    const storedObj = await browser.storage.sync.get(objKey);
    if (storedObj != null) {
      return storedObj[objKey];
    } else {
      throw new Error(`Attempt to retrieve '${objKey}' returned null`);
    }
  } catch (error) {
    console.warn(
      `Error: ${error}; unable to retrieve or understand response to ${objKey}`
    );
    throw error;
  }
};

const getTabIdsFromTabQuery = async (queryObj) => {
  const tabList = await browser.tabs.query(queryObj);
  let idList = [];
  tabList.forEach((aTab) => {
    idList.push(aTab.id);
  });
  return idList;
};
