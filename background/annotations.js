/** Cleans up annoSecList using RegExp
 *  (instead of DOM parsing, because DOM required creating outside dummy page of temp html) */
class AnnoCleaner {
    constructor(chapterNo, rawHtml) {
        this.chapterNo = chapterNo
        this.cleanHtml = rawHtml
        this.sectionList = []
        this.#regExpCleanup()
        this.#buildCitations()
        this.rawParaList = this.#splitParagraphs()
        infoAnnos(`Created anno paragraph list for ${this.rawParaList.length} ORS sections`, 'docDomParsing')
    }

    /** deletes html junk & extra line breaks; */
    #regExpCleanup() {
        this.cleanHtml = this.cleanHtml.replace(/[^]*?<div/,'') // delete junk before first div
        this.cleanHtml = this.cleanHtml.replace(/\s*[\n\r]\s*/g, ' ') // replace newlines with space
        this.cleanHtml = this.cleanHtml.replace(/<b>(<span[^]*?>)([^]*?)(<\/span>)/g, '$1<b>$2</b>$3') // moves bold tags within span
    }

    /** replaces raw data with reporter links */
    #buildCitations() {
        /** Regular expressions list */
        const /** $1:vol, $2:page, $3:year */coaRegExp = /(\d{1,3})\sOr\.?\s?App\.?\s(\d{1,4})[,Pd\d\s]*\((\d{4})\)/g
        const /** $1:vol, $2:page, $3:year */ oscRegExp = /(\d{1,3})\sOr\.?\s(\d{1,4})[^]*?\d\)/g
        const /** $1:vol, $2:page, $3:year */ olrRegExp = /(\d{1,3})\sOLR\s(\d{1,4})\s[\d,-]*\((\d{4})\)/g
        const /** $1:vol, $2:page, $3:year */wlrRegExp = /(\d{1,3})\sWL(?:R|J)\s(\d{1,4})\s[\d,-]*\((\d{4})\)/g
        const /** $1:vol, $2:page, $3:year */ elrRegExp = /(\d{1,3})\sELR?\s(\d{1,4})\s[\d,-]*\((\d{4})\)/g

        /** finding matches for citations */
        let searchCasesCoA = [...this.cleanHtml.matchAll(coaRegExp)]
        let searchCasesOSC = [...this.cleanHtml.matchAll(oscRegExp)]
        let searchOrLawRev = [...this.cleanHtml.matchAll(olrRegExp)]
        let searchWLawRev = [...this.cleanHtml.matchAll(wlrRegExp)]
        let searchEnvLRev = [...this.cleanHtml.matchAll(elrRegExp)]

        /** building list of replacement objects from unique matches */

        let replacementList = this.#uniqueMatchesToCiteList(searchCasesCoA, 'case-COA')
        replacementList = replacementList.concat(this.#uniqueMatchesToCiteList(searchCasesOSC, 'case-OSC'))
        replacementList = replacementList.concat(this.#uniqueMatchesToCiteList(searchOrLawRev, 'OrLRev'))
        replacementList = replacementList.concat(this.#uniqueMatchesToCiteList(searchWLawRev, 'willametteLRev'))
        replacementList = replacementList.concat(this.#uniqueMatchesToCiteList(searchEnvLRev, 'envLRev'))

        /** wrapping citations in hyperlink */
        replacementList.forEach(cite => {
            switch(cite.type) {
                case'case-COA':
                   cite.url = `https://scholar.google.com/scholar?hl=en&as_sdt=4%2C38&q=${cite.vol}+or+app+${cite.page}`
                    break
                case 'case-OSC':
                    cite.url = `https://scholar.google.com/scholar?hl=en&as_sdt=4%2C38&q=${cite.vol}+or+${cite.page}`
                    break
                case 'OrLRev':
                    cite.url = `https://scholar.google.com/scholar?hl=en&as_sdt=0%2C38&as_ylo=${Number(cite.year) - 1}&as_yhi=${Number(cite.year) + 1}&q=${cite.vol}+%22Or.+L.+Rev.%22+${cite.page}&btnG=`
                    break
                case 'willametteLRev':
                    cite.url = `https://scholar.google.com/scholar?hl=en&as_sdt=0%2C38&as_ylo=${Number(cite.year) - 1}&as_yhi=${Number(cite.year) + 1}&q=${cite.vol}+%22Willamette+L.+Rev.%7CJournal%22+${cite.page}&btnG=`
                    break
                case 'envLRev':
                    cite.url = `https://scholar.google.com/scholar?hl=en&as_sdt=0%2C38&as_ylo=${Number(cite.year) - 1}&as_yhi=${Number(cite.year) + 1}&q=${cite.vol}+%22Envtl.+L.%22+${cite.page}&btnG=`
                    break
                default:
                    cite.url = ''
            }
            this.cleanHtml = this.#anchorWrap(this.cleanHtml, cite.citation, cite.type, cite.url)
        })
    }

    /**takes in old text; uses regular expression to add anchor url & gives it <a> class;
     * returns updated text */
    #anchorWrap (
        /**@type {string} */ oldText,
        /** @type {string|RegExp} */ regExpToWrap,
        /**@type {string} */ anchorClass,
        /**@type {string} */ href
    ){
        // prevents "()" from being viewed as regExp groups by converting to "\(" or "\("
        let regExpToWrapCleaned = regExpToWrap.replace(/\(/g, '\\(').replace(/\)/g, '\\)')
        regExpToWrapCleaned = RegExp(regExpToWrapCleaned, 'g')
        //uses callback function on each match generates the full replacement piece
        return oldText.replace(regExpToWrapCleaned, (/** @type {string} */ match) => {
            return `<a class="${anchorClass}" href="${href}" rel="noopener">${match}</a>`
        })
    }

    /** finds only unique RegExp matches & convert to list of objects */
    #uniqueMatchesToCiteList (caseRegExpMatch, citeType) {
        let namesArray = []
        let citationList = []
        caseRegExpMatch.forEach(citation => {
            if (!namesArray.includes(citation[0])) {
                namesArray.push(citation[0])
                let newCitation = {
                    type : citeType,
                    citation : citation[0],
                    vol : citation[1],
                    page : citation[2],
                    year : citation[3]
                }
                citationList.push(newCitation)
            }
        })
        return [...citationList]
    }

        /** turns each html <span> into javascript object {'text': text} */
    #splitParagraphs() {
        let paraList = []
        const paragraphMatchList = [...this.cleanHtml.matchAll(/<span[^]*?>([^]*?)<\/span>/g)] // $1: paragraph body
        if (!paragraphMatchList || !paragraphMatchList.length > 0) {
            warnBG('Annotations file is empty or broken', "annotations.js", "splitParagraphs")
        } else {
            paragraphMatchList.forEach(match => {
                paraList.push(match[1].trim())
            })
        }
        return paraList
    }
}

