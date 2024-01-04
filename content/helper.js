//helper.js
//@ts-check

let browser
try {
   browser = chrome
} catch (error) {
   console.warn(`Assignment of chrome to browser failed:'${error}'`) // using warn rather than warnCS, because browser isn't registering right
}

const deliverToBackground = async (messageItem, doAwaitResponse = true)  => {
   let msg = new MessageSenderCS(messageItem, doAwaitResponse)
   if (await msg.sendMessage() == "success") {
      return doAwaitResponse ? msg.respond() : true
   }
}

class MessageSenderCS {
   constructor (message, doRespond) {
      this.message = message
      this.doRespond = doRespond
      this.msgStringy = JSON.stringify(this.message)
      this.isLog = (typeof this.message == 'object' && 'log' in this.message)
   }

   async sendMessage () {
      if (!this.isLog) {
         console.info(`Sending to background scripts: ${this.msgStringy}'`)
      }
      this.doRespond
       ? await this.sendAwait()
       : this.sendOneWay()
      return 'success'
   }
   async sendAwait() {
      try {
         let response = await browser.runtime.sendMessage({ message: this.message })
         if ('response' in response) {
            this.response = response.response
         } else {
            console.warn(`Error, response received was ${JSON.stringify(response)}`)
         }
      } catch (error) {
         if (!this.isLog) {
            warnCS(`Error sending '${this.msgStringy}': ${error}`, 'helper.js', 'sendAwait')
         }
      }
   }

   sendOneWay() {
      browser.runtime.sendMessage({ message: this.message })
   }


   respond () {
      return this.response
   }
}

//Global variables (all content scripts):
let thisChapNum // found in heading.js // TODO #10 make this part of heading object

/**Converts a [string|RegExp, flags] to /RegExp/flags; helper.js
* @param {string|RegExp} searchFor
* @param {string} flags // defaults to "g" */
const aRegExp = (searchFor = '', flags = 'g') => {
   if (typeof searchFor == 'string') {
      return new RegExp(searchFor, flags)
   } else {
      return new RegExp(searchFor.source, flags)
   }
}

/**Returns string to replace searchFor in oldText with replaceString; helper.js
* @param {string} oldText
* @param {string|RegExp} searchFor
* @param {string} replaceString */
const replacer = (
   oldText,
   searchFor,
   replaceString,
   flags = 'g',
   doLog = false
) => {
   const searchRegExp = aRegExp(searchFor, flags)
   if (doLog) {
      infoCS(searchRegExp.toString(), 'replacer')
      infoCS(`  => '${replaceString}'`, 'replacer')
   }
   return oldText.replace(searchRegExp, replaceString)
}

/** Searches for 'searchFor' in the 'initialText' and returns 'searchNum'th place result where result is matchPos from RegExp for multiple regEx groups.
* Example 'ifRegExMatch(/(a)(\d)/, "a3 a9 ad a2 a8", 2, 1) => '2' (second parentheses of 2nd (counting from 0) 'a#')
* Default, returns first
* @param {string | RegExp} searchFor,
* @param {string} initialText
* @param {number} resultNum
* @param {number} groupNum
* helper.js */
const ifRegExMatch = (searchFor, initialText, resultNum = 0, groupNum = 0) => {
   const thisRegExp = aRegExp(searchFor, resultNum != 0 ? 'g' : '')
   if (thisRegExp.test(initialText)) {
      //first make sure there's at least one result
      if (resultNum == 0 || groupNum == 0) {
         const myIndex = resultNum > groupNum ? resultNum : groupNum //greater of index or matchPos
         const resultsList = initialText.match(thisRegExp) // TODO: #11 Revisit and make work better as Reg Exp class handler using matchAll, etc.
         if (resultsList && resultsList.length > resultNum) {
            const ans = resultsList[myIndex]
            infoCS(
               `Search for ${searchFor} at ${resultNum}:${groupNum} returned ${ans.slice(0, 150)}`,
               'helper.js',
               'ifRegExMatch'
            )
            return ans
         }

         return ''
      }
      const myMatches = initialText.matchAll(thisRegExp)
      const matchList = Array.from(myMatches) //creates array of result arrays of each group
      const ans = matchList[resultNum][groupNum]
      infoCS(
         `Search for ${searchFor} at ${resultNum}:${groupNum} returned ${ans.slice(0, 60)}`,
         'helper.js',
         'ifRegExMatch'
      )
      return ans
   }
   infoCS(
      `Search for ${searchFor} at ${resultNum}:${groupNum} returned NO matches`,
      'helper.js',
      'ifRegExMatch'
   )
   return ''
}

