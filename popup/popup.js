//popup.js
//@ts-check

//TODO #15 - move much of popup.js to background helpers, so don't duplicate in options and content.

class MessageDispatch {
   constructor(msg, sendTo='background') {
      this.sender = (sendTo=='tabs' ? 'toMORS' : 'message')  //TODO rename background sender?
      this.msg = msg
      if (msg != undefined) {
         this.stringyMsg = JSON.stringify(msg)
      }
   }

   async sendResponse (){
      infoCS(`Sending ${this.msg} to ${this.sender} and awaiting response.`, 'sendResponse')
      try {
         const response = await browser.runtime.sendMessage({[this.sender]: this.msg})
         if (response.response != null && response.response != undefined) {
            this.response = response.response
            this.stringyResponse = JSON.stringify(response.response)
            infoCS(`Response from ${this.sender}: ${this.stringyResponse}`, 'sendResponse')
            return response.response
         } else {
            throw new Error(`Response from ${this.sender} to ${this.msg} was unexpected value: '${JSON.stringify(response)}'`)
         }
      } catch (error) {
         if (!('log' in this.msg)) {
            warnCS(`Could not send and receive response: ${error}`, 'sendResponse')
         }
      }
   }

   sendOneWay () {
      infoCS(`Sending ${this.msg} to ${this.sender} (no response requested).`, 'sendResponse')
      try {
         browser.runtime.sendMessage({[this.sender]: this.msg})
      } catch (error) {
         warnCS(`Could not send message: ${error}`, 'sendResponse')
      }
   }
}