class AnnoParent {
    constructor (chapterNo) {
        this.chapterNo = chapterNo
        this.sectionList = []
        this.buildNewSection('Chapter')
    }

    buildNewSection(ors) {
        let newSection = new AnnoSection(ors)
        this.sectionList.push(newSection)
        this.currentSection = newSection
    }

    /** removes grandchildren without lists, children without grandchildren and current items */
    cleanup() {
        this.orsList = []
        this.sectionList.forEach(child => {
            child.subheadingsList.forEach(grandChild => {
                if (grandChild.childrenList.length < 1) {
//                    child.deleteChild(grandChild) depreciating for now
                }
            })
            if (child.subheadingsList.length < 1) {
                this.sectionList = this.sectionList.filter(item =>
                    item !== child
                )
                infoAnnos(`Deleting '${child.ors}' from Anno List`, 'AnnoParent.cleanup()')
            } else {
                delete child.currentSubHead
            }

        })
        delete this.currentSection
    }
}
class AnnoSection {
    constructor(orSection) {
        this.ors = orSection
        this.subheadingsList = []
        if (orSection == 'chapter') {
            this.buildSubHead('chapter', `Chapter ${parent.chapterNo}`)
        }
    }

    buildSubHead(title) {
        const newSubHead = new AnnoSubHead(title)
        this.subheadingsList.push(newSubHead)
        this.currentSubHead = newSubHead
    }
}