/** logical xor (only a or b, but not both)
* @param {boolean} x
* @param {boolean} y */
const xOR = (x, y) => {
   return (x || y) && !(x && y)
}

// SET INITIAL/CHANGED VARIABLES
//set full Width status to document & on menu button, if any
const setFullWidth = isFull => {
   document.documentElement.style.setProperty(
      '--SectionWidth',
      isFull ? '100%' : '85ch'
   )
   const fwButtonLabel = document.getElementById('fullWidth')
   if (fwButtonLabel) {
      fwButtonLabel.textContent = isFull ? 'Reading Mode' : 'Full Width'
   }
}
/** toggle Full Width of ORS display from 85ch to 100% */
const toggleFullWidth = () => {
   setFullWidth(document.documentElement.style.getPropertyValue('--SectionWidth') == '85ch')
}

/** Sets display of quert selection when changed in popup or startup*/
const makeVisible = (querySelection, isVisible) => {
   document.querySelectorAll(querySelection).forEach(anElement => {
      isVisible
      ? anElement.classList.remove('invisibility')
      : anElement.classList.add('invisibility')
   })
}
const showBurnt = doShow => {
   makeVisible('div.section.burnt', doShow)
}
const showMenu = doShow => {
   makeVisible('div#floatMenu', doShow)
}
const showVolumeOutline = doShow => {
   makeVisible('div#volumeOutline', doShow)
}
const showSourceNotes = doShow => {
   makeVisible('p.sourceNote', doShow)
}

/** Sends "information" message to console;
* viewable only in "inspect service worker"
* content/helper.js
* @param {string} infoMsg
* @param {string} scriptFileName
* @param {string} functionName
* @param {string} color */
const infoCS = (
   infoMsg,
   scriptFileName = 'helper.js',
   functionName = '',
   color = 'pink'
) => {
   if (functionName == '') {
      try {
         functionName = infoCS.caller.name
      } catch {
         functionName = '??'
      }
   }
   deliverToBackground({
      log : {
         info: {
            txt: infoMsg,
            script: scriptFileName,
            aCaller: functionName,
            color: color
         }
      },
   }, false)
}

/**Sends "warning" message to console;
* viewable in "inspect service worker" & content script's log
* content/helper.js
* @param {string} warnMsg
* @param {string} scriptFileName
* @param {string} functionName*/
const warnCS = (warnMsg, scriptFileName = 'helper.js', functionName = '') => {
   if (functionName == '') {
      try {
         functionName = warnCS.caller.name
      } catch {
         functionName = '??'
      }
   }
   console.warn(`${scriptFileName} - ${functionName}: ${warnMsg}`)
   deliverToBackground({
      log: {
         warn: {
            txt: warnMsg,
            script: scriptFileName,
            aCaller: functionName,
            color: 'yellow'
         }
      }
   }, false)
}

/** expands single ORS section (internal links or pincite link in url)
* @param {Element} expandedElem  */
const expandSingle = expandedElem => {
   if (expandedElem && expandedElem.classList.contains('section')) {
      expandedElem.children[1].classList.remove('invisibility')
   } else {
      warnCS(
         `Target '${expandedElem.textContent?.slice(0, 60)}' is '${expandedElem.classList}' & not a section`,
         'helper.js',
         'expandSingle'
      )
   }
}

/**  Collapses (actually, makes invisible now) all ORS sections  */
const collapseAllSections = () => {
   document.querySelectorAll('div.collapsible').forEach(collapsible => {
      collapsible.classList.add('invisibility')
   })
}

/**  Makes visible all ORS sections */
const expandAllSections = () => {
   document.querySelectorAll('div.collapsible').forEach(collapsible => {
      collapsible.classList.remove('invisibility')
   })
}