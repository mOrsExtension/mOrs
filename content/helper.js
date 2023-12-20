//helper.js
//@ts-check

let browser
try {
   browser = chrome
} catch (error) {
   console.warn(`Assignment of chrome to browser failed:'${error}'`) // using warn rather than warnCS, because browser isn't registering right
}

//TODO #7 make message send the response, rather than requiring extraction of response from object
//TODO #8 build a separate version of content message sender for when awaiting a response is unnecessary
/** Send message to background worker (msgreceived.js) and await response;
* helpChrome.js
* @param {any} messageItem*/
const sendAwaitResponse = messageItem => {
   if (typeof messageItem == 'string') {
      console.info(`Sent string to background scripts: '${messageItem}'`) // tells CS console that string message was delivered
   } else {
      if (
         Object.keys(messageItem)[0] != 'info' &&
         Object.keys(messageItem)[0] != 'warn'
      ) {
         console.info(
         `Sent object to background scripts: ${JSON.stringify(messageItem)}'`
         ) // tell CS console that non-string message was delivered
      }
   }
   // ***** NOTE *****
   // chrome.runtime.sendMessage does not support promises, needs resolved through callback in new promise // TODO #6 is this still true?
   return new Promise((resolve, reject) => {
      try {
         browser.runtime.sendMessage({ message: messageItem }, response => {
            resolve (response)
         })
      } catch (error) {
         if (!messageItem.warnTxt) {
            // avoiding potential looping error message if error message is responsible for warning
            const msgString = typeof messageItem == 'string'?
             messageItem :
             JSON.stringify(messageItem)
            warnCS(
               `Error sending message ${msgString} ${error}`,
               'helpChrome.js',
               'sendAwaitResponse'
            )
            reject (error)
         }
      }
   })
}

//Global variables (all content scripts):
const aTab = '(?:&nbsp;|\\s){0,8}' //regExp for a tab/blank space, used occasionally // TODO #9 move this to first clean or separate module, rather than global variable kludge.
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


/**takes in an element, search RegEx on its innerHTML if there's a match, change element class
* @param {any} anElem
* @param {string | RegExp} searchFor
* @param {string} newClass
*/
const reclassElementByHTML = (anElem, searchFor, newClass) => {
   if (aRegExp(searchFor, '').test(anElem.innerHTML)) {
      anElem.className = newClass
   }
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

const makeVisible = (querySelection, isVisible) => {
   document.querySelectorAll(querySelection).forEach(anElement => {
      isVisible
      ? anElement.classList.remove('invisibility')
      : anElement.classList.add('invisibility')
   })
}

/** Sets display of burnt (repealed/renumbered) sections when changed in popup or startup
* @param {boolean} doShow */
const doShowBurnt = doShow => {
   makeVisible('div.section.burnt', doShow)
}

const doShowMenu = doShow => {
   makeVisible('div#floatMenu', doShow)
}

const doShowNav = doShow => {
   makeVisible('div#volumeOutline', doShow)
}

/** Displays source notes on startup & changed in popup
* @param {boolean} doShow */
const doShowSourceNotes = doShow => {
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
   sendAwaitResponse({
      info: {
         txt: infoMsg,
         script: scriptFileName,
         aCaller: functionName,
         color: color
      }
   })
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
   sendAwaitResponse({
      warn: {
         txt: warnMsg,
         script: scriptFileName,
         aCaller: functionName,
         color: 'yellow'
      }
   })
}

/** expands single ORS section (when clicking on ORS button, e.g.)
* @param {Element} collapseElem  */
const expandSingle = collapseElem => {
   if (collapseElem && collapseElem.classList.contains('section')) {
      collapseElem.children[1].classList.remove('invisibility')
   } else {
      warnCS(
         `Target ${collapseElem.textContent?.slice(0, 60)} is not a section`,
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