//createDivs.js
//@ts-check

/** called only from mORS.js (main script)
Creates divs for headings, note groups, sections, notes and forms */
const buildBodyDivs = (/**@type {HTMLDivElement}*/ bodyCopy) => {

   /**Disconnects everything after head>sub>temp>note>section>form (break is intentionally absenst)
   * @param {String} divType */
   const initVars = divType => {
      switch (divType) {  // intended to cascade downward (intentionally with no breaks)
         case 'head':
         currentHead = null
         case 'sub':
         currentSubHead = null
         case 'temp':
         currentTemp = null
         case 'note':
         currentNote = null
         case 'section':
         currentSec = null
         case 'form':
         currentForm = null
         default:
         break
      }
   }

   /**Creates a new div of specified type.
   * Inserts it into either a specified parent or aPara's parent (document.body).
   * Appends aPara to first elem of new div.
   * @param {HTMLElement} aPara
   * @param {String} divType - classList
   * @param {HTMLElement} parentDiv */
   const makeNewDiv = (aPara, divType, parentDiv = bodyCopy) => {
      let newDiv = document.createElement('div')
      newDiv.className = divType
      if (aPara != null && parentDiv != null && typeof parentDiv == 'object') {

            //if specified parent, append new div there
            changeDomList.push(() => {
               parentDiv.appendChild(newDiv) // append new div there
               newDiv.appendChild(aPara) // make this paragraph div's child
            })
            return newDiv

      } else {
         warnCS(
            `Paragraph: '${aPara?.classList}' & '${aPara.textContent?.slice(0, 50)}' for divType: ${divType} and ParentDiv: ${parentDiv}`,
            'createDivs.js',
            'makeNewDiv'
         )
      }
      return newDiv
   }

   /**adds current paragraph to existing div pushes to build list
   * @param {Element} aPara
   * @param {Element|null} useDiv */
   const addToDiv = (
      aPara,
      useDiv = inWhere([currentForm, currentSec, currentNote])
   ) => {
      /**make sure neither are falsy */
      if (aPara && useDiv) {
         changeDomList.push(() => {
            useDiv.appendChild(aPara)
         })
      }
   }

   //MAIN
   // global variables
   let currentNote = null
   let currentSec = null
   let currentHead = null
   let currentSubHead = null
   let currentTemp = null
   let currentForm = null
   let changeDomList = []

   /** takes list of parent, returns first one that exists */
   const inWhere = (/** @type {any[]} */ parentList) => {
      parentList.push(bodyCopy)
      let answer
      parentList.forEach(possibleParent => {
         if (possibleParent && !answer) {
            answer = possibleParent
         }
      })
      return answer
   }
   bodyCopy.querySelectorAll('p').forEach(aPara => {
      const paraHTML = aPara.innerHTML
      switch (aPara.className) {  // assign it to a div based on a its class
         case 'headingLabel': {
            /** headings in a form are not chapter headings */
            if (currentForm) {
               addToDiv(aPara, currentForm)
               break
            }
            initVars('head')
            currentHead = makeNewDiv(aPara, 'heading', bodyCopy) // made at chapter root
         } break

         case 'subheadLabel': {
            /** subheadings in a form are not chapter subheading */
            if (currentForm) {
               addToDiv(aPara, currentForm)
               break
            }
            initVars('sub')
            currentSubHead = makeNewDiv(aPara, 'subhead', currentHead) // must be a heading to nest sub within
         } break

         case 'tempHeadLabel': {
            initVars('temp')
            currentTemp = makeNewDiv(
               aPara,
               'tempProvisions',
               inWhere([currentSubHead, currentHead])
            )
         } break

         case 'startNote': {
            initVars('note') // close any open forms, sections or other notes
            currentNote = makeNewDiv(
               aPara,
               'note',
               inWhere([currentTemp, currentSubHead, currentHead])
            )
         } break

         case 'sectionStart': {
            initVars('section')
            const getType = () => {
               if (currentNote) { // if it is in a note div
                  let noteClass = ['noteSec']
                  if (/Sec\.\s\d{1,3}[a-f]?\./.test(aPara.textContent)) {
                     noteClass.push('sessionLaw')
                  }
                  if (/repeal[^]*user.s\sconvenience/.test(aPara.previousElementSibling?.textContent)) {
                     noteClass.push('futureRepeal')
                  }
                  if (/amendment[^]*become[^]*after[^]*\sconvenience/.test(
                     aPara.previousElementSibling?.textContent
                  )) {
                     noteClass.push('furtherAmend')
                  }
                  if (/amendment[^]*become[^]*until[^]*\sconvenience/.test(
                     aPara.previousElementSibling?.textContent
                  )) {
                     noteClass.push('priorAmend')
                  }
                  if (noteClass?.length > 1) {
                     return noteClass.join(' ')
                  }
                  initVars('note') // otherwise, close the note div (the section is ORS sec or burnt sec that's outside note)
               }
               if (aPara.nextSibling?.className == 'sourceNote') {
                  return 'burnt'
               }
               if (/span\sclass="leadline"/.test(paraHTML)) {
                  return 'ors'
               }
               warnCS(
                  `Section type not recognized for ${paraHTML.slice(0, 60)}`,
                  'createDivs.js',
                  'buildBodyDivs/SectionStart'
               )  // TODO #5 Need method for handling "that would become operative upon" language for 469.992 note section and 196.800, etc. notes.
            }
            currentSec = makeNewDiv(
               aPara,
               `section ${getType()}`,
               inWhere([currentNote, currentSubHead, currentHead])
            ) // and this section is a new ORS div (parented by main body)
         } break // "section"

            case 'startForm': {
               /** no reason this should be in an unclosed form, but just in case... */
               initVars('form')
               /** should always be the case that this is in a section (or a section in a note). Still checking.*/
               currentSec
               ? currentForm = makeNewDiv(aPara, 'form', currentSec)
               : warnCS(
                  `Something may be wrong with form div #${currentSec} starting with ${aPara.textContent.slice(0, 50)}...`,
                  'createDivs.js',
                  "buildBodyDivs:'start form'"
               )
            } break

            case 'endForm': {
               if (currentForm) { // this ought to be in a form, but just checking
                  initVars('form') // close out form
                  aPara.remove() //deleting this horizontal line entirely
                  break
               }
               warnCS(
                  `Found unexpected form ending after: '${aPara.previousSibling?.textContent.slice(0, 60)}'`,
                  'createDivs.js',
                  'buildBodyDivs'
               )
               addToDiv(
                  aPara,
                  inWhere([
                     currentSec,
                     currentNote,
                     currentTemp,
                     currentSubHead,
                     currentHead
                  ])
               ) // otherwise, maybe random '_____' just needs to be part of whatever sec its in
            } break

            case 'sourceNote': {
               addToDiv(aPara, currentSec)
               initVars('sec') // could be more notes within same "Note:"
            } break

            default: {
               addToDiv(
                  aPara,
                  inWhere([
                     currentForm,
                     currentSec,
                     currentNote,
                     currentTemp,
                     currentSubHead,
                     currentHead
                  ])
               )
            } break
         } // switch
      }) // bodyParts.forEach

      // execute list of changes to DOM
      changeDomList.forEach(domChange => {
         domChange()
      })

   // cleaning up forms
   const allFormDivs = bodyCopy.querySelectorAll('div.form')
   allFormDivs.forEach(aDiv => {
      const allParasInForm = aDiv.querySelectorAll('p')
      allParasInForm.forEach(aPara => {
         switch (aPara.className) {
            case 'startForm':
            aPara.remove()
            break
            case 'headingLabel':
            aPara.className = 'formHeading'
            break
            default:
            aPara.className =
            /^[^a-z]+$/.test(aPara.textContent) &&
            !/^_+$/.test(aPara.textContent)
            ? 'formHeading'
            : 'default'
         }
      })
   })

   //cleaning up notes:
   const allNoteDivs = bodyCopy.querySelectorAll('div.note')
   const month =
   '(?:January|February|March|April|May|June|July|August|September|October|November|December)'

   /**wraps text found by regular expression in an span and gives it a class; helper.js
   * @param {Node} searchedElem / full node to be replaced
   * @param {string|RegExp} searchText / entire expression to be wrapped
   * @param {string} spanClass / assigned class */
   const wrapDateInSpan = (searchedElem, searchText, spanClass) => {
      let searchFor = aRegExp(searchText)
      const elemNodes = searchedElem.childNodes
      let isDateTrue = false
      elemNodes.forEach(aNode => {
         if (aNode.nodeType === Node.TEXT_NODE) {
            const matchedText = Array.from(aNode.textContent.matchAll(searchFor))
            if (matchedText[0]) {
               const splitText = aNode.textContent.split(matchedText[0][0])
               const wrappedParts = splitText.reduce((acc, part, index) => {
                  if (index == 0) {
                     acc.push(document.createTextNode(part))
                     const newSpan = document.createElement('span')
                     newSpan.classList.add(spanClass)
                     let theDate = new Date(matchedText[0][1])
                     isDateTrue = !xOR(theDate > new Date(), spanClass == 'untilDate')
                     newSpan.classList.add(isDateTrue ? 'isTrue' : 'isFalse'),
                     newSpan.textContent = matchedText[0][0]
                     acc.push(newSpan)
                  } else {
                     acc.push(document.createTextNode(part))
                  }
                  return acc
               }, [])

               wrappedParts.forEach(part => {
                  searchedElem.appendChild(part)
                  searchedElem.insertBefore(part, aNode)
               })
               aNode.remove()
            }
         } else if (aNode.nodeType === Node.ELEMENT_NODE) {
            wrapDateInSpan(aNode, searchFor, spanClass)
         }
      })
      return isDateTrue
   }

   allNoteDivs.forEach(aDiv => {
      const allParasInDiv = aDiv.querySelectorAll('*')
      allParasInDiv.forEach(aPara => {
         if (aPara.classList.contains('startNote')) {
            aPara.className = 'formHeading'
            aPara.textContent = aPara.textContent.trim()
         }
         if (aPara.classList.contains('furtherAmend')) {
            const introPara = aPara.previousElementSibling
            const isDateTrue = wrapDateInSpan(
               introPara,
               `on\\sand\\safter\\s(${month}\\s\\d{1,2},\\s20\\d{2}),`,
               'afterDate'
            )
            aDiv.classList.add(isDateTrue ? 'isTrue' : 'isFalse')
         }
         if (aPara.classList.contains('priorAmend')) {
            const introPara = aPara.previousElementSibling
            const isDateTrue = wrapDateInSpan(
               introPara,
               `until\\s(${month}\\s\\d{1,2},\\s20\\d{2}),`,
               'untilDate'
            )
            aDiv.classList.add(isDateTrue ? 'isTrue' : 'isFalse')
         }
         if (aPara.classList.contains('futureRepeal')) {
            const introPara = aPara.previousElementSibling
            const isDateTrue = wrapDateInSpan(
               introPara,
               `until\\s(${month}\\s\\d{1,2},\\s20\\d{2}),`,
               'untilDate'
            )
            aDiv.classList.add(isDateTrue ? 'isTrue' : 'isFalse')
         }
      })
   })

   return bodyCopy
} //buildBodyDivs(aBody)
