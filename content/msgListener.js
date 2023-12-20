//content/addListeners.js
//@ts-check

/**Allows ORS tab to receive information sent from popup.js - no response given */
const listenToPopup = () => {
   /*** NOTE ***
   * onMessage.addListener *needs* to make it's response to promise through a callback. Don't use async/await */
   browser.runtime.onMessage.addListener((msg, _sender, _reponse) => {
      const msgText = msg.toMORS
      try {
         infoCS(
            `Query from popup: "${Object.keys(msgText)}: ${Object.values(msgText)}"`,
            'addListeners.js',
            'listenToPopup'
         )
         switch (Object.keys(msgText)[0]) {
            case 'showBurnt':
            doShowBurnt(msgText['showBurnt']) // helper.js
            break

            case 'showSourceNote':
            doShowSourceNotes(msgText['showSourceNote']) // helper.js
            break

            case 'updateOrLawsReader':
            newOrUpdateOrLawLinks(document.getElementById('main')) // orlawlink.js - popup is sending a value, but not used, looks up new stored data
            break

            case 'updateCss':
            userStylesRefresh() // stylesheet.js
            break

            case 'collapseAll':
            msgText['collapseAll'] ? collapseAllSections() : expandAllSections() // helper.js
            break

            case 'displayFullWidth':
            setFullWidth(msgText['displayFullWidth']) // helper.js
            break

            case 'showMenu':
            doShowMenu(msgText['showMenu']) // helper.js
            break

            case 'showNav':
            doShowNav(msgText['showNav'])
            break

            default:
            throw new Error(
               `Unidentified message from popup.html: ${
                  Object.keys(msgText)[0]
               } : ${Object.values(msgText)}`
            )
         }
      } catch (e) {
         warnCS(e, 'addListeners.js', 'listenToPopup')
      }
   })
}
