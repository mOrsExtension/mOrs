//background/msgListener.js
//@ts-check
/** receives messages from popup.js, options.js & content scripts (/content/*.js) */

browser.runtime.onMessage.addListener((message, sender, response) => {
   const received = message.message
   let senderName = sender.url.match(/[^\/]*\.html/)
   if (received==null) {throw new Error ('Null message received by background.js listener.')}
   if (typeof received == 'string') {
      infoBG(
         `Background listener received from ${senderName}: ${received}`,
         'msgReceived.js',
         'addListener',
         '#faf'
      )
      //TODO: #1 Set up receiver to get & return multiple requests from single request object, rather than using case.
      switch (received) {
         case 'getOrLaw':
         msgHandler(promiseGetFromStorage('lawsReaderStored'), response) // userStorage.js - returns string
         break

         case 'getCssUserOption':
         msgHandler(promiseGetFromStorage('cssSelectorStored'), response) // userStorage.js - returns string
         break

         case 'getShowSNs':
         msgHandler(promiseGetFromStorage('showSNsStored'), response) //userStorage.js - returns boolean
         break

         case 'getShowBurnt':
         msgHandler(promiseGetFromStorage('showBurntStored'), response) //userStorage.js - returns boolean
         break

         case 'getFullWidth':
         msgHandler(promiseGetFromStorage('showFullWidth'), response) //userStorage.js - returns boolean
         break

         case 'getShowMenu':
         msgHandler(promiseGetFromStorage('showMenuStored'), response) //userStorage.js - returns boolean
         break

         case 'getShowNavigation':
         msgHandler(promiseGetFromStorage('showNavStored'), response) //userStorage.js - returns boolean
         break

         case 'getCollapsed':
         msgHandler(promiseGetFromStorage('collapseDefaultStored'), response) //userStorage.js - returns boolean
         break

         case 'getOrsTabs': // returns list of tabs matching pattern
         msgHandler(
            promiseQueryToTabs({url: '*://www.oregonlegislature.gov/bills_laws/ors/ors*.html*'}),
            response
         )
         break

         case 'getBrowserStoredColorData':
         msgHandler(promiseGenerateCss(), response) // styles.js returns object (list of user prefs)
         break

         case 'getPaletteList':
         msgHandler(promiseGetPalletteList(), response) // webResources.js returns object
         break

         default: // error - string didn't correspond to valid command
         warnBG(
            `Received string message: '${received}' is invalid; no response sent.`,
            'msgReceived.js',
            'addListener'
         )
         break
      }
   // non string objects...
   } else if (received.info) {
      //info message for display on background service worker
      const infoMsg = received.info
      infoBG(infoMsg.txt, infoMsg.script, infoMsg.aCaller, infoMsg.color) // helperBG.js
      response(true) // ought to be unnecessary, but otherwise times out waiting for response
   } else if (received.warn) {
      // error message background service worker
      const warnMsg = received.warn
      warnBG(warnMsg.txt, warnMsg.script, warnMsg.aCaller, 'yellow') // helperBG.js
      response(true)
   } else {
      const stringMsg = JSON.stringify(received)
      infoBG(
         `Background listener received from ${senderName}: ${stringMsg}`,
         'msgReceived.js',
         'addListener',
         '#faf'
      )
      if (received.getJson) {
         msgHandler(promiseReadJsonFile(`${received.getJson}.json`), response) // webResources.js - just returns json file as object
      }
      else if (received.orLawObj) {
         msgHandler(
            promiseGetOrLegUrl(
               received.orLawObj.year,
               received.orLawObj.chap,
               received.orLawObj.reader
            ),
            response
         ) // orlaws.js
      } else if (received.chapInfo) {
         // retrieve volume, title and chapter/title names from json file
         msgHandler(promiseGetChapterInfo(received['chapInfo']), response) // webResources.js
      } else if (received.navToOrs) {
         // from popup.js link creation
         msgHandler(parseUrls(sanitize(received['navToOrs'])), response) // omniBox.js
      } else {
         warnBG(`Unidentifiable message received ${stringMsg}`, 'msgReceived.js', 'addListener callback')
      }
   }
   return true // not sure what this means, but background listener closes before response if it's not included
})

/** Takes in message and returns object resolving promise {response: resolved} or handles errors
* @param {Promise<any>} soughtPromise
* @param {(arg0: {response: any;}) => void} response */
const msgHandler = async (soughtPromise, response) => {
   try {
      const resolvedPromise = await soughtPromise
      response({ response: resolvedPromise })
   } catch (e) {
      warnBG(
         `Error thrown while processing promise:' ${e}`,
         'msgReceived.js',
         'msgHandler'
      )
      response({ response: `Error: ${e}` })
   }
}
