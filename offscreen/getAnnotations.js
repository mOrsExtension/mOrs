
const tabRegExp = '(&nbsp;|\\s)*'

// This function performs basic filtering and error checking on messages before
// dispatching the message to a more specific message handler.

const offscreenHandleMessages = (message) => {
  // Return early if this message isn't meant for the offscreen document.
  if (message.target !== 'offscreen') {
    return false
  }
  console.log('offscreen has started!')
  const htmlDoc = createDomDoc(message.data)
  const annoDoc = new AnnoDocHandler(htmlDoc, message.chapter)
  console.log(annoDoc.sections)
  return(annoDoc.sections)
}

const createDomDoc = (text) => {
   const parser = new DOMParser();
   return parser.parseFromString(text, 'text/html');
}

// const emptyDoc = () => {
//    let parser = new DOMParser()
//    return parser.parseFromString(
//       `<!DOCTYPE html><html><head></head><body></body></html>`,
//       'text/html'
//    )
// }


class AnnoDocHandler {
   constructor(doc, chapter) {
      this.doc = doc
      this.chapter = chapter
      this.sections = {}
      this.annoList = []
      this.#regExpCleanup()
      this.#parseDoc()
      this.#deleteParentsWithNoChildren()
      this.makeSectionDivs()
   }

   #regExpCleanup() {
      let docContent = this.doc.textContent + ''
      console.log(docContent)
      docContent = docContent.replace(/\s*[\n\r]\s*/g, ' ') // replace newlines with space
      let /** capturing groups $1:volume, $2:page, $3:year */ casesCoA = [...docContent.matchAll(/(\d{1,3})\sOr\.?\s?App\.?\s(\d{1,3})[,Pd\d\s]*\((\d{4})\)/g)]
      let /** capturing groups $1:volume, $2:page, $3:year */ casesOSC = [...docContent.matchAll(/(\d{1,3})\sOr\.?\s(\d{1,3})/g)]
      let /** capturing groups $1:volume, $2:page, $3:year */ orLawRev = [...docContent.matchAll(/(\d{1,3})\sOLR\s(\d{1,3})\s[\d,-]*\((\d{4})\)/g)]
      let /** capturing groups $1:volume, $2:page, $3:year */ wLawRev = [...docContent.matchAll(/(\d{1,3})\sWL(R|J)\s(\d{1,3})\s[\d,-]*\((\d{4})\)/g)]
      let /** capturing groups $1:volume, $2:page, $3:year */ EnvLRev = [...docContent.matchAll(/(\d{1,3})\sELR?\s(\d{1,3})\s[\d,-]*\((\d{4})\)/g)]
      casesCoA.forEach(CoACase => {
         docContent = this.anchorWrap(docContent, CoACase[0], 'case-COA', `https://scholar.google.com/scholar?hl=en&as_sdt=4%2C38&q=${CoACase[1]}+or+app+${CoACase[2]}}`)
      })
      casesOSC.forEach(OSCCase => {
         docContent = this.anchorWrap(docContent, OSCCase[0], 'case-OSC', `https://scholar.google.com/scholar?hl=en&as_sdt=4%2C38&q=${OSCCase[1]}+or+${OSCCase[2]}}`)
      })
      orLawRev.forEach(article => {
         docContent = this.anchorWrap(
            docContent,
            article[0],
            'oregonLaw',
            `https://scholar.google.com/scholar?hl=en&as_sdt=0%2C38&as_ylo=${article[3].number-1}&as_yhi=${article[3].number+1}&q=${article[1]}+%22Or.+L.+Rev.%22+${article[2]}&btnG=`
         )
      })
      wLawRev.forEach(article => {
         docContent = this.anchorWrap(
            docContent,
            article[0],
            'willametteLaw',
            `https://scholar.google.com/scholar?hl=en&as_sdt=0%2C38&as_ylo=${article[3].number-1}&as_yhi=${article[3].number+1}&q=${article[1]}+Willamette+Law+Review%7CJournal+${article[2]}&btnG=`
         )
      })
      EnvLRev.forEach(article => {
         docContent = this.anchorWrap(
            docContent,
            article[0],
            'envLaw',
            `https://scholar.google.com/scholar?hl=en&as_sdt=0%2C38&as_ylo=${article[3].number-1}&as_yhi=${article[3].number+1}&q=${article[1]}+%22Envtl.+L.%22+${article[2]}&btnG=`
         )
      })
      console.log(docContent)
      return docContent
   }
   /**wraps text found by regular expression in an anchor & gives it <a> class*/
   anchorWrap (/**@type {string} */ oldText, regExWrap, /**@type {string} */ anchorClass, href) {
   // uses RegExp.replace(callback to use matches to generate replacement piece)
      return oldText.replace(RegExp(regExWrap, 'g'), (/** @type {string} */ match) => {
         return `<a class="${anchorClass}" href="${href}" rel='noopener'>${match}</a>`
      })
   }

   #parseDoc() {
      console.log(`parsing commenced for chapter ${this.chapter}`)
      this.doc.querySelectorAll('p').forEach(p => {
         p.className = this.#getClass(p)
         console.log(`${p.className} - ${p.textContent} `)
         switch (p.className) {
            case 'remove':
               p.remove
               break
            case 'sectionHead': {
               this.#buildAnnoSection(p.textContent, 'section')
               break
            }
            case 'chapterHead': {
               this.#buildAnnoSection(p.textContent, 'chapter')
               break
            }
            default: {
               //let newHtml = this.#caseCites(p.textContent)
               this.#addToCurrent(p)
               break
            }
         }
      })
   }
   #getClass(pElem) {
      let secRegExp = RegExp(`\\s*${this.chapter}\\.\\d{3,4}`)
      let chapRegExp = RegExp(`Chapter\\s0*${this.chapter}`, 'm')
      console.log(`${secRegExp}, ${chapRegExp}`)
      if(secRegExp.test(pElem.textContent)) {
         return 'sectionHead'
      }
      if(chapRegExp.test(pElem.textContent)) {
         return 'chapterHead'
      }
      if (/^NOTES\sOF\sDECISION/m.test(pElem.textContent)) {
         return 'decisionHead'
      }
      if ((/^ATTY.\sGEN.\sOPINION/m).test(pElem.textContent)) {
         return 'agHeading'
      }
      if ((/^LAW\sREVIEW\sCITATION/m).test(pElem.textContent)) {
         return 'lawRevHeading'
      }
      if (/^\s*$/.test(pElem.textContent)) {
         return 'remove'
      }
      if (/\s*<b>/.test(pElem.innerHTML)) {
         return 'remove'
      }
      return 'default'
   }
   #buildAnnoSection(name, type) {
      let anno = {
         'name': name,
         'type': type,
         'children': []
      }
      this.annoList.push(anno)
   }

   #addToCurrent(newPara) {
      if (this.annoList.length > 0) {
         this.annoList[this.annoList.length-1].children.push(newPara)
         console.log(this.annoList)
      }
   }
   #deleteParentsWithNoChildren() {
      this.annoList = this.annoList.filter(aParent => {
         aParent.children.length == 0
      })
   }

   makeSectionDivs() {
      this.annoList.forEach(anno => {
         console.log(anno.name)
         const newDiv = this.doc.createElement('div')
         const firstParagraph = this.doc.createElement('p')
         firstParagraph.innerHTML = `<b>${anno.name}</b>`
         newDiv.appendChild(firstParagraph)
         anno.children.forEach(child => {
            newDiv.appendChild(child)
         })
         this.sections[anno.name] = newDiv
      })
   }
}

function sendToBackground(type, data) {
   chrome.runtime.sendMessage({
      type,
      target: 'background',
      data
   });
}

chrome.runtime.onMessage.addListener((msg, _sender, response) => {
   offscreenHandleMessages(msg)
})
