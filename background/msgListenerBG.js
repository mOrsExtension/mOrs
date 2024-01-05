//background/msgListener.js
//@ts-check

class MessageHandlerBG {
   constructor (message, sender) {
      if (message.message==null) {
         this.responseMsg = new Error ('Null message received by background.js listener.')
         this.isLog = true
      } else {
         this.receivedMsg = message.message
         this.isLog = ('log' in this.receivedMsg)
         if (!this.isLog) {
            this.fromName = sender.url.match(/[^\/]*\.html/)
            this.stringyMsg = JSON.stringify(message).slice(0,60)
         }
      }
   }

   async doTasksAndFetchResponse() {
      this.responseMsg = (
         ('getStorage' in this.receivedMsg)
         ? await this.getFromStorage()   // returns object(s)
         : ('fetchJson' in this.receivedMsg)
         ? await this.fetchJson() // returns jsonItem
         : ('buildOrLawLink' in this.receivedMsg)
         ? await this.buildOrLawLink()  // returns link
         : ('getChapInfo' in this.receivedMsg)
         ? await this.getChapInfo()  // returns obj(vol, title, chp)
         : ('miscTask' in this.receivedMsg)
         ? await this.miscTasks()  // returns any
         : ('newOrsTabs' in this.receivedMsg)
         ? this.newOrsTabs()  // returns true (launches new tabs)
         : ('log' in this.receivedMsg)
         ? this.logMessage()   // returns true (displays message on background service worker)
         : new Error (`message type not identified for request:/n${this.stringyMsg}`)
      )
      try {
         if (this.responseMsg !=null) {
            this.stringyResponse = JSON.stringify(this.responseMsg).slice(0,60)
            return true
         }
         return false
      } catch {
         return false
      }
   }

   async getFromStorage() {
      let get = this.receivedMsg.getStorage
      let ansObj = {}

      if (Array.isArray(get)) {
         let /** @type {Promise[]} */ promiseList = []
         get.forEach(async (item) => {
            promiseList.push(this.getItemFromStorage(item))
         })
         let storageList = await Promise.all(promiseList)
         get.forEach((item, index) => {
            ansObj[item] = storageList[index]
         })
      } else {
         ansObj[get] = await this.getItemFromStorage(get)
      }
      return ansObj
   }
   async getItemFromStorage(getItem) {
      return await promiseGetFromStorage(getItem)
   }

   async miscTasks() {
      let task = this.receivedMsg.miscTask
      return (
         (task == 'getOrsTabIds')
         ? await getTabIdsFromTabQuery({url: '*://www.oregonlegislature.gov/bills_laws/ors/ors*.html*'})
         : (task == 'buildColorData' )
         ? await promiseGenerateCss() // styles.js returns object (list of user prefs)
         : (task == 'getPaletteList')
         ? await promiseGetPalletteList() // webResources.js returns object
         : new Error ('unidentified misc task requested')
      )
   }

   logMessage() {
      let log = this.receivedMsg.log
      if (log.doWarn) {
         warnBG(log.txt, log.script, log.aCaller, log.color) // helperBG.js
      } else if (log.doWarn==false) {
         infoBG(log.txt, log.script, log.aCaller, log.color) // helperBG.js
      } else {
         return new Error('unidentified log message requested')
      }
      return true // ought to be unnecessary, but otherwise may time out waiting for response
   }

   async fetchJson() {
      return await promiseReadJsonFile(`${this.receivedMsg.fetchJson}.json`)  // webResources.js - just returns json file as JS object
   }

   async buildOrLawLink () {
      let oL = this.receivedMsg.buildOrLawLink
      return await promiseGetOrLegUrl(oL.year, oL.chap, oL.reader)  // buildOrLaws.js TODO - does this still work with short sessions or does it need extended?
   }

   async getChapInfo() {
      // retrieve volume, title and chapter/title names from json file
      return await promiseGetChapterInfo(this.receivedMsg.getChapInfo)
   }

   newOrsTabs () {
      buildAndNavigateToUrls(this.receivedMsg.navToOrs)   //navigate.js
      return true
   }
}


/** receives messages from popup.js, options.js & content scripts (/content/*.js) */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
   (async ()=> {
      let response = await handleMessage(message, sender)
      sendResponse(response)      // still does not support async; callback wrapper required
   })()
   return true    // also required to keep port open
})

const handleMessage = async (message, sender) => {
   let newMsg = new MessageHandlerBG(message, sender)
   if (newMsg.receivedMsg == null || newMsg.receivedMsg == undefined) {
      return
   }
   if (!newMsg.isLog) {  // don't want a create duplicate log messages
      infoBG(`Background received from '${newMsg.fromName}' request '${newMsg.stringyMsg}'`, 'msgListenerBG.js', 'handleMessage', "#fb8")
   }
   try {
      if (await newMsg.doTasksAndFetchResponse()) {
         if(!newMsg.isLog) {
            infoBG(`Responding to request with '${newMsg.stringyResponse}'`, 'msgListenerBG.js', 'handleMessage', "#fb8")
         }
         return ({'response' : newMsg.responseMsg})
      } else {
         let error = new Error ('Completing task and fetching response failed on handleMessage()')
         warnCS(error.message, 'msgListenerBG.js', 'handleMessage')
         return error
      }
   } catch (error) {
      warnBG(error, 'msgListenerBG.js', 'handleMessage')
      return error
   }
}
