/* exported listenToPopup*/
/* globals infoCS, warnCS, browser, showBurnt, showSourceNotes, displayOrLaws, userStylesRefresh, collapseAllSections, expandAllSections, setFullWidth, showMenu, showVolumeOutline, showTOC, showAnnos, showVerbose, */
//content/addListeners.js

/**Allows ORS tab to receive information sent from popup.js - no response given */
const listenToPopup = () => {
  /*** NOTE ***
   * onMessage.addListener *needs* to make it's response to promise through a callback. Don't use async/await */
  browser.runtime.onMessage.addListener((msg) => {
    const { toMORS: msgText } = msg.toMORS;
    const msgType = Object.keys(msgText)[0];
    const msgValue = Object.values(msgText)[0];
    try {
      infoCS(
        `From popup: "${msgType}: ${msgValue}"`,
        "addListeners.js",
        "listenToPopup(callback)"
      );
      switch (msgType) {
        case "showBurnt":
          showBurnt(msgValue); // helper.js
          break;

        case "showSourceNote":
          showSourceNotes(msgValue); // helper.js
          break;

        case "updateOrLawsReader":
          displayOrLaws(document.getElementById("main")); // orLawLink.js - popup is signaling change, but change is value looked up from stored data
          break;

        case "updateCss":
          userStylesRefresh(); // stylesheet.js
          break;

        case "collapseAll":
          msgValue ? collapseAllSections() : expandAllSections(); // helper.js
          break;

        case "displayFullWidth":
          setFullWidth(msgValue); // helper.js
          break;

        case "showMenu":
          showMenu(msgValue); // helper.js
          break;

        case "showNav":
          showVolumeOutline(msgValue);
          break;

        case "showTOC":
          showTOC(msgValue);
          break;

        case "showAnnos":
          showAnnos(msgValue);
          break;

        case "showVerbose":
          showVerbose(msgValue);
          break;

        default:
          throw new Error(
            `Unidentified message from popup.html: ${msgType} : ${msgValue}`
          );
      }
    } catch (error) {
      warnCS(error, "addListeners.js", "listenToPopup");
      throw error;
    }
  });
};
