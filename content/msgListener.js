//content/addListeners.js

/**Allows ORS tab to receive information sent from popup.js - no response given */
const listenToPopup = () => {
  /*** NOTE ***
   * onMessage.addListener *needs* to make it's response to promise through a callback. Don't use async/await */
  browser.runtime.onMessage.addListener((msg, _sender, _response) => {
    const msgText = msg.toMORS;
    try {
      infoCS(
        `Query from popup: "${Object.keys(msgText)}: ${Object.values(
          msgText
        )}"`,
        "addListeners.js",
        "listenToPopup"
      );
      switch (Object.keys(msgText)[0]) {
        case "showBurnt":
          showBurnt(msgText["showBurnt"]); // helper.js
          break;

        case "showSourceNote":
          showSourceNotes(msgText["showSourceNote"]); // helper.js
          break;

        case "updateOrLawsReader":
          displayOrLaws(document.getElementById("main")); // orLawLink.js - popup is sending a value, but not used, looks up new stored data
          break;

        case "updateCss":
          userStylesRefresh(); // stylesheet.js
          break;

        case "collapseAll":
          msgText["collapseAll"] ? collapseAllSections() : expandAllSections(); // helper.js
          break;

        case "displayFullWidth":
          setFullWidth(msgText["displayFullWidth"]); // helper.js
          break;

        case "showMenu":
          showMenu(msgText["showMenu"]); // helper.js
          break;

        case "showNav":
          showVolumeOutline(msgText["showNav"]);
          break;

        case "showTOC":
          showTOC(msgText["showTOC"]);
          break;

        case "showAnnos":
          showAnnos(msgText["showAnnos"]);
          break;

        case "showVerbose":
          showVerbose(msgText["showVerbose"]);
          break;

        default:
          throw new Error(
            `Unidentified message from popup.html: ${
              Object.keys(msgText)[0]
            } : ${Object.values(msgText)}`
          );
      }
    } catch (error) {
      warnCS(error, "addListeners.js", "listenToPopup");
      throw error;
    }
  });
};
