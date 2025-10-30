//popup.js
//dependant on popAndOpHelper.js

/**open new tab with URL */
const launchNewTab = (url) => {
  browser.tabs.create({ url: url });
};

/** Info message handling (Log to service worker inspection)
 * @param {string} infoTxt
 * @param {string} [calledBy]*/
const infoPopup = (infoTxt, calledBy = "??") => {
  let msg = new MessageDispatch({
    log: {
      doWarn: false,
      txt: infoTxt,
      aCaller: calledBy,
      script: "popup.js",
      color: "cyan",
    },
  });
  msg.sendOneWay();
};

/**  Warning message handling (Log to service worker inspection)
 * @param {string} warnTxt
 * @param {string} calledBy */
const warnPopup = (warnTxt, calledBy = "??") => {
  let msg = new MessageDispatch({
    log: { doWarn: true, txt: warnTxt, script: "popup.js", aCaller: calledBy },
  });
  msg.sendOneWay();
};

//main functions
const popupMain = async () => {
  try {
    updateCssForPopup();
    displayExistingUserOptions();
    addListenerHelp();
    addListenerOptions();
    addListenerCheckboxes();
  } catch (error) {
    warnPopup(error, "popUpMain");
    throw error;
  }
};

/**retrieves user data preferences to style popup stylesheet */
const updateCssForPopup = async () => {
  let msg = new MessageDispatch({ miscTask: "buildColorData" }); // calls /background/style.js
  const newCss = await msg.sendAwaitResponse();
  infoPopup(
    `Setting popup stylesheet properties:\n${JSON.stringify(newCss)}`,
    "updateCssPopup"
  );
  for (let key in newCss) {
    theRoot.style.setProperty(`--${key}`, newCss[key]);
  }
};

const displayExistingUserOptions = async () => {
  try {
    await displayPaletteDropdownList();
    const storedData = await fetchAllStoredData();
    showBurntCheck.checked = storedData.doShowBurnt;
    showSNsCheck.checked = storedData.doShowSourceNotes;
    showFWCheck.checked = storedData.doShowFullWidth;
    collapseCheck.checked = storedData.isCollapseDefault;
    showMenuCheck.checked = storedData.doShowMenu;
    showNavCheck.checked = storedData.doShowVolNav;
    showTocCheck.checked = storedData.doShowTOC;
    showAnnosCheck.checked = storedData.doShowAnnos;
    showVerboseCheck.checked = storedData.doShowVerbose;
    for (let i = 0; i < cssDropDown.options.length; i++) {
      if (cssDropDown?.options[i].value == storedData.cssSelector) {
        cssDropDown.selectedIndex = i;
        break;
      }
    }
    for (let i = 0; i < orLawDropDown.options.length; i++) {
      if (orLawDropDown?.options[i].value == storedData.lawsReader) {
        orLawDropDown.selectedIndex = i;
        break;
      }
    }
    let manifest = browser.runtime.getManifest();
    versionID.innerHTML = `v.${manifest.version}`;
  } catch (error) {
    warnPopup(error, "displayExistingUserOptions");
    throw error;
  }
};

/** checks user profile for listed variables (all of them) to populate popup*/
const fetchAllStoredData = async () => {
  let msg = new MessageDispatch({
    getStorage: [
      "doShowVerbose",
      "lawsReader",
      "cssSelector",
      "doShowSourceNotes",
      "doShowBurnt",
      "doShowFullWidth",
      "doShowMenu",
      "doShowVolNav",
      "doShowTOC",
      "doShowAnnos",
      "isCollapseDefault",
    ],
  });
  return await msg.sendAwaitResponse();
};

// User clicks "Help" button
const addListenerHelp = () => {
  helpButton?.addEventListener("click", () => {
    launchNewTab(
      "https://github.com/mOrsExtension/mOrs/wiki/Help-Using-Omnibox"
    );
  });
};

const addListenerOptions = () => {
  colorOptionsButton?.addEventListener("click", () => {
    infoPopup("launching options.html", "addAllListeners/colorOptions");
    launchNewTab(browser.runtime.getURL(`/options/options.html`));
  });
};

