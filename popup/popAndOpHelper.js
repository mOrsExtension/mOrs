let browser
try {
   browser = chrome
} catch {
   console.info('Setting browser to Chrome triggered error')
}

class MessageDispatch {
   constructor(msg, sendTo = 'background') {
      this.sendTo = (sendTo == 'tabs') ? 'toMORS' : 'message'
      this.msg = {[this.sendTo]: msg}
      this.logThis = true
      if (typeof(msg) == 'object') {
         this.logThis = !('log' in msg)
         this.stringyMsg = `${JSON.stringify(msg)} ==> '${sendTo}'`
      }
      this.response = ''
   }

   async sendAwaitResponse () {
      if (this.logThis) {
            infoPopup(`Sending ${this.stringyMsg} and awaiting response.`, 'sendResponse')
         }
      try {
         let msgResponse = await this.sendCallback()
         if (msgResponse.response != null && msgResponse.response != undefined) {
            this.response = msgResponse.response
         }
         this.stringyResponse = JSON.stringify(this.response)
         if (this.logThis) {
            infoPopup(`Response: ${this.stringyResponse}`, 'sendResponse')
         } else {
            throw new Error(`Response from message '${this.stringyMsg}' was unexpected value: '${this.response}'`)
         }
      } catch (error) {
         if (this.logThis) {
            warnPopup(`Could not send and receive response: ${error}`, 'sendResponse')
         } else {
            console.warn(error)
         }
      }
      return this.response
   }

   async sendCallback() {
      return await browser.runtime.sendMessage(this.msg)
   }

   sendOneWay () {
      if (this.sendTo == 'toMORS') {
         this.sendToMors()
      } else {
         this.sendToBackground()
      }
      if (this.logThis) {
         infoPopup(`Sent ${this.stringyMsg} (no response requested).`, 'sendResponse')
      }
   }

   sendToBackground() {
      try {
         browser.runtime.sendMessage(this.msg)
      } catch (error) {
         if (this.logThis) {
            warnPopup(`Could not send message: ${error}`, 'sendResponse')
         }
      }
   }

   async sendToMors() {
      let orsTabIdList = []
      try {
         let getTabsList = new MessageDispatch({miscTask: 'getOrsTabIds'}, 'background')
         orsTabIdList = await getTabsList.sendAwaitResponse()
      } catch (error) {
         warnPopup (`Error retrieving ORS tabs: ${error}`), 'sendToMors'
      }
      try {
         orsTabIdList.forEach(tabId => {
            browser.tabs.sendMessage(tabId, this.msg)
         })
      } catch (error) {
         warnPopup(`Could not send message: ${error}`, 'sendResponse')
      }
   }

   logIfNotRecursive (msg, scriptName, warn = false) {
      let log = {}
      let msg = new MessageDispatch({
         log: {
            info: {
               txt: infoMsg,
               script: 'options.js',
               aCaller: functionName,
               color: '#db8' //pinkish
            }
         }
      })
      msg.sendOneWay()
   }

   }
}

/**Retrieves list of available options from background/webResources.js & puts it into dropdown menu */
const displayPaletteDropdownList = async () => {
   let msg = new MessageDispatch({'miscTask': 'getPaletteList'}) // pull in existing options in json, plus "Custom"
   let colorOptionsList = await msg.sendAwaitResponse()
   try {
      cssDropDown.options = [] // not cssDropDown.options = []? But if it ain't broke...
      colorOptionsList.forEach(colorOption => {
         const selectOption = document.createElement("option")
         selectOption.value = colorOption
         selectOption.textContent = colorOption
         cssDropDown?.appendChild(selectOption)
      })
   } catch (error) {
      warnPopup(`Error displaying css options: ${error}`, 'promiseRefreshOptions')
   }
}
