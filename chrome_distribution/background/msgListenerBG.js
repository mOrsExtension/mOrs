/* exported */
/* global getFromStorage, getTabIdsFromTabQuery, generateCSS, getPalletteList, finishAnnoRetrieval, readJsonFile, getChapterInfo, startAnnoRetrieval, buildAndNavigateToUrls, browser, */
//background/msgListener.js

/** Receives message and sends response */
class MessageObj {
  constructor({ message: receivedMsg }, { _url }) {
    // destructure to get msg & url in msg object
    if (receivedMsg == null) {
      this.responseToSend = new Error(
        "Null message received by background.js listener."
      );
    } else {
      this.receivedMsg = receivedMsg;
    }
  }

  async doTasksAndFetchResponse() {
    const handlers = {
      getStorage: () => this.#retrieveUserData(), // returns object(s)
      fetchJson: () => this.#fetchJson(), // returns json
      getChapInfo: () => this.#getChapInfo(), // returns obj(vol, title, chp)
      miscTask: () => this.#miscTasks(), // returns any
      newOrsTabs: () => this.#newOrsTabs(), //returns true & launches tab
      startAnnos: () => this.#startAnnos(), // returns true & works in background
    };

    // Find which handler to use
    const messageType = Object.keys(this.receivedMsg).find(
      (key) => key in handlers
    );
    if (messageType) {
      this.responseToSend = await handlers[messageType]();
      return this.responseToSend != null;
    }
    this.responseMsg = new Error(
      `Message type unidentifiable: ${JSON.stringify(this.receivedMsg)}`
    );
    return false;
  }

  /** get single item or array of items from storage, return either array or response */
  async #retrieveUserData() {
    let toFetch = this.receivedMsg.getStorage;
    let ansObj = {};
    if (Array.isArray(toFetch)) {
      let /** @type {Promise[]} */ promiseList = [];
      toFetch.forEach(async (item) => {
        promiseList.push(this.#getAnItem(item));
      });
      let storageList = await Promise.all(promiseList);
      toFetch.forEach((item, index) => {
        ansObj[item] = storageList[index];
      });
    } else {
      ansObj[toFetch] = await this.#getAnItem(toFetch);
    }
    return ansObj;
  }
  async #getAnItem(getItem) {
    return await getFromStorage(getItem); //
  }

  /** list of one offs that could each be their own functions, but aren't */
  async #miscTasks() {
    switch (this.receivedMsg.miscTask) {
      case "getOrsTabIds":
        return await getTabIdsFromTabQuery({
          url: "*://www.oregonlegislature.gov/bills_laws/ors/ors*.html*",
        });
      case "buildColorData":
        return await generateCSS(); // styles.js returns object (list of user preferences)
      case "getPaletteList":
        return getPalletteList(); // webResources.js returns object
      case "finishAnnoRetrieval":
        return await finishAnnoRetrieval(); // webResources.js returns object
      default:
        throw new Error("Unidentified misc task requested");
    }
  }

  /** Returns json file from stored resources as JS object */
  async #fetchJson() {
    return await readJsonFile(`${this.receivedMsg.fetchJson}.json`); // webResources.js -
  }

  /** Retrieve volume, title and chapter/title names from json file */
  async #getChapInfo() {
    return await getChapterInfo(this.receivedMsg.getChapInfo);
  }

  /** begins annotation retrieval */
  #startAnnos() {
    startAnnoRetrieval(this.receivedMsg.startAnnos); // webResources.js
    return true;
  }

  #newOrsTabs() {
    buildAndNavigateToUrls(this.receivedMsg.navToOrs); //navigate.js
    return true;
  }
}

/** build main listener body */
/** receives messages from popup.js, options.js & content scripts (/content/*.js) */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    let response = await handleMessage(message, sender);
    sendResponse(response); // still does not support async; callback wrapper required
  })();
  return true; // even if no response sent, required to keep port open
});

/** builds new MessageObj */
const handleMessage = async (message, sender) => {
  let newMsg = new MessageObj(message, sender);
  if (newMsg.receivedMsg == null || newMsg.receivedMsg == undefined) {
    throw new Error("Received null/undefined message");
  }
  if (await newMsg.doTasksAndFetchResponse()) {
    return { response: newMsg.responseToSend };
  } else {
    let error = new Error(
      "Completing task and fetching response failed on handleMessage()"
    );
    return error;
  }
};
