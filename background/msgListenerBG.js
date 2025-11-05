//background/msgListener.js

/** Receives message and sends response */
class MessageObj {
  constructor({ message: receivedMsg }, { url }) {
    // destructure to get msg & url in msg object
    if (receivedMsg == null) {
      this.responseToSend = new Error(
        "Null message received by background.js listener."
      );
      this.isLog = true;
    } else {
      this.receivedMsg = receivedMsg;
      this.isLog = Boolean("log" in this.receivedMsg);
      if (!this.isLog) {
        this.fromName = url.match(/[^/]*\.html/);
        this.stringyMsg = JSON.stringify(this.receivedMsg).slice(0, 60);
      }
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
      log: () => this.#logMessage(), //returns true & displays msg on service worker console
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
      `Message type unidentifiable: ${this.stringyMsg}`
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

  /** sends notes delivered by message to console;
   * log object = log.{doWarn, txt, script, aCaller and color} */
  #logMessage() {
    let log = this.receivedMsg.log;
    if (log.doWarn) {
      warnBG(log.txt, log.script, log.aCaller, log.color); // helperBG.js
    } else if (log.doWarn == false) {
      infoBG(log.txt, log.script, log.aCaller, log.color); // helperBG.js
    } else {
      return new Error("unidentified log message requested");
    }
    return true; // ought to be unnecessary, but otherwise may time out waiting for response
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
  if (
    //newMsg == null ||
    newMsg.receivedMsg == null ||
    newMsg.receivedMsg == undefined
  ) {
    throw new error("Received null/undefined message");
  }
  if (!newMsg.isLog) {
    // don't want a create duplicate log messages
    infoBG(
      `Background received from '${newMsg.fromName}' request: '${newMsg.stringyMsg}'`,
      "msgListenerBG.js",
      "handleMessage",
      "#fb8"
    );
  }
  if (await newMsg.doTasksAndFetchResponse()) {
    if (!newMsg.isLog) {
      infoBG(
        `BG response to ${newMsg.stringyMsg.split(":")[0].slice(1)} request: '${JSON.stringify(
          newMsg.responseToSend
        ).slice(0, 30)}...'`,
        "msgListenerBG.js",
        "handleMessage",
        "#fb8"
      );
      return { response: newMsg.responseToSend };
    }
  } else {
    let error = new Error(
      "Completing task and fetching response failed on handleMessage()"
    );
    warnBG(error.message, "msgListenerBG.js", "handleMessage");
    return error;
  }
};