class AnnoSubHead {
    constructor(title) {
        this.subHeadTitle = title
        this.childrenList = []
    }
}

//GLOBAL CONSTANTS FOR ANNO HANDLER
let annoFetchDoneResolution

const infoAnnos = (info, script) => {
    infoBG(info, 'annotations.js', script, '#9df') // light blue
}

// building promise for annoFetchDoneResolution to signal promise fulfilled
let hasAnnoFinished = new Promise ((resolve) => {
    annoFetchDoneResolution = resolve
})

// annoCollection will eventually be passed from background to content script
let annoCollection

/** Starts getting Annos (will not be done by time rest of script runs) from msgListenerBG.js */
const startAnnoRetrieval = async (chapterNo) => {
    annoCollection = new AnnoParent(chapterNo)
    infoAnnos(`Fetching annotations for chapter ${chapterNo}`, 'startAnnoRetrieval')
    if (!orsRegExp.test(chapterNo)) {
        warnBG(`Can't find '${chapterNo}' anywhere in annotation section`, 'annotations.js', 'validateAndCleanChapter')
        return
    }
    const url = `https://www.oregonlegislature.gov/bills_laws/ors/ano00${chapterNo}.html`.replace(/0*(\d{3})/, '$1')
    let cleanedAnno = new AnnoCleaner(chapterNo, await getTextFromHtml(url, 'windows-1251'))  // webResources.js
    infoAnnos(`Retrieved annotations text from ${url}`, '#fetchData')
    /** classifying each existing anno entry and adding as object property */
    const seriesRegExp = RegExp(`${chapterNo}\\.\\d{3,4}\\sto\\s${chapterNo}\\.\\d{3,4}`)
    const secRegExp = RegExp(`^${tabRegExp}?${chapterNo}\\.\\d{3,4}`)
    cleanedAnno.rawParaList.forEach(annoParaTxt => {
        if (seriesRegExp.test.annoParaTxt) {    // series subheading
            annoCollection.currentSection.buildSubHead(`Series ' ${annoParaTxt}`)
            return
        }
        if (secRegExp.test(annoParaTxt)) {  // new sections
            annoCollection.buildNewSection(annoParaTxt.match(secRegExp)[0])
            return
        }
        if (RegExp(`NOTES? OF DECISION`).test(annoParaTxt)) {       // other subheadings
            annoCollection.currentSection.buildSubHead(annoParaTxt)
            return
        }
        if (    // skipable content
            (annoParaTxt.length < 1) ||
            (RegExp(`^${tabRegExp}$`).test(annoParaTxt)) ||
            (RegExp(`^${tabRegExp}Chapter\\s0*${chapterNo}`).test(annoParaTxt)) // may have leading zeros
        ){
            return
        }
        if (RegExp('^<b>([^]*)</b>$').test(annoParaTxt)) {
            annoCollection.currentSection.buildSubHead(`${annoParaTxt}`)
            return
        }
        // default
        try {
            annoCollection.currentSection.currentSubHead.childrenList.push(annoParaTxt)
        } catch (e) {
            infoAnnos(`No subhead found for '${annoParaTxt}' building dummy subhead in ${annoCollection.currentSection.ors}.`, 'rawParaList(callback)')
            annoCollection.currentSection.buildSubHead(" ")
            annoCollection.currentSection.currentSubHead.childrenList.push(annoParaTxt)
        }
    })
    annoCollection.cleanup()
    annoFetchDoneResolution()
}

/** Finishes getting Annos, returns list of section Objects {name; type; children:{text}}; from msgListenerBG.js */
const finishAnnoRetrieval = async () => {
    infoAnnos(`Awaiting download & initial parsing`, 'finishAnnoRetrieval')
    try {
        await hasAnnoFinished
        const sendObject = annoCollection.sectionList
        infoAnnos(`Finished anno pre-processing. Sending '${JSON.stringify(sendObject).slice(0,100)}' to content.`, 'finishAnnoRetrieval')
        return sendObject // sent to enhanceSecs.js -> getAnnoList()
    } catch (error) {
        warnBG(`Retrieving annotations failed with error: ${error}`, 'annotations.js', 'finishAnnoRetrieval')
    }
}
