let browser;
try {
  browser = chrome;
} catch {
  console.info("Setting browser to Chrome triggered an error");
}

class MessageDispatch {
  constructor(msg, sendTo = "background") {
    this.sendTo = sendTo == "tabs" ? "toMORS" : "message";
    this.msg = { [this.sendTo]: msg };
    this.LogInMsg = false;
    if (typeof msg == "object") {
      this.LogInMsg = "log" in msg;
      this.stringyMsg = `${JSON.stringify(msg)} ==> '${sendTo}'`;
    }
    this.response;
  }

  /**sends message and returns response and stores it in this.response */
  async sendAwaitResponse() {
    this.logIfNotRecursive(
      `Sending ${this.stringyMsg} and awaiting response.`,
      "sendResponse",
      false
    );
    try {
      let msgResponse = await this.sendCallback();
      if (msgResponse.response != null && msgResponse.response != undefined) {
        this.response = msgResponse.response;
        this.stringyResponse = JSON.stringify(this.response);
        this.logIfNotRecursive(
          `Received response: ${this.stringyResponse}`,
          "sendResponse",
          false
        );
      } else {
        throw new Error(
          `Response from message '${this.stringyMsg}' was unexpected or missing value: '${this.response}'`
        );
      }
    } catch (error) {
      this.logIfNotRecursive(
        `Could not send and receive response: ${error}`,
        "sendResponse",
        true
      );
      this.response = "";
    }
    return this.response;
  }
  async sendCallback() {
    return await browser.runtime.sendMessage(this.msg);
  }

  sendOneWay() {
    if (this.sendTo == "toMORS") {
      this.sendToMors();
    } else {
      this.sendToBackground();
    }
    this.logIfNotRecursive(
      `Sending ${this.stringyMsg} (no response requested).`,
      "sendResponse",
      false
    );
  }
  async sendToMors() {
    let orsTabIdList = [];
    try {
      let getTabsList = new MessageDispatch(
        { miscTask: "getOrsTabIds" },
        "background"
      );
      orsTabIdList = await getTabsList.sendAwaitResponse();
    } catch (error) {
      this.logIfNotRecursive(
        `Error retrieving ORS tabs: ${error}`,
        "sendToMors",
        true
      );
    }
    try {
      orsTabIdList.forEach((tabId) => {
        browser.tabs.sendMessage(tabId, this.msg);
      });
    } catch (error) {
      this.logIfNotRecursive(
        `Could not send message: ${error}`,
        "sendResponse",
        true
      );
    }
  }
  sendToBackground() {
    try {
      browser.runtime.sendMessage(this.msg);
    } catch (error) {
      this.logIfNotRecursive(
        `Could not send message: ${error}`,
        "sendResponse",
        true
      );
    }
  }

  /** if this is not already a message, log information about sending & receiving*/
  logIfNotRecursive(logMsg, functionName = "", warn = false) {
    if (this.LogInMsg == false) {
      let msg = new MessageDispatch({
        log: {
          doWarn: warn,
          txt: warn ? logMsg : logMsg.slice(0, 100),
          script: "popAndOpHelper.js",
          aCaller: functionName,
          color: warn ? "yellow" : "#af9", // green
        },
      });
      msg.sendOneWay();
    }
    if (warn) {
      console.warn(logMsg); // want to make sure this gets seen somehow
    }
  }
}

/**Retrieves list of available options from background/webResources.js & puts it into dropdown menu */
const displayPaletteDropdownList = async () => {
  let msg = new MessageDispatch({ miscTask: "getPaletteList" }); // pull in existing options in json, plus "Custom"
  let colorOptionsList = await msg.sendAwaitResponse();
  try {
    cssDropDown.options = []; // not cssDropDown.options = []? But if it ain't broke...
    colorOptionsList.forEach((colorOption) => {
      const selectOption = document.createElement("option");
      selectOption.value = colorOption;
      selectOption.textContent = colorOption;
      cssDropDown?.appendChild(selectOption);
    });
  } catch (error) {
    warnPopup(
      `Error displaying css options: ${error}`,
      "displayPaletteDropdownList"
    );
  }
};