/** sends message in popup text field to user - NOTE: currently unused */
const userMsg = (
  /**@type {string} */ msgText,
  /**@type {string} */ color = "default"
) => {
  htmlMsgBox.innerHTML = `<span style='color:${color}'>${msgText}</span>`;
};
/** Setup all event listeners for form drop downs & buttons */

const addListenerCheckboxes = () => {
  cssDropDown?.addEventListener("change", () => {
    storeAndUpdateTabs(cssDropDown.value, "cssSelector", "updateCss");
    updateCssForPopup();
  });
  orLawDropDown?.addEventListener("change", () => {
    storeAndUpdateTabs(orLawDropDown.value, "lawsReader", "updateOrLawsReader");
  });
  showBurntCheck?.addEventListener("change", () => {
    storeAndUpdateTabs(showBurntCheck.checked, "doShowBurnt", "showBurnt");
  });
  showSNsCheck?.addEventListener("change", () => {
    storeAndUpdateTabs(
      showSNsCheck.checked,
      "doShowSourceNotes",
      "showSourceNote"
    );
  });
  showFWCheck?.addEventListener("change", () => {
    storeAndUpdateTabs(
      showFWCheck.checked,
      "doShowFullWidth",
      "displayFullWidth"
    );
  });
  collapseCheck?.addEventListener("change", () => {
    storeAndUpdateTabs(
      collapseCheck.checked,
      "isCollapseDefault",
      "collapseAll"
    );
  });
  showNavCheck?.addEventListener("change", async () => {
    storeAndUpdateTabs(showNavCheck.checked, "doShowVolNav", "showNav");
  });
  showMenuCheck?.addEventListener("change", async () => {
    storeAndUpdateTabs(showMenuCheck.checked, "doShowMenu", "showMenu");
  });
  showTocCheck?.addEventListener("change", async () => {
    storeAndUpdateTabs(showTocCheck.checked, "doShowTOC", "showTOC");
  });
  showAnnosCheck?.addEventListener("change", async () => {
    storeAndUpdateTabs(showAnnosCheck.checked, "doShowAnnos", "showAnnos");
  });
  showVerboseCheck?.addEventListener("change", async () => {
    storeAndUpdateTabs(
      showVerboseCheck.checked,
      "doShowVerbose",
      "showVerbose"
    );
  });
};

//Store changed value and update ORS tabs with update message
const storeAndUpdateTabs = async (newValue, storeTo, msgToTabs) => {
  try {
    if (newValue != null) {
      await storeUserKey({ [storeTo]: newValue });
      let newMsg = new MessageDispatch({ [msgToTabs]: newValue }, "tabs");
      newMsg.sendOneWay();
    }
  } catch (error) {
    warnPopup(
      `error storing ${newValue} to ${storeTo}: ${error}`,
      "storeAndUpdateTabs"
    );
    throw error;
  }
};

/** Save user values to browser's user settings*/
const storeUserKey = async (keyValueObj) => {
  try {
    await browser.storage.sync.set(keyValueObj);
    infoPopup(
      `stored user data: ${JSON.stringify(keyValueObj)}`,
      "storeUserKey"
    );
    return true;
  } catch (error) {
    warnPopup(error, "storeUserKey");
    throw error;
  }
};

// Constant global variables for popup.js
// set variables to match elements on popup.html
const helpButton = document.getElementById("helpButton");
const htmlMsgBox = document.getElementById("userMsg");
const cssDropDown = document.getElementById("cssSelector");
const colorOptionsButton = document.getElementById("colorOptions");
const orLawDropDown = document.getElementById("OrLaws");
const showBurntCheck = document.getElementById("showBurnt");
const showSNsCheck = document.getElementById("showSNote");
const showFWCheck = document.getElementById("showFullWidth");
const collapseCheck = document.getElementById("collapseDefault");
const showMenuCheck = document.getElementById("showMenu");
const showNavCheck = document.getElementById("showNav");
const showTocCheck = document.getElementById("showToc");
const showAnnosCheck = document.getElementById("showAnnos");
const showVerboseCheck = document.getElementById("showVerbose");
const versionID = document.getElementById("version");
const theRoot = document.documentElement;

window.addEventListener("load", () => {
  popupMain();
});
