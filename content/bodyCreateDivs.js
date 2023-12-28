//createDivs.js
//@ts-check

class GenericDiv {
   constructor (/**@type {HTMLParagraphElement} */ firstElement, classList) {
      this.classList = [].concat(classList)
      this.Div = this.constructNewDiv(firstElement)
   }
   constructNewDiv (elem) {
      let newDiv = document.createElement('div')
      newDiv.className = this.classList.join(' ')
      newDiv.appendChild(elem)
      return newDiv
   }

   addParagraph (paragraph) {
      this.Div.appendChild(paragraph)
   }

   addChild (/**@type {HTMLParagraphElement}*/ childParagraph, /**@type {string | string[]} */  classList) {
      let newChild = new GenericDiv(childParagraph, classList, this)
      this.Div.appendChild(newChild.Div)
      return newChild
   }
}

class ParaClassAndParentIdentifier {
   constructor (className) {
      // placeholders
      this.parent = parents.active.body
      this.buildClass = 'none'
      this.buildType = 'none'
      this.sortClass(className)
   }

   sortClass(className) {
      switch(className) {
         case 'headingLabel': {
            if (parents.active.form == null) {
               this.build('head', 'body', 'heading')
            } else {
               this.genericPara()
            }
         } break
         case 'subheadLabel': {
            if (parents.active.form == null) {
               this.build('sub', 'head', 'subhead')
            } else {
               this.genericPara()
            }
         } break
         case 'tempHeadLabel': {
            this.build('temp', 'sub', 'tempProvision')
         } break
         case 'startNote': {
            this.build('note', 'temp', 'note')
         } break
         case 'startForm': {
            this.build('form', 'sec', 'form')
         } break
         case 'sectionStart': {
            this.build('sec', 'note', 'section')
         } break
         default: {
            this.genericPara()
         } break
      }
   }

   build(close, parent, build) {
      parents.closeParents(close)
      this.buildType = close
      this.parent = parents.getExistingParentElement(parent)
      this.buildClass = build
   }

   genericPara() {
      this.parent = parents.getExistingParentElement('form')
   }
}

class SectionClassifier {
   constructor (
      /**@type {HTMLParagraphElement}*/ aPara,
      /**@type {GenericDiv}*/ purportedParent
   ) {
      this.paraElem = aPara
      this.paraParent = purportedParent
      this.addClassList = this.getAddClasses()
   }

   getAddClasses() {
      if (this.paraParent.classList.includes('note')) {
         let noteClasses = this.noteClasses()
         if (noteClasses.length > 1) {
            return noteClasses
         }
         parents.closeParents('temp') // or, it's not a child of note, but after the note. So, close note
         this.paraParent = parents.getExistingParentElement('sub') // and look for other potential parents
      }
      if (this.isBurnt()) {
         return ['burnt']
      }
      if (this.isOrs()) {
         return ['ors']
      }
      return ['undefined']
   }

   noteClasses () {
      let prevSibText = this.paraElem?.previousElementSibling?.textContent || ''
      let paraText = this.paraElem?.textContent || ''
      let noteClass = ''
      if (/Sec\.\s\d{1,3}\w?\./.test(paraText)) {
         noteClass = 'sessionLaw'
      } else if (/repeal[^]*user.s\sconvenience/.test(prevSibText)) {
         noteClass = 'futureRepeal'
      } else if (/amendment[^]*become[^]*after[^]*\sconvenience/.test(prevSibText) ||
         (/amendment[^]*would become[^]*\sconvenience/.test(prevSibText))) {
         noteClass = 'furtherAmend'
      } else if (/amendment[^]*become[^]*until[^]*\sconvenience/.test(prevSibText)) {
         noteClass = 'priorAmend'
      }
      if (noteClass != '') {  // if so, add classes to sec
         return [noteClass, 'noteSec']
      }
      return []
   }

   isBurnt() {
      let nextSibClass = this.paraElem?.nextElementSibling?.className || ''
      // if the very next paragraph is source note, this section is repealed/renumbered
      return (nextSibClass == 'sourceNote')
   }

   isOrs () {
      let paraHtml = this.paraElem?.innerHTML || ''
      return (/span\sclass="leadline"/.test(paraHtml))
   }
}

