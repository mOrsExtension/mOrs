//createDivs.js

//CLASSES:
class GenericDiv {
    constructor (/**@type {HTMLParagraphElement} */ firstElement, classList) {
        this.classList = []
        this.classList = this.classList.concat(classList)
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
        let newChild = new GenericDiv(childParagraph, classList)
        this.Div.appendChild(newChild.Div)
        return newChild
    }
}

class ParaClassAndParentIdentifier {
    constructor (className) {

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

// GLOBAL VARIABLES
// initializing object for holding which parent of certain children class is active
const newMainBodyDiv = new GenericDiv(document.createElement('p'), '')
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
                return false
            }
            return true
        })
        return answer
    }
}

let cleanerObject = {
    /**@type {HTMLDivElement} */ body : document.createElement('div'),
    month:
    '(?:January|February|March|April|May|June|July|August|September|October|November|December)',
    doAllCleanUp() {
        this.getFormParagraphs()
        this.getNoteParagraphs()
        return this.body
    },
    getFormParagraphs () {
        this.body.querySelectorAll('div.form').forEach(formDiv => {
            formDiv.querySelectorAll('p').forEach(formPElem => {
                this.fixParaBasedOnClass(formPElem)
            })
        })
    },
    fixParaBasedOnClass(formPElem) {
        switch (formPElem.className) {
            case 'startForm':
            case 'endForm': {
                formPElem.remove()
            } break
            case 'headingLabel':{
                formPElem.className = 'formHeading'
            } break
            default: {
                if (/^[^a-z]+$/.test(formPElem.textContent) && !/^(_|\s)+$/.test(formPElem.textContent)) {
                formPElem.className = 'formHeading'
                } else {
                formPElem.className = 'default'
                }
            }
        }
    },
    getNoteParagraphs () {
        this.body.querySelectorAll('div.note').forEach(noteDiv => {
            noteDiv.querySelectorAll('p').forEach(notePara => {
                this.cleanUpNotes(notePara, noteDiv)
            })
        })
    },
    cleanUpNotes(notePara, noteDiv) {

        switch (notePara.classList) {
            case 'startNote': {
                notePara.textContent = notePara.textContent.trim()
            } break
            case 'furtherAmend': {
                const introPara = notePara.previousElementSibling
                const isDateTrue = this.colorBasedOnDate(
                introPara,
                `on\\sand\\safter\\s(${this.month}\\s\\d{1,2},\\s20\\d{2}),`,
                'afterDate'
                )
                noteDiv.classList.add(isDateTrue ? 'isTrue' : 'isFalse')
            } break
            case 'priorAmend': {
                const introPara = notePara.previousElementSibling
                const isDateTrue = this.colorBasedOnDate(
                introPara,
                `until\\s(${this.month}\\s\\d{1,2},\\s20\\d{2}),`,
                'untilDate'
                )
                noteDiv.classList.add(isDateTrue ? 'isTrue' : 'isFalse')
            } break
            case 'futureRepeal': {
                const introPara = notePara.previousElementSibling
                const isDateTrue = this.colorBasedOnDate(
                introPara,
                `until\\s(${this.month}\\s\\d{1,2},\\s20\\d{2}),`,
                'untilDate'
                )
                noteDiv.classList.add(isDateTrue ? 'isTrue' : 'isFalse')
            }
        }
    },
    /**wraps text found by regular expression in an span and gives it a class; helper.js
        * @param {HTMLElement} searchedElem / Element to be replaced
        * @param {string|RegExp} searchText / entire expression to be wrapped
        * @param {string} spanClass / assigned class */
    colorBasedOnDate (searchedElem, searchText, spanClass) {
        const searchFor = RegExp(searchText)
        let elemHTML = searchedElem.innerHTML
        let isDateTrue = false
        let foundMatch = elemHTML.match(searchFor)
        if (foundMatch) {
            const theDate = new Date(foundMatch[1])
            const theText = foundMatch[0]
            isDateTrue = (theDate > new Date()) == (spanClass == 'untilDate')
            elemHTML = this.addWrap(elemHTML, theText, isDateTrue)
        }
        return isDateTrue
    },
    addWrap (elemHTML, match, isDateTrue) {
        const newSpan = document.createElement('span')
        newSpan.textContent = match
        newSpan.classList.add(isDateTrue ? 'isTrue' : 'isFalse')
        let wrappedArray = elemHTML.split(match)
        wrappedArray.splice(1, 0, newSpan.innerHTML)
        console.log(wrappedArray)
        return wrappedArray.join('')
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
            if (pElem.classList.contains('endForm')) {
                parents.closeParents('form') // whatever comes after the end line of a form doesn't belong in form
            }
            return
        }
        if (aPara.buildType == 'sec') {
            const secType = new SectionClassifier(pElem, aPara.parent)
            aPara.parent = secType.paraParent
            aPara.buildClass = aPara.buildClass.concat(secType.addClassList)
        }
        let newDiv = aPara.parent.addChild(pElem, aPara.buildClass)
        parents.active[aPara.buildType] = newDiv
        if (pElem.classList.contains('sourceNote'))
            parents.closeParents('sec') // whatever comes after source notes doesn't belong in its section
    })
    let newBodyDiv = newMainBodyDiv.Div
    cleanerObject.body = (newBodyDiv)
    return cleanerObject.doAllCleanUp()
}
