//createDivs.js
//@ts-check

//TODO: #24 #bugfix: createDivs generally not working

class GenericDiv {
   constructor (firstElement, type, parent) {
      this.elementList = [firstElement]
      this.parent = parent
      this.classList = []
      this.classList.push(type)
      this.Div = this.constructOwnDiv()
   }
   constructOwnDiv () {
      let newDiv = document.createElement('div')
      this.elementList.forEach(anElem => {
         newDiv.appendChild(anElem)
      })
      newDiv.className = this.classList.join(' ')
      return newDiv
   }

   addParagraph (paragraph) {
      this.elementList.push(paragraph)
   }

   addChild (childParagraph, type) {
      let newChild = new GenericDiv(childParagraph, type, this)
      this.elementList.push(newChild.Div)
      return newChild
   }
}

class SectionDiv extends GenericDiv {
   constructor(element, parent) {
      super()
   }
}

class ParaClassAndParentIdentifier {
   constructor (className) {
      this.className = className
      this.sortClass()
   }

   sortClass() {
      switch(this.className) {
         case 'headingLabel': {
            if (parents.active.form == null) {
               this.build('head', 'body', 'heading')
            } else {
               this.buildForm()
            }
         } break
         case 'subheadLabel': {
            if (parents.active.form == null) {
               this.build('sub', 'head', 'subhead')
            } else {
               this.buildForm()
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
            this.build('sec', 'note', 'sec')
         } break
         default: {
            this.parent = parents.getExistingParentElement('form')
            this.buildsNew = 'none'
         } break
      }
   }

   build(close, parent, build) {
      parents.closeParents(close)
      this.type = close
      this.parent = parents.getExistingParentElement(parent)
      this.buildNew = build
   }

   buildForm() {
      this.parent = parents.getExistingParentElement('form')
      this.buildsNew = 'none'
   }
}

// initializing object for holding which parent of certain children class is active
let newBody = new GenericDiv()
let parents = {active: {
      body:newBody,
      head:null,
      sub:null,
      temp:null,
      note:null,
      sec:null,
      form:null
   },
   list: ['body', 'head', 'sub', 'temp', 'note', 'sec', 'form'],
   revList: this.list.slice().reverse(),
   /**takes parent off the active list, they're done having children */
   closeParents: startWith => {
      this.list.slice(this.list.indexOf(startWith)).forEach(parent => {
         parent = null
      })
   },
   /** takes list of potential parents, returns first one that exists, if none, returns the main body */
   getExistingParentElement : startWith => {
      let answer
      this.revList.slice(this.revList.indexOf(startWith)).every(possibleParent => {
         if (possibleParent != null && !answer) {
            answer = possibleParent
            return false
         }
         return true
      })
      return answer
   }
}

/** called only from mORS.js (main script)
Creates divs for headings, note groups, sections, notes and forms */
const buildBodyDivs = (/**@type {HTMLDivElement}*/ bodyCopy) => {
   bodyCopy.querySelectorAll('p').forEach(aPara => {
      const paraHTML = aPara.innerHTML
      let aParaClasses = aPara.className
      if (aParaClasses == 'endForm') {
         parents.closeParents('form')
         next aPara
      }
      const paraType = new ParaClassAndParentIdentifier(aParaClasses)
      let /**@type {GenericDiv} */ paraParent = paraType.parent
      if (paraType.buildNew=='none') {
         paraParent.addChild(aPara)
      } else if (paraType.buildNew == 'sec') {
         console.log('messy parts of sec')
      } else {
         let newDiv = paraParent.addChild(aPara, paraType.className)
         parents.active[paraType.type] = newDiv
      }
   })
}

class SectionClassifier {
   constructor (
      /**@type {HTMLParagraphElement}*/ aPara,
      /**@type {GenericDiv}*/ purportedParent
   ) {
      this.aPara = aPara
      this.paraParent = purportedParent
      this.paraText = aPara?.textContent || ''
      this.prevSibText = aPara.previousElementSibling?.textContent || ''
      this.type = this.isParent_ANDAddClass_ORFindParent()
       ? 'note'
       : this.isBurnt()
       ? 'burnt'
   }


   isParent_ANDAddClass_ORFindParent () {
      if (this.paraParent.classList.includes('note')) {
         let noteClass = ['noteSec']
         if (/Sec\.\s\d{1,3}[a-f]?\./.test(this.paraText)) {
            noteClass.push('sessionLaw')
         }
         if (/repeal[^]*user.s\sconvenience/.test(this.prevSibText)) {
            noteClass.push('futureRepeal')
         }
         if (/amendment[^]*become[^]*after[^]*\sconvenience/.test(this.prevSibText) ||
          (/amendment[^]*would become[^]*\sconvenience/.test(this.prevSibText))) {
            noteClass.push('furtherAmend')
         }
         if (/amendment[^]*become[^]*until[^]*\sconvenience/.test(this.prevSibText)) {
            noteClass.push('priorAmend')
         }
         if (noteClass?.length > 1) {
            this.newClasses = noteclass
            return true
         }
         parents.closeParents('temp')
         this.paraParent = parents.getExistingParentElement('sub')
      } return false
   }

   isBurnt() {

   }
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
               )  // TODO #5 Handle future amend section for "that would become operative upon" language for 469.992 and 196.800, etc. note sections
            }
            currentSec = makeNewDiv(aPara, `section ${getType()}`, getParentElement([currentNote, currentSubHead, currentHead])) // and this section is a new ORS div (parented by main body)
         } break // "section"

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
               getParentElement([
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
               getParentElement([
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

      /**adds current paragraph to existing div; pushes to build list
   * @param {Element} aPara
   * @param {Element|null} useDiv */
      const addToDiv = (
         aPara,
         useDiv = getParentElement([currentForm, currentSec, currentNote])
      ) => {
         /**make sure neither are falsy */
         if (aPara && useDiv) {
            changeDomList.push(() => {
               useDiv.appendChild(aPara)
            })
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

   // execute list of changes to DOM
   changeDomList.forEach(domChange => {
      domChange()
   })

   /**Disconnects everything after head>sub>temp>note>section>form (break is intentionally absent)
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
}



const CleanUpTemp = () {
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
