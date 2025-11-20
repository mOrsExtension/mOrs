/* exported displayPaletteDropdownList */
/* global chrome, cssDropDown, warnPopup */
//popAndOpHelper.js//
let browser;
try {
  browser = chrome;
} catch {
  console.warn("Setting browser to Chrome triggered an error");
}

class MessageDispatch {
  constructor(msg, sendTo = "background") {
    this.sendTo = sendTo == "tabs" ? "toMORS" : "message";
    this.msg = { [this.sendTo]: msg };
    this.response;
  }

  /**sends message and returns response and stores it in this.response */
  async sendAwaitResponse() {
    try {
      let {msgResponse: response} = await this.sendCallback();
      if (msgResponse != null && msgResponse != undefined) {
        this.response = msgResponse;
      } else {
        throw new Error(
          `Response from message '${JSON.stringify(msg)} ==> '${sendTo}' was unexpected or missing`
        );
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
      console.warn(`Failed to fetch tabs: ${error}`);
    }
    try {
      orsTabIdList.forEach((tabId) => {
        browser.tabs.sendMessage(tabId, this.msg);
      });
    } catch (error) {
      console.warn(`Could not send message to tabs: ${error}`);
    }
  }
  sendToBackground() {
    try {
      browser.runtime.sendMessage(this.msg);
    } catch (error) {
      console.warn(`Could not send message to background: ${error}`);
    }
  }
}

/**Retrieves list of available options from background/webResources.js & puts it into dropdown menu */
const displayPaletteDropdownList = async () => {
  let msg = new MessageDispatch({ miscTask: "getPaletteList" }); // pull in existing options in json, plus "Custom"
  let colorOptionsList = await msg.sendAwaitResponse();
  cssDropDown.options = [];
  colorOptionsList.forEach((colorOption) => {
    const selectOption = document.createElement("option");
    selectOption.value = colorOption;
    selectOption.textContent = colorOption;
    cssDropDown?.appendChild(selectOption);
  });
};
