class AnnoHandler {
    constructor(chapNo) {
        this.chapter = '0'
        this.#validateAndCleanChapter(chapNo) // private class must be function, not answer
        this.url = `https://www.oregonlegislature.gov/bills_laws/ors/ano00${this.chapter}.html`.replace(/0*(\d{3})/, '$1')
        this.doc = ''
        this.paragraphList = []
        let chapName = `Chapter ${this.chapter}`
        this.annoSecList = {'chapter' : {[chapName] : []}}
        this.current = this.annoSecList.chapter[chapName]
        if (this.chapter != '0') {
            this.#fetchData()
        }
    }

    // public Class method to return annotation as javascript object
    async getAnnoSections() {
        infoBG(`retrieving annotation sections`, 'annotations.js', 'getAnnoSections', '#ffbbff')
        if (!this.annoSecList.length < 2) {
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
        infoBG('Sent to fetch annotations', 'annotations.js', 'fetchData')
        this.doc = await getTextFromHtml(this.url, 'windows-1251')  // webResources.js
        infoBG('Finished fetching annotations', 'annotations.js', 'fetchData')
    }

    /** loops back to see if webpage has been retrieved over fixed duration*/
    #loopAwaitData() {
        this.#fetchData()
        const msWait = 100
        const maxAttempt = 45
        return new Promise(async resolve => {
            let i = 1
            let done = false
            let dataFetchLoop = setInterval(() => {
                if (this.doc) {
                    clearInterval(dataFetchLoop)
                    done = true
                    resolve(done)
                }
                if (i > maxAttempt) {
                    clearInterval(dataFetchLoop)
                    warnBG(`timed out after ${maxAttempt} attempts (${maxAttempt * msWait}ms)`)
                    resolve(done)
                }
                if (!done) {
                    infoBG(`Awaiting annotation retrieval; attempt #${i} of ${maxAttempt} (${i*msWait}ms)`, 'annotations.js', '#loopAwaitData')
                }
                i++
            } , msWait)
        })
    }

    /** FYI, ended up just using RegExp rather than actual DOM parsing, because DOM would have required creating outside dummy page of temp html */
    async #docDomParsing () {
        if (this.annoSecList.length > 1) {return} // keep from accidentally running 2x
        this.#regExpCleanup()
        this.#getParagraphList()
        this.#classifyParagraphs()
        this.#filterParagraphs()
        this.#buildSections()
        this.#deleteParentsWithNoChildren()
        infoBG(`Created anno list for ${Object.keys(this.annoSecList).length} sections`, 'annotations.js', '#docDomParsing')
    }

    #regExpCleanup() {
        this.doc = this.doc.replace(/[^]*?<div/,'')
        this.doc = this.doc.replace(/\s*[\n\r]\s*/g, ' ') // replace newlines with space
        let /** capturing groups $1:volume, $2:page, $3:year */ casesCoA = [...this.doc.matchAll(/(\d{1,3})\sOr\.?\s?App\.?\s(\d{1,4})[,Pd\d\s]*\((\d{4})\)/g)]
        let /** capturing groups $1:volume, $2:page, $3:year */ casesOSC = [...this.doc.matchAll(/(\d{1,3})\sOr\.?\s(\d{1,4})[^]*?\d\)/g)]
        let /** capturing groups $1:volume, $2:page, $3:year */ orLawRev = [...this.doc.matchAll(/(\d{1,3})\sOLR\s(\d{1,4})\s[\d,-]*\((\d{4})\)/g)]
        let /** capturing groups $1:volume, $2:page, $3:year */ wLawRev = [...this.doc.matchAll(/(\d{1,3})\sWL(?:R|J)\s(\d{1,4})\s[\d,-]*\((\d{4})\)/g)]
        let /** capturing groups $1:volume, $2:page, $3:year */ EnvLRev = [...this.doc.matchAll(/(\d{1,3})\sELR?\s(\d{1,4})\s[\d,-]*\((\d{4})\)/g)]
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
            return `<a class="${anchorClass}" href="${href}" rel="noopener">${match}</a>`
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
        let secRegExp = RegExp(`^${tabRegExp}${this.chapter}\\.\\d{3,4}`)
        let chapRegExp = RegExp(`Chapter\\s0*${this.chapter}`)
        this.paragraphList.forEach(p => {
            p['classIs'] = (assignClass(p.text))
        })
        function assignClass(text) {
            if(secRegExp.test(text)) {
                return 'sectionHead'
            }
            if (
                (chapRegExp.test(text)) ||
                (/^NOTES\sOF\sDECISION/m.test(text)) ||
                (RegExp(`^${tabRegExp}$`).test(text)) ||
                (RegExp(`^${tabRegExp}*<b>`).test(text))
            ) {
                return 'remove'
            }
            return 'default'
        }
    }

    #filterParagraphs() {
        this.paragraphList = this.paragraphList.filter(p => {
            return (p.classIs !== 'remove')
        })
    }

    #buildSections() {
        const seriesRegExp = RegExp(`${this.chapter}\\.\\d{3,4}\\sto\\s${this.chapter}\\.\\d{3,4}`)
        const secRegExp = RegExp(`${this.chapter}\\.\\d{3,4}`)
        this.paragraphList.forEach(p => {
            if (p.classIs == 'sectionHead') {
                const section = [...p.text.match(secRegExp)][0]
                const build = seriesRegExp.test(p.text)
                ? `Series ORS ${[...p.text.match(seriesRegExp)][0]}`
                : `ORS ${section}`
                this.#buildAnnoSection(section, build)
                return
            }
            this.#addToCurrent(p.text)
        })
    }

    #buildAnnoSection(name, type) {
        {
            if (!(name in this.annoSecList)) {
                this.annoSecList[name] = {}
            }
            this.annoSecList[name][type] = []
            this.current = this.annoSecList[name][type]
        }
    }

    #addToCurrent(newPara) {
        try {
            this.current.push(newPara)
        } catch (error) {
            warnBG(`Could not add paragraph ${newPara}; error: ${error}`, 'annotations.js', '#addToCurrent')
        }
    }

    #deleteParentsWithNoChildren() {
        for (const aName in this.annoSecList) {
            for (const aType in aName) {
                if (aType.length < 1) {
                delete this.annoSecList[aName][aType]
                }
            }
            if (Object.keys(aName).length < 1) {
                delete this.annoSecList[aName]
            }
        }
    }
}

//GLOBAL CONSTANTS FOR ANNO HANDLER
const orsRegExp = /\b0*([1-9]\d{0,2}[a-c]?)(\.\d{3,4})?/ // finds "chapter" or "chapter.section", e.g. "459A"
const tabRegExp = '(?:(?:&nbsp;|\\s)*)'
let annoBuild

/** Starts getting Annos (will not be done by time rest of script runs) from msgListenerBG.js */
const startAnnoRetrieval = (chapter) => {
    infoBG(`Getting annotations for ${chapter}`, 'annotations.js', 'startAnnoRetrieval')
    annoBuild = new AnnoHandler(chapter)
    return true
}

/** Finishes getting Annos, returns list of section Objects {name; type; children:{text}}; from msgListenerBG.js */
const finishAnnoRetrieval = async () => {
    try {
        infoBG('Finishing annotations retrieval', 'annotations.js', 'finishAnnoRetrieval')
        return await annoBuild.getAnnoSections()
    } catch (error) {
        warnBG(`Retrieving annotations error: ${error}`, 'annotations.js', 'finishAnnoRetrieval')
    }
}
