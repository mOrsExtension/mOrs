/* global browser, MessageDispatch, displayPaletteDropdownList*/
//popup.js
//dependant on popAndOpHelper.js

/**open new tab with URL */
const launchNewTab = (url) => {
  browser.tabs.create({ url: url });
};

//main functions
const popupMain = async () => {
  updateCssForPopup();
  displayExistingUserOptions();
  addListenerHelp();
  addListenerOptions();
  addListenerCheckboxes();
};

/**retrieves user data preferences to style popup stylesheet */
const updateCssForPopup = async () => {
  let msg = new MessageDispatch({ miscTask: "buildColorData" }); // calls /background/style.js
  const newCss = await msg.sendAwaitResponse();
  for (let key in newCss) {
    theRoot.style.setProperty(`--${key}`, newCss[key]);
  }
};

const displayExistingUserOptions = async () => {
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
};

/** checks user profile for listed variables (all of them) to populate popup*/
const fetchAllStoredData = async () => {
  let msg = new MessageDispatch({
    getStorage: [
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
    launchNewTab(browser.runtime.getURL(`/options/options.html`));
  });
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
};

//Store changed value and update ORS tabs with update message
const storeAndUpdateTabs = async (newValue, storeTo, msgToTabs) => {
  if (newValue != null) {
    browser.storage.sync.set({ [storeTo]: newValue });
    newMsg.sendOneWay(new MessageDispatch({ [msgToTabs]: newValue }, "tabs"));
  }
};

// Constant global variables for popup.js
// set variables to match elements on popup.html
const helpButton = document.getElementById("helpButton");
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
const versionID = document.getElementById("version");
const theRoot = document.documentElement;

window.addEventListener("load", () => {
  popupMain();
});