const main = async () => {
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

   // //TODO: #17 rebuild message handling class for popup.js (and maybe elsewhere)
   // /** Message passing to background.js (send message & resolves response)
   // * @param {string|object} requestMsg */
   // const let msg = new MessageDispatch = async requestMsg => {
   //    try {
   //       const response = await browser.runtime.sendMessage({message: requestMsg})
   //       return response.response
   //    } catch (error) {
   //       const requestString = (typeof requestMsg == "object" ? JSON.stringify(requestMsg) : requestMsg)
   //       /** if can't send things to background, then popupWarn is likely broken too */
   //       console.warn(`Failed: {message: ${requestString}} was NOT sent to background/msgReader.js`)
   //       console.warn(error)
   //    }
   // }


   /** Info message handling (Log to service worker inspection)
   * @param {string} infoTxt
   * @param {string} [calledBy]*/
   const infoPopup = (infoTxt, calledBy = '??') => {
      let msg = new MessageDispatch({
         log : {
            info: {
               txt: infoTxt,
               aCaller: calledBy,
               script: 'popup.js',
               color: 'cyan'
            }
         }
      })
      msg.sendOneWay()
   }

   /**  Warning message handling (Log to service worker inspection)
   * @param {string} warnTxt
   * @param {string} calledBy */
   const warnPopup = (warnTxt, calledBy = '??') => {
      let msg = new MessageDispatch({
         log :{
            warn: {
               script: 'popup.js',
               txt: warnTxt,
               aCaller: calledBy
            }
         }
      })
      msg.sendOneWay
   }

   // /** Send message to ORS tabs (no response requested).
   // * Receiving done by tabs through /content/addListeners.js
   // * @param {object} message*/
   // const let msg = new MessageDispatch = async message => {
   //    try {
   //       const orsTabs = await let msg = new MessageDispatch({miscTask: 'queryTabs'})
   //       for (const aTab of orsTabs) {
   //          browser.tabs.sendMessage(aTab.id, { toMORS: message })
   //          infoPopup(
   //             `Sent '${JSON.stringify(message)}' to tab #${aTab.id}`,
   //             'let msg = new MessageDispatch'
   //          )
   //       }
   //    } catch (e) {
   //       warnPopup(e, 'let msg = new MessageDispatch')
   //    }
   // }


   /**retrieves user data preferences to style popup stylesheet */
   const updateCssPopup = async () => {
      let msg = new MessageDispatch({miscTask: 'buildColorData'}) // calls /background/style.js
      const newCss = await msg.sendResponse()
      infoPopup(
         `Setting popup stylesheet properties:\n${JSON.stringify(newCss)}`,
         'updateCssPopup'
      )
      for (let key in newCss) {
         theRoot.style.setProperty(`--${key}`, newCss[key])
      }
   }

   /**Retrieves list of available options from background/webResources.js & puts it into popup */
   const displayPaletteDropdownList = async () => {
      let msg = new MessageDispatch({miscTask: 'getPaletteList'}) // pull in existing options in json, plus one "Custom"
      let colorOptionsList = await msg.sendResponse()
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
      }
   }

  /**TODO #19 this displayUserOptions mess has to have a better way to operate, especially in conjunction with updating background listener to accept objects with multiple commands (issue #1)*/

      const displayUserOptions = async () => {
      try {
         await displayPaletteDropdownList()
         const storedData = await fetchStoredData()
         showBurntCheck.checked = storedData.doShowBurnt
         showSNsCheck.checked = storedData.showSNsStored
         showFWCheck.checked = storedData.showFullWidth
         collapseCheck.checked = storedData.collapseDefaultStored
         showMenuCheck.checked = storedData.showMenuStored
         showNavCheck.checked = storedData.showNavStored
         for (let i = 0; i < cssDropDown.options.length; i++) {
            if (cssDropDown?.options[i].value == storedData.cssSelectorStored) {
               cssDropDown.selectedIndex = i
               break
            }
         }
         for (let i = 0; i < orLawDropDown.options.length; i++) {
            if (orLawDropDown?.options[i].value == storedData.lawsReaderStored) {
               orLawDropDown.selectedIndex = i
               break
            }
         }

         let manifest = browser.runtime.getManifest()
         versionID.innerHTML = `v.${manifest.version}`
      } catch (e) {
         warnPopup(e)
      }
   }
   const fetchStoredData = () => {
      return let msg = new MessageDispatch({getStorage: [  // may want to rename some of these
         'lawsReaderStored',
         'cssSelectorStored',
         'showSNsStored',
         'doShowBurnt',
         'showFullWidth',
         'showMenuStored',
         'showNavStored',
         'collapseDefaultStored'
      ]})
   }

   /**send message in popup text field to user
   * @param {String} msgText
   * @param {String} color */
   const userMsg = (msgText, color = 'default') => {
      htmlMsgBox.innerHTML = `<span style='color:${color}'>${msgText}</span>`
   }

   /** Setup all event listeners for form drop downs & buttons */
   const addAllListeners = () => {
      //User enters after filling out 'Navigate:' form box - // TODO: #22 fix submit functionality so enter will close and search as expected
      orsSearch?.addEventListener('submit', () => {
         infoPopup(`Search ran for '${orsSearch.value}'`)
         searchOrs(orsSearch.value)
      })
      // User clicks "Launch" button
      launchButton.addEventListener('click', () => {
         infoPopup(`Search ran for '${orsSearch.value}'`)
         searchOrs(orsSearch.value)
      })
      const searchOrs = (search) => {
         let msg = new MessageDispatch({ navToOrs: search})
         msg.sendOneWay()
      }

      const launchNewTab = (url) => {
         browser.tabs.create({'url': url})
      }
      // User clicks "Help" button
      helpButton?.addEventListener('click', () => {
         launchNewTab('https://github.com/mOrsExtension/mOrs/blob/master/mORSerror.md')
      })
      // User clicks "Example" button
      exampleButton?.addEventListener('click', () => {
         userMsg('No examples (yet)!', 'pink')
      })
      // User clicks "Set Custom Colors"
      colorOptions?.addEventListener('click', () => {
         infoPopup('launching options.html', 'addAllListeners/colorOptions')
         launchNewTab(browser.runtime.getURL(`/options/options.html`))
      })
      //User changes option on "Display Colors:"
      cssDropDown?.addEventListener('change', async () => {
         try {
            await promiseStoreKey({ cssSelectorStored: cssDropDown.value })
            let msg = new MessageDispatch({ updateCss: true }, 'tabs') // alert tabs of css changes
            msg.sendOneWay()
            updateCssPopup() // update colors on the current popup as well
         } catch (e) {
            warnPopup(`error storing css from dropdown: ${e}`)
         }
      })
      //User changes option on "Oregon Session Law Lookup Source"
      orLawDropDown?.addEventListener('change', async () => {
         try {
            await promiseStoreKey({ lawsReaderStored: orLawDropDown.value })
            let msg = new MessageDispatch({ updateOrLawsReader: orLawDropDown.value }, 'tabs')
            msg.sendOneWay()
         } catch (e) {
            warnPopup(`store lawReader dropdown: ${e}`)
         }
      })
      //User changes option on "Show repealed/renumbered sections"
      showBurntCheck?.addEventListener('change', async () => {
         try {
            await promiseStoreKey({ doShowBurnt: showBurntCheck.checked })
            let msg = new MessageDispatch({ showBurnt: showBurntCheck.checked }, 'tabs') // alert tabs to change burnt visibility
            msg.sendOneWay()
         } catch (e) {
            warnPopup('store burntCheck failed: ${e}')
            warnPopup(e)
         }
      })
      //User changes option on "Show section source notes"
      showSNsCheck?.addEventListener('change', async () => {
         try {
            await promiseStoreKey({ showSNsStored: showSNsCheck.checked })
            let msg = new MessageDispatch({ showSourceNote: showSNsCheck.checked }) // alert tabs to change source note visibility
            msg.sendOneWay()
         } catch (e) {
            warnPopup(`store source note check failed: ${e}`)
            warnPopup(e)
         }
      })
      //User changes option on "Full width display"
      showFWCheck?.addEventListener('change', async () => {
         try {
            await promiseStoreKey({ showFullWidth: showFWCheck.checked })
            let msg = new MessageDispatch({ displayFullWidth: showFWCheck.checked })
            msg.sendOneWay()
         } catch (e) {
            warnPopup(`full width check failed: ${e}`)
            warnPopup(e)
         }
      })
      //User changes option on "Collapse all ORS sections by default"
      collapseCheck?.addEventListener('change', async () => {
         try {
            await promiseStoreKey({ collapseDefaultStored: collapseCheck.checked })
            let msg = new MessageDispatch({ collapseAll: collapseCheck.checked }, 'tabs')
            msg.sendOneWay()
         } catch (e) {
            warnPopup(`store 'collapse by default' checkbox failed: ${e}`)
            warnPopup(e)
         }
      })
      //User changes option on "Show Navigation Button"
      showNavCheck?.addEventListener('change', async () => {
         try {
            await promiseStoreKey({ showNavStored: showNavCheck.checked })
            let msg = new MessageDispatch({ showNav: showNavCheck.checked }) // change visibility of menu
            msg.sendOneWay()
         } catch (e) {
            warnPopup(`store 'show Menu' checkbox failed: ${e}`)
         }
      })

      //User changes option on "Show Menu Button"
      showMenuCheck?.addEventListener('change', async () => {
         try {
            await promiseStoreKey({ showMenuStored: showMenuCheck.checked })
            let msg = new MessageDispatch({ showMenu: showMenuCheck.checked }) // change visibility of menu
            msg.sendOneWay()
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
