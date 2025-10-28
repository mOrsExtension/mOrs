//background/msgListener.js

class MessageObj {
  constructor(message, sender) {
    if (message.message == null) {
      this.responseMsg = new Error(
        "Null message received by background.js listener."
      );
      this.isLog = true;
    } else {
      this.receivedMsg = message.message;
      this.isLog = "log" in this.receivedMsg;
      if (!this.isLog) {
        this.fromName = sender.url.match(/[^\/]*\.html/);
        this.stringyMsg = JSON.stringify(this.receivedMsg).slice(0, 60);
      }
    }
  }

  async doTasksAndFetchResponse() {
    this.responseMsg =
      "getStorage" in this.receivedMsg
        ? await this.#retrieveUserData() // returns object(s)
        : "fetchJson" in this.receivedMsg
        ? await this.#fetchJson() // returns jsonItem
        : "getChapInfo" in this.receivedMsg
        ? await this.#getChapInfo() // returns obj(vol, title, chp)
        : "miscTask" in this.receivedMsg
        ? await this.#miscTasks() // returns any
        : "newOrsTabs" in this.receivedMsg
        ? this.#newOrsTabs() // returns true (launches new tabs)
        : "startAnnos" in this.receivedMsg
        ? this.#startAnnos() // returns true (starts background loading annotations)
        : "log" in this.receivedMsg
        ? this.#logMessage() // returns true (displays message on background service worker)
        : new Error(
            `message type not identified for request:/n${this.stringyMsg}`
          );
    try {
      if (this.responseMsg != null) {
        this.stringyResponse = JSON.stringify(this.responseMsg).slice(0, 60);
        return true;
      }
      return false;
    } catch {
      return false;
    }
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
    let task = this.receivedMsg.miscTask;
    return task == "getOrsTabIds"
      ? await getTabIdsFromTabQuery({
          url: "*://www.oregonlegislature.gov/bills_laws/ors/ors*.html*",
        })
      : task == "buildColorData"
      ? await generateCSS() // styles.js returns object (list of user prefs)
      : task == "getPaletteList"
      ? await promiseGetPalletteList() // webResources.js returns object
      : task == "finishAnnoRetrieval"
      ? await finishAnnoRetrieval() // webResources.js returns object
      : new Error("unidentified misc task requested");
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
    return await promiseReadJsonFile(`${this.receivedMsg.fetchJson}.json`); // webResources.js -
  }

  /** Retrieve volume, title and chapter/title names from json file */
  async #getChapInfo() {
    return await promiseGetChapterInfo(this.receivedMsg.getChapInfo);
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
    return;
  }
  if (!newMsg.isLog) {
    // don't want a create duplicate log messages
    infoBG(
      `Background has received from '${newMsg.fromName}' request '${newMsg.stringyMsg}'`,
      "msgListenerBG.js",
      "handleMessage",
      "#fb8"
    );
  }
  if (await newMsg.doTasksAndFetchResponse()) {
    if (!newMsg.isLog) {
      infoBG(
        `Background response to request: '${newMsg.stringyResponse}'`,
        "msgListenerBG.js",
        "handleMessage",
        "#fb8"
      );
      return { response: newMsg.responseMsg };
    }
  } else {
    let error = new Error(
      "Completing task and fetching response failed on handleMessage()"
    );
    warnBG(error.message, "msgListenerBG.js", "handleMessage");
    return error;
  }
};
