class AnnoHandler {
   constructor(chapNo) {
      this.chapter = '0'
      this.#validateAndCleanChapter(chapNo)
      this.url = `https://www.oregonlegislature.gov/bills_laws/ors/ano00${this.chapter}.html`.replace(/0*(\d{3})/, '$1')
      this.doc = ''
      this.paragraphList = []
      this.annoSecList = {[chapNo]: {'type': 'start', 'children': []}}
      this.current = this.annoSecList[chapNo]
      if (this.chapter != '0') {
         this.#fetchData()
      }
   }

   async getSections() {
      infoBG(`getting Sections`, 'annotations.js', 'getSections', '#ffbbff')
      if(!this.annoSecList.length < 2) {
         if (await this.#loopAwaitData()) {
            this.#docDomParsing()
         }
      }
      return this.annoSecList
   }

   #validateAndCleanChapter(chapNo) {
      if (orsRegExp.test(chapNo)) {
         this.chapter =  [...chapNo.match(RegExp(orsRegExp.source, ''))][1]
      } else {
         warnBG(`Can't find chapter`, 'annotations.js', 'validateAndCleanChapter')
      }
   }
   async #fetchData() {
      if (this.fetchStart) {return} // keep from accidentally running 2x+
      this.fetchStart = true
      infoBG('fetching annotations', 'annotations.js', 'fetchData')
      this.doc = await getTextFromHtml(this.url, 'windows-1251')  // webResources.js
      infoBG('fetched annotations', 'annotations.js', 'fetchData')
   }

   #loopAwaitData() {
      this.#fetchData()
      const msWait = 95
      const maxAttempt = 50
      return new Promise(async resolve => {
         let i = 0
         let dataFetchLoop = setInterval(() => {
            if (this.doc) {
               clearInterval(dataFetchLoop)
               resolve(true)
            }
            if (i > 50) {
               clearInterval(dataFetchLoop)
               warnBG(`timed out after ${maxAttempt} attempts (${maxAttempt * msWait}ms)`)
               resolve(false)
            }
            infoBG(`Annotation retrieval; attempt: #${i} (${i*msWait}ms)`, 'annotations.js', '#loopAwaitData')
            i++
         } , msWait)
      })
   }

   async #docDomParsing () {
      if (this.annoSecList.length > 1) {return} // keep from accidentally running 2x
      this.#regExpCleanup()
      this.#getParagraphList()
      this.#classifyParagraphs()
      this.#deleteEmptyParagraphs()
      this.#buildSections()
      this.#deleteParentsWithNoChildren()
   }

   #regExpCleanup() {
      this.doc = this.doc.replace(/[^]*?<div/,'')
      this.doc = this.doc.replace(/\s*[\n\r]\s*/g, ' ') // replace newlines with space
      let /** capturing groups $1:volume, $2:page, $3:year */ casesCoA = [...this.doc.matchAll(/(\d{1,3})\sOr\.?\s?App\.?\s(\d{1,3})[,Pd\d\s]*\((\d{4})\)/g)]
      let /** capturing groups $1:volume, $2:page, $3:year */ casesOSC = [...this.doc.matchAll(/(\d{1,3})\sOr\.?\s(\d{1,3})/g)]
      let /** capturing groups $1:volume, $2:page, $3:year */ orLawRev = [...this.doc.matchAll(/(\d{1,3})\sOLR\s(\d{1,3})\s[\d,-]*\((\d{4})\)/g)]
      let /** capturing groups $1:volume, $2:page, $3:year */ wLawRev = [...this.doc.matchAll(/(\d{1,3})\sWL(?:R|J)\s(\d{1,3})\s[\d,-]*\((\d{4})\)/g)]
      let /** capturing groups $1:volume, $2:page, $3:year */ EnvLRev = [...this.doc.matchAll(/(\d{1,3})\sELR?\s(\d{1,3})\s[\d,-]*\((\d{4})\)/g)]
      console.log(` ***\n${casesCoA.join('||')}\n\n ${casesOSC}\n\n ${orLawRev}\n\n ${wLawRev}\n\n ${EnvLRev}\n ***`)
      casesCoA.forEach(CoACase => {
         this.doc = this.anchorWrap(
            this.doc,
            CoACase[0],
            'case-COA', `https://scholar.google.com/scholar?hl=en&as_sdt=4%2C38&q=${CoACase[1]}+or+app+${CoACase[2]}`
         )
      })
      casesOSC.forEach(OSCCase => {
         this.doc = this.anchorWrap(
            this.doc,
            OSCCase[0],
            'case-OSC',
            `https://scholar.google.com/scholar?hl=en&as_sdt=4%2C38&q=${OSCCase[1]}+or+${OSCCase[2]}`
         )
      })
      orLawRev.forEach(article => {
         this.doc = this.anchorWrap(
            this.doc,
            article[0],
            'oregonLaw',
            `https://scholar.google.com/scholar?hl=en&as_sdt=0%2C38&as_ylo=${Number(article[3]) - 1}&as_yhi=${Number(article[3]) + 1}&q=${article[1]}+%22Or.+L.+Rev.%22+${article[2]}&btnG=`
         )
      })
      wLawRev.forEach(article => {
         console.log(article[3])
         this.doc = this.anchorWrap(
            this.doc,
            article[0],
            'willametteLaw',
            `https://scholar.google.com/scholar?hl=en&as_sdt=0%2C38&as_ylo=${Number(article[3]) - 1}&as_yhi=${Number(article[3]) + 1}&q=${article[1]}+%22Willamette+L.+Rev.%7CJournal%22+${article[2]}&btnG=`
         )
      })
      EnvLRev.forEach(article => {
         this.doc = this.anchorWrap(
            this.doc,
            article[0],
            'envLaw',
            `https://scholar.google.com/scholar?hl=en&as_sdt=0%2C38&as_ylo=${Number(article[3]) - 1}&as_yhi=${Number(article[3]) + 1}&q=${article[1]}+%22Envtl.+L.%22+${article[2]}&btnG=`
         )
      })
      return this.doc
   }
   /**wraps text found by regular expression in an anchor & gives it <a> class*/
   anchorWrap (
      /**@type {string} */ oldText,
      /** @type {string|RegExp} */ regExWrap,
      /**@type {string} */ anchorClass, href
   ){
   // uses RegExp.replace (callback to use matches to generate replacement piece)
   let cleanRegExp = regExWrap.replace(/\(/g, '\\(').replace(/\)/g, '\\)')
   let searchRegExp = RegExp(cleanRegExp, 'g')
         return oldText.replace(searchRegExp, (/** @type {string} */ match) => {
         return `<a class="${anchorClass}" href="${href}" rel='noopener'>${match}</a>`
      })
   }

   #getParagraphList() {
      let paragraphMatchList = [...this.doc.matchAll(/<span[^>]*>([^]*?)<\/span>/g)] // $1: paragraph body
      if (paragraphMatchList && paragraphMatchList.length) {
         paragraphMatchList.forEach(match => {
            this.paragraphList.push({'text': match[1].trim()})
         })
      }
   }

   #classifyParagraphs() {
      let secRegExp = RegExp(`\\s*${this.chapter}\\.\\d{3,4}`)
      let chapRegExp = RegExp(`Chapter\\s0*${this.chapter}`, 'm')
      this.paragraphList.forEach(p => {
         p['classIs'] = (assignClass(p.text))
      })
      function assignClass(text) {
         if(secRegExp.test(text)) {
            return 'sectionHead'
         }
         if(chapRegExp.test(text)) {
            return 'chapterHead'
         }
         if (/^NOTES\sOF\sDECISION/m.test(text)) {
            return 'remove'
         }
         if (RegExp(`^${tabRegExp}$`).test(text)) {
            return 'remove'
         }
         if (RegExp(`^${tabRegExp}*<b>`).test(text)) {
            return 'remove'
         }
         return 'default'
      }
   }

   #deleteEmptyParagraphs() {
      this.paragraphList = this.paragraphList.filter(p => {
         if (p.classIs=='sectionHead') {
            console.log(p)
         }
         return (p.classIs !== 'remove')
      })
   }

   #buildSections() {
      this.paragraphList.forEach(p => {
         switch (p['classIs']) {
            case 'sectionHead': {
               this.#buildAnnoSection(p.text, 'section')
            } break
            case 'chapterHead': {
               this.#buildAnnoSection(p.text, 'chapter')
            } break
            default: {
               this.#addToCurrent(p.text)
            } break
         }
      })
   }

   #buildAnnoSection(name, type) {
      this.annoSecList[name] = {'type': type, 'children': []}
      this.current = this.annoSecList[name]
   }

   #addToCurrent(newPara) {
      this.current.children.push(newPara)
   }

   #deleteParentsWithNoChildren() {
      for (const key in this.annoSecList) {
         if (this.annoSecList[key].children.length < 1) {
            delete this.annoSecList[key]
         }
      }
   }
}

//GLOBAL CONSTANTS FOR ANNO HANDLER
const orsRegExp = /\b0*([1-9]\d{0,2}[a-c]?)(\.\d{3,4})?/ // finds "chapter" or "chapter.section", e.g. "459A"
let annoBuild

/** Starts getting Annos (will not be done by time rest of script runs) from msgListenerBG.js */
const startAnnoRetrieval = (chapter) => {
   console.log(`Getting annotations for ${chapter}`)
   annoBuild = new AnnoHandler(chapter)
   console.log(annoBuild.doc)
}

/** Finishes getting Annos, returns list of section Objects {name; type; children:{text}}; from msgListenerBG.js */
const finishAnnoRetrieval = async () => {
   try {
      return await annoBuild.getSections()
   } catch (error) {
      warnBG(`Retrieving annotations error: ${error}`, 'annotations.js', 'finishAnnoRetrieval')
   }
}

const tabRegExp = '(?:(?:&nbsp;|\\s)*)'