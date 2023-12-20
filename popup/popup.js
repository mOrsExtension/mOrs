//popup.js
//@ts-check

//TODO #13 - move much of this off to background helpers, so don't duplicate in options and content.

const main = async () => {

   // TODO: #14 Send this task to background storage.js and operate through messages
   /** Save user values to browser's user settings
   * @param {{any: any}} keyAndValueObj*/
   const promiseStoreKey = async keyAndValueObj => {
      try {
         await browser.storage.sync.set(keyAndValueObj)
         infoPopup(
            `stored user data: ${JSON.stringify(Object.keys(keyAndValueObj))}`,
            'promiseStoreKey'
         )
         return true
      } catch (error) {
         warnPopup(error, 'setPromiseStoreKey')
      }
   }

   //TODO: #15 build entire message handling class for popup.js
   /** Message passing to background.js (send message & resolves response)
   * @param {string|object} requestMsg */
   const promiseSendRequestToBG = async requestMsg => {
      try {
         const response = await browser.runtime.sendMessage({message: requestMsg})
         return response.response
      } catch (error) {
         const requestString = (typeof requestMsg == "object" ? JSON.stringify(requestMsg) : requestMsg)
         /** if can't send things to background, then popupWarn is likely broken too */
         console.warn(`Failed: {message: ${requestString}} was NOT sent to background/msgReader.js`)
         console.warn(error)
      }
   }

   /** Info message handling (Log to service worker inspection)
   * @param {string} infoTxt
   * @param {string} [calledBy]*/
   const infoPopup = (infoTxt, calledBy = '??') => {
      promiseSendRequestToBG({
         info: {
            script: 'popup.js',
            txt: infoTxt,
            aCaller: calledBy,
            color: 'cyan'
         }
      })
   }

   /**  Warning message handling (Log to service worker inspection)
   * @param {string} warnTxt
   * @param {string} calledBy */
   const warnPopup = (warnTxt, calledBy = '??') => {
      promiseSendRequestToBG({  //TODO, can I kill await? There's no reason to wait on logging
         warn: {
            script: 'popup.js',
            txt: warnTxt,
            aCaller: calledBy
         }
      })
   }

   /** Send message to ORS tabs (no response requested).
   * Receiving done by tabs through /content/addListeners.js
   * @param {object} message*/
   const sendMsgToOrsTabs = async message => {
      try {
         const orsTabs = await promiseSendRequestToBG('getOrsTabs')
         for (const aTab of orsTabs) {
            browser.tabs.sendMessage(aTab.id, { toMORS: message })
            infoPopup(
               `Sent '${JSON.stringify(message)}' to tab #${aTab.id}`,
               'sendMsgToOrsTabs'
            )
         }
      } catch (e) {
         warnPopup(e, 'sendMsgToOrsTabs')
      }
   }

   /**retrieves user data preferences for purpose of popup stylesheet */
   const updateCssPopup = async () => {
      try {
         const newCss = await promiseSendRequestToBG('getBrowserStoredColorData') // calls /background/style.js
         infoPopup(
            `Setting popup stylesheet properties:\n${JSON.stringify(newCss)}`,
            'updateCssPopup'
         )
         for (let key in newCss) {
            theRoot.style.setProperty(`--${key}`, newCss[key])
         }
      } catch (e) {
         warnPopup(`Error applying stylesheet ${e}.`, 'updateCssPopup')
      }
   }

   /**Retrieves list of available options from background/webResources.js & puts it into popup */
   const promiseRefreshOptions = async () => {
      let colorOptionsList = await promiseSendRequestToBG('getPaletteList') // pull in existing options in json, plus one "Custom"
      try {
         cssDropDown.options.length = 0 // not cssDropDown.options = []? But if it ain't broke...
         colorOptionsList.forEach(colorOption => {
            const selectOption = document.createElement("option")
            selectOption.value = colorOption
            selectOption.textContent = colorOption
            cssDropDown?.appendChild(selectOption)
         })
      } catch (e) {
         warnPopup(`Error displaying css options: ${e}`, 'promiseRefreshOptions')
         return false
      }
      return true // TODO: #16 not sure if we need to return anything, but might work better in promise.all
   }

   const displayUserOptions = async () => {
      const storedDataFinder = () => {
         return Promise.all([
            promiseSendRequestToBG('getCssUserOption'), //0 index in storedDataFinder below
            promiseSendRequestToBG('getOrLaw'), //1
            promiseSendRequestToBG('getShowBurnt'), //2
            promiseSendRequestToBG('getShowSNs'), //3
            promiseSendRequestToBG('getFullWidth'), //4
            promiseSendRequestToBG('getCollapsed'), //5
            promiseSendRequestToBG('getShowMenu'), //6
            promiseRefreshOptions()
         ])
      }

      // MAIN displayUserOptions
      try {
         const storedData = await storedDataFinder()
         for (let i = 0; i < cssDropDown.options.length; i++) {
            if (cssDropDown?.options[i].value == storedData[0]) {
               cssDropDown.selectedIndex = i
               break
            }
         }
         // @ts-ignore  (property exists)
         for (let i = 0; i < orLawDropDown.options.length; i++) {
            if (orLawDropDown?.options[i].value == storedData[1]) {
               orLawDropDown.selectedIndex = i
               break
            }
         }
         showBurntCheck.checked = storedData[2]
         showSNsCheck.checked = storedData[3]
         showFWCheck.checked = storedData[4]
         collapseCheck.checked = storedData[5]
         showMenuCheck.checked = storedData[6]
         let manifest = browser.runtime.getManifest()
         versionID.innerHTML = `v.${manifest.version}`
      } catch (e) {
         warnPopup(e)
      }
   }

   /**send message in popup text field to user
   * @param {String} msgText
   * @param {String} color
   */
   const userMsg = (msgText, color = 'default') => {
      htmlMsgBox.innerHTML = `<span style='color:${color}'>${msgText}</span>`
   }

   /** Setup all event listeners for form drop downs & buttons */
   const addAllListeners = () => {
      //User enters after filling out 'Navigate:' form box
      orsSearch?.addEventListener('submit', () => {
         infoPopup(`Search ran for '${orsSearch.value}'`)
         promiseSendRequestToBG({ navToOrs: orsSearch.value })
      })
      // User clicks "Launch" button
      launchButton.addEventListener('click', () => {
         infoPopup(`Search ran for '${orsSearch.value}'`)
         promiseSendRequestToBG({ navToOrs: orsSearch.value })
      })
      // User clicks "Help" button
      helpButton?.addEventListener('click', () => {
         browser.tabs.create({
            url: 'https://github.com/mOrsExtension/mOrs/blob/master/mORSerror.md'
         })
      })
      // User clicks "Example" button
      exampleButton?.addEventListener('click', () => {
         userMsg('No examples (yet)!', 'pink')
      })
      // User clicks "Set Custom Colors"
      colorOptions?.addEventListener('click', () => {
         infoPopup('launching options.html', 'addAllListeners/colorOptions')
         browser.tabs.create({url: browser.runtime.getURL(`/options/chrome/options.html`)})
      })
      //User changes option on "Display Colors:"
      cssDropDown?.addEventListener('change', async () => {
         try {
            await promiseStoreKey({ cssSelectorStored: cssDropDown.value })
            sendMsgToOrsTabs({ updateCss: true }) // alert tabs that css sheet has changed (value does not matter, so sending true)
            updateCssPopup() // update colors on the current popup as well
         } catch (e) {
            warnPopup(`error storing css from dropdown ${e}`)
         }
      })
      //User changes option on "Oregon Session Law Lookup Source"
      orLawDropDown?.addEventListener('change', async () => {
         try {
            await promiseStoreKey({ lawsReaderStored: orLawDropDown.value })
            sendMsgToOrsTabs({ updateOrLawsReader: orLawDropDown.value })
         } catch (e) {
            warnPopup(`store lawReader dropdown: ${e}`)
         }
      })
      //User changes option on "Show repealed/renumbered sections"
      showBurntCheck?.addEventListener('change', async () => {
         try {
            await promiseStoreKey({ showBurntStored: showBurntCheck.checked })
            sendMsgToOrsTabs({ showBurnt: showBurntCheck.checked }) // alert tabs that visibility of burnt sections has changed
         } catch (e) {
            warnPopup('store burntCheck failed.')
            warnPopup(e)
         }
      })
      //User changes option on "Show section source notes"
      showSNsCheck?.addEventListener('change', async () => {
         try {
            await promiseStoreKey({ showSNsStored: showSNsCheck.checked })
            sendMsgToOrsTabs({ showSourceNote: showSNsCheck.checked }) // alert tabs that visibility of source notes has changed
         } catch (e) {
            warnPopup(`store source note check failed`)
            warnPopup(e)
         }
      })
      //User changes option on "Full width display"
      showFWCheck?.addEventListener('change', async () => {
         try {
            await promiseStoreKey({ showFullWidth: showFWCheck.checked })
            sendMsgToOrsTabs({ displayFullWidth: showFWCheck.checked })
         } catch (e) {
            warnPopup(`full width check failed`)
            warnPopup(e)
         }
      })
      //User changes option on "Collapse all ORS sections by default"
      collapseCheck?.addEventListener('change', async () => {
         try {
            await promiseStoreKey({ collapseDefaultStored: collapseCheck.checked })
            sendMsgToOrsTabs({ collapseAll: collapseCheck.checked })
         } catch (e) {
            warnPopup(`store collapse by default checkbox failed`)
            warnPopup(e)
         }
      })
      //User changes option on "Show Navigation Button"
      showNavCheck?.addEventListener('change', async () => {
         try {
            await promiseStoreKey({ showNavStored: showNavCheck.checked })
            sendMsgToOrsTabs({ showNav: showNavCheck.checked }) // change visibility of menu
         } catch (e) {
            warnPopup(`store Menu checkbox failed`)
            warnPopup(e)
         }
      })

      //User changes option on "Show Menu Button"
      showMenuCheck?.addEventListener('change', async () => {
         try {
            await promiseStoreKey({ showMenuStored: showMenuCheck.checked })
            sendMsgToOrsTabs({ showMenu: showMenuCheck.checked }) // change visibility of menu
         } catch (e) {
            warnPopup(`store Menu checkbox failed`)
            warnPopup(e)
         }
      })
   } // addAllListeners

   /** POPUP.js MAIN (executed at end, wrapped in an async) */
   //set up browser (maybe unnecessary, but ??)
   let browser
   try {
      browser = chrome
   } catch {
      console.info('browser set to Chrome: triggered error')
   }

   // set variables to match elements on popup.html
   const htmlMsgBox = document.getElementById('userMsg')
   const orsSearch = document.getElementById('mORSnavigate')
   const launchButton = document.getElementById('launchButton')
   const helpButton = document.getElementById('helpButton')
   const exampleButton = document.getElementById('exampleButton')
   const cssDropDown = document.getElementById('cssSelector')
   const colorOptions = document.getElementById('colorOptions')
   const orLawDropDown = document.getElementById('OrLaws')
   const showBurntCheck = document.getElementById('showBurnt')
   const showSNsCheck = document.getElementById('showSNote')
   const showFWCheck = document.getElementById('showFullWidth')
   const collapseCheck = document.getElementById('collapseDefault')
   const showMenuCheck = document.getElementById('showMenu')
   const showNavCheck = document.getElementById('showNav')
   const versionID = document.getElementById('version')
   const theRoot = document.documentElement
   // then set up popup displays and functions
   try {
      updateCssPopup() // get CSS colors from current
      displayUserOptions() // display saved info
      addAllListeners() // set up logic for buttons, drop downs & checkboxes
   } catch (e) {
      warnPopup(e)
   }
}
main()
