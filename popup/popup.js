//popup.js
//Depends on ../popup/popAndOpHelper.js
//@ts-check

//helper functions
/**open new tab with URL */
const launchNewTab = (url) => {
   browser.tabs.create({'url': url})
}

/** Info message handling (Log to service worker inspection)
 * @param {string} infoTxt
 * @param {string} [calledBy]*/
const infoPopup = (infoTxt, calledBy = '??') => {
   let msg = new MessageDispatch({
      log : {doWarn: false, txt: infoTxt, aCaller: calledBy, script: 'popup.js', color: 'cyan'}
      })
   msg.sendOneWay()
}

/**  Warning message handling (Log to service worker inspection)
 * @param {string} warnTxt
 * @param {string} calledBy */
const warnPopup = (warnTxt, calledBy = '??') => {
   let msg = new MessageDispatch({
      log : {doWarn: true, txt: warnTxt, script: 'popup.js', aCaller: calledBy}
   })
   msg.sendOneWay()
}

//main functions
const popupMain = async () => {
   try {
      updateCssForPopup()
      displayExistingUserOptions()
      setNavForm()
      addListenerHelp()
      addListenerExample()
      addListenerOptions()
      addListenerCheckboxes()
   } catch (error) {
      warnPopup(error)
   }
}

/**retrieves user data preferences to style popup stylesheet */
const updateCssForPopup = async () => {
   let msg = new MessageDispatch({'miscTask': 'buildColorData'}) // calls /background/style.js
   const newCss = await msg.sendAwaitResponse()
   infoPopup(
      `Setting popup stylesheet properties:\n${JSON.stringify(newCss)}`,
      'updateCssPopup'
   )
   for (let key in newCss) {
      theRoot.style.setProperty(`--${key}`, newCss[key])
   }
}

const displayExistingUserOptions = async () => {
   try {
      await displayPaletteDropdownList()
      const storedData = await fetchAllStoredData()
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
   } catch (error) {
      warnPopup(error)
   }
}
const fetchAllStoredData = async () => {
   let msg = new MessageDispatch({'getStorage': [  // may want to rename some of these
      'lawsReaderStored',
      'cssSelectorStored',
      'showSNsStored',
      'doShowBurnt',
      'showFullWidth',
      'showMenuStored',
      'showNavStored',
      'collapseDefaultStored'
   ]})
   return await msg.sendAwaitResponse()
}

const setNavForm = () => {
   searchForm?.addEventListener('submit', () => {
      infoPopup(`Search ran for '${morsSearch.value}'`)
      searchOrs(morsSearch.value)
   })
}
const searchOrs = (search) => {
   let msg = new MessageDispatch({ navToOrs: search})
   msg.sendOneWay()
}

// User clicks "Help" button
const addListenerHelp = () => {
   helpButton?.addEventListener('click', () => {
      launchNewTab('https://github.com/mOrsExtension/mOrs/blob/master/mORSerror.md')
   })
}
const addListenerExample = () => {
   exampleButton?.addEventListener('click', () => {
      userMsg('No examples (yet)!', 'pink')
   })
}

const addListenerOptions = () => {
   colorOptionsButton?.addEventListener('click', () => {
      infoPopup('launching options.html', 'addAllListeners/colorOptions')
      launchNewTab(browser.runtime.getURL(`/options/options.html`))
   })
}

/** sends message in popup text field to user*/
const userMsg = (/**@type {string} */ msgText, /**@type {string} */ color = 'default') => {
htmlMsgBox.innerHTML = `<span style='color:${color}'>${msgText}</span>`
}
/** Setup all event listeners for form drop downs & buttons */

const addListenerCheckboxes = () => {
   cssDropDown?.addEventListener('change', () => {
      storeAndUpdateTabs(cssDropDown.value, 'cssSelectorStored', 'updateCss')
      updateCssForPopup()
   })
   orLawDropDown?.addEventListener('change', () => {
      storeAndUpdateTabs(orLawDropDown.value, 'lawsReaderStored', 'updateOrLawsReader')
   })
   showBurntCheck?.addEventListener('change', () => {
      storeAndUpdateTabs(showBurntCheck.checked, 'doShowBurnt', 'showBurnt')
   })
   showSNsCheck?.addEventListener('change', () => {
      storeAndUpdateTabs(showSNsCheck.checked, 'showSNsStored', 'showSourceNote' )
   })
   showFWCheck?.addEventListener('change', () => {
      storeAndUpdateTabs(showFWCheck.checked, 'showFullWidth', 'displayFullWidth')
   })
   collapseCheck?.addEventListener('change', () => {
      storeAndUpdateTabs(collapseCheck.checked, 'collapseDefaultStored', 'collapseAll')
   })
   showNavCheck?.addEventListener('change', async () => {
      storeAndUpdateTabs(showNavCheck.checked, 'showNavStored', 'showNav')
   })
   showMenuCheck?.addEventListener('change', async () => {
      storeAndUpdateTabs(showMenuCheck.checked, 'showMenuStored', 'showMenu')
   })
}

//Store changed value and update ORS tabs with update message
const storeAndUpdateTabs = async (newValue, storeTo, msgToTabs) => {
   try {
      if (newValue != null) {
         await promiseStoreKey({[storeTo]: newValue})
         let newMsg = new MessageDispatch({[msgToTabs]: newValue }, 'tabs')
         newMsg.sendOneWay()
      }
   } catch (error) {
      warnPopup(`error storing ${newValue} to ${storeTo}: ${error}`)
   }
}

/** Save user values to browser's user settings*/
const promiseStoreKey = async keyValueObj => {
   try {
      await browser.storage.sync.set(keyValueObj)
      infoPopup(
         `stored user data: ${JSON.stringify(keyValueObj)}`,
         'promiseStoreKey'
      )
      return true
   } catch (error) {
      warnPopup(error, 'setPromiseStoreKey')
   }
}

// Constant global variables for popup.js
// set variables to match elements on popup.html
const htmlMsgBox = document.getElementById('userMsg')
const searchForm = document.getElementById('navigate')
const morsSearch = document.getElementById('mORSnavigate')
const launchButton = document.getElementById('launchButton')
const helpButton = document.getElementById('helpButton')
const exampleButton = document.getElementById('exampleButton')
const cssDropDown = document.getElementById('cssSelector')
const colorOptionsButton = document.getElementById('colorOptions')
const orLawDropDown = document.getElementById('OrLaws')
const showBurntCheck = document.getElementById('showBurnt')
const showSNsCheck = document.getElementById('showSNote')
const showFWCheck = document.getElementById('showFullWidth')
const collapseCheck = document.getElementById('collapseDefault')
const showMenuCheck = document.getElementById('showMenu')
const showNavCheck = document.getElementById('showNav')
const versionID = document.getElementById('version')
const theRoot = document.documentElement

window.addEventListener('load', () => {
   console.log('popup running')
   popupMain()
})