// global variables
// initializing object for holding which parent of certain children class is active
const bodyDiv = document.createElement('p') // empty paragraph deleted a few lines later
let newMainBodyDiv = new GenericDiv(bodyDiv, '')
newMainBodyDiv.Div.id = 'main'
newMainBodyDiv.Div.innerHTML = ''
let parents = {active: {
      body:newMainBodyDiv,
      head:null,
      sub:null,
      temp:null,
      note:null,
      sec:null,
      form:null
   },
   list: ['body', 'head', 'sub', 'temp', 'note', 'sec', 'form'],
   /**removes named parent it's potential children from active list; they're done having children */
   closeParents (startWith) {
      this.list.slice(this.list.indexOf(startWith)).forEach(parent => {
         this.active[parent] = null
      })
   },
   /** Cycles backwards thru potential parents to return first existing or main body */
   getExistingParentElement (startWith) {
      let answer = this.active.body
      let revList =  this.list.slice().reverse()
      revList.slice(revList.indexOf(startWith)).every(possibleParent => {
         if (this.active[possibleParent] != null && answer==this.active.body) {
            answer = this.active[possibleParent]
            console.log(`found ${possibleParent} = ${this.active[possibleParent]}`)
            return false
         }
         console.log(`no ${possibleParent}`)
         return true
      })
      return answer
   }
}


/** called only from mORS.js (main script)
Creates divs for headings, note groups, sections, notes and forms */
const buildBodyDivs = (/**@type {HTMLDivElement}*/ bodyCopy) => {
   bodyCopy.querySelectorAll('p').forEach(pElem => {
      let aPara = {}
      let paraID = new ParaClassAndParentIdentifier(pElem.className)
      /**@type {GenericDiv} */ aPara.parent = paraID.parent
      /**@type {Array} */ aPara.buildClass = [paraID.buildClass]
      /**@type {String} */ aPara.buildType = paraID.buildType
      if (aPara.buildType == 'none') {
         aPara.parent.addParagraph(pElem)  // put generic paragraph into parent
         return
      }
      if (aPara.buildType == 'sec') {
         const secType = new SectionClassifier(pElem, aPara.parent)
         aPara.parent = secType.paraParent
         aPara.buildClass = aPara.buildClass.concat(secType.addClassList)
      }
      console.log(aPara.parent.classList)
      let newDiv = aPara.parent.addChild(pElem, aPara.buildClass)
      parents.active[aPara.buildType] = newDiv
      if (pElem.classList.contains('endForm')) {
         parents.closeParents('form') // whatever comes after the end line of a form doesn't belong in form
      }
      if (pElem.classList.contains('sourceNote'))
         parents.closeParents('sec') // whatever comes after source notes doesn't belong in its section
   })
   return CleanUpTemp(newMainBodyDiv.Div)
}

   //    /**adds current paragraph to existing div; pushes to build list
   // * @param {Element} aPara
   // * @param {Element|null} useDiv */
   //    const addToDiv = (
   //       aPara,
   //       useDiv = getParentElement([currentForm, currentSec, currentNote])
   //    ) => {
   //       /**make sure neither are falsy */
   //       if (aPara && useDiv) {
   //          changeDomList.push(() => {
   //             useDiv.appendChild(aPara)
   //          })
   //       }
   //    }

   // /**Creates a new div of specified type.
   // * Inserts it into either a specified parent or aPara's parent (document.body).
   // * Appends aPara to first elem of new div.
   // * @param {HTMLElement} aPara
   // * @param {String} divType - classList
   // * @param {HTMLElement} parentDiv */
   // const makeNewDiv = (aPara, divType, parentDiv = bodyCopy) => {
   //    let newDiv = document.createElement('div')
   //    newDiv.className = divType
   //    if (aPara != null && parentDiv != null && typeof parentDiv == 'object') {

   //          //if specified parent, append new div there
   //          changeDomList.push(() => {
   //             parentDiv.appendChild(newDiv) // append new div there
   //             newDiv.appendChild(aPara) // make this paragraph div's child
   //          })
   //          return newDiv

   //    } else {
   //       warnCS(
   //          `Paragraph: '${aPara?.classList}' & '${aPara.textContent?.slice(0, 50)}' for divType: ${divType} and ParentDiv: ${parentDiv}`,
   //          'createDivs.js',
   //          'makeNewDiv'
   //       )
   //    }
   //    return newDiv
   // }

   // // execute list of changes to DOM
   // changeDomList.forEach(domChange => {
   //    domChange()
   // })




const CleanUpTemp = (newBody) => {
   // cleaning up forms
   const allFormDivs = newBody.querySelectorAll('div.form')
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
   const allNoteDivs = newBody.querySelectorAll('div.note')
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

   return newBody
} //buildBodyDivs(aBody)
