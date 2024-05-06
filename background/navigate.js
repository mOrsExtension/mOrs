//background/navigate.js

/** constants for OrsSearch*/
const errorUrl = 'https://github.com/mOrsExtension/mOrs/blob/master/mORSerror.md'  // TODO #2 create wiki and link to specific page on navigation error
//const orsRegExp = /\b0*([1-9]\d{0,2}[a-c]?)(\.\d{3,4})?/ // finds "chapter" or "chapter.section", e.g. "459A"
const yearRegExp = /\b(?:19|20)\d{2,}\b/
const chpRegExp = /(?:-|(?:19|20)\d{2}\s|c\.\s?)([1-9]\d{0,3}\b)/

class OrsSearch {
    constructor(searchString) {
        this.search = searchString
        this.isOrLaw = this.setIsOrLaw()
    }
    setIsOrLaw() {
        return Boolean(yearRegExp.test(this.search) && chpRegExp.test(this.search))
    }

    setOrsUrl() {
        this.url = this.getOrsUrl()
    }
    getOrsUrl() {
        this.isOrs = orsRegExp.test(this.search)
        if (!this.isOrs) {
            infoNav('Invalid search: ${this.search}; sending user to help page', 'getOrsUrl')
            return errorUrl
        }
        let orsUrl = this.search.replace(orsRegExp, '00$1.html#$&') // add more than enough zeros
        orsUrl = orsUrl.replace(/^0{1,2}(\d{3})/, '$1') // trim any excess leading 0s to 3 digits

        infoNav(`Creating new ORS tab for '${orsUrl}'`, 'getOrsUrl')
        return `https://www.oregonlegislature.gov/bills_laws/ors/ors${orsUrl}`
    }

    async getOrLawUrl () {
        let year = this.search.match(yearRegExp)[0]
        let chapter = this.search.match(chpRegExp)[1]
        let orLawReader = await this.getOrLawReader(year)
        let specialSession = ((orLawReader!='hein') ? this.getSpecialSession() : null)
        let newOrLawRequest = new OrLawRequest(year, chapter, specialSession, orLawReader)
        newOrLawRequest.validateData()
        if (newOrLawRequest.isValidated) {
            newOrLawRequest.getOrLawUrl
            this.url = await newOrLawRequest.getOrLawUrl()
        } else {
            this.url = errorUrl
        }
    }
    async getOrLawReader (year) {
        if (/hein/.test(this.search)) {
            return 'Hein'
        }
        if (/ore?(\s?|\.)*leg/.test(this.search)) {
            return 'OrLeg'
        }
        const reader = await promiseGetFromStorage('lawsReaderStored') // userStorage.js - if user didn't request reader, use stored default
        if (reader == 'Hein' || reader == 'OrLeg') {
            return reader
        }
        return (year > 1998 ? 'OrLeg' : 'Hein') // or pick one based on year
    }
    getSpecialSession() {
        const specialSessionSearch = /s\.?s\.?\s?(\d)\s?/
        if (specialSessionSearch.test(this.search)) {
            return this.search.match(specialSessionSearch)[0]
        } else {
            return null
        }
    }

    execute() {
        infoNav(`Launching new tab to: ${this.url}`, 'newUrlTab')
        browser.tabs.create({url: this.url})
    }
}


class OrLawRequest {
    constructor(year, chapter, specialSession = null, reader='OrLeg') {
        this.year = year
        this.chapter = chapter
        this.isOrLeg = (reader.toLowerCase() != 'hein') // unless hein is requested, default to OrLeg reader
        this.hasSpecialSession = (specialSession != null && this.isOrLeg) // not keeping special session data if HeinOnline
        if (this.hasSpecialSession) {
            this.specialSes = specialSession
        }
    }

    validateData () {
        this.errorLog = this.returnDataErrors()
        if (this.errorLog.length < 1) {
            this.isValidated = true
        } else {
            warnBG(this.errorLog, 'navigate.js', 'OrLawRequest.validateData()')
        }
    }
    returnDataErrors() {
        let errMsg = []
        errMsg.push(this.yearErrors())
        errMsg.push(this.chapErrors())
        if (this.hasSpecialSession)
        errMsg.push(this.ssErrors())
        return errMsg.filter(exists=>{exists}).join('/n') // I'm not quite sure what I'm doing with the error handling. It doesn't really get back to user in any way at this point.
    }
    yearErrors() {
        if (typeof(this.year) != "number") {
            return `Year must be a number. '${this.year}' is not a number.`
        }
        if (!Number.isInteger(this.year)) {
            return `Year must be a whole number. '${this.year}' is not an integer.`
        }
        const minYear = this.isOrLeg ? 1999 : 1859
        if (this.year < minYear) {
            return `${(this.isOrLeg ? 'Legislature website' : 'HeinOnline')} does not have Oregon Law records pre-${minYear}. '${this.year}' is too early.`
        }
        if (this.year > new Date().getFullYear()){
            return `It is not yet the year '${this.year}'`
        }
    }
    chapErrors() {
        if (typeof(this.chapter) != "number") {
            return `Chapter must be a number. '${this.chapter}' is not a number.`
        }
        if (!Number.isInteger(this.chapter) || this.chapter < 0) {
            return `Chapter must be a positive whole number. '${this.chapter}' is not a positive integer.`
        }
        if (this.chapter > 2000) {
            return `Chapter must be a possible Oregon Laws chapter number below 2000. ${this.chapter} is too high.`
        }
    }
    ssErrors() {
        if (typeof(this.specialSes) != "number") {
            return `A special session must be a number. '${this.specialSes}' is not a number.`
        }
        if (!Number.isInteger(this.specialSes) || this.specialSes < 0) {
            return `A special session must be a positive whole number. '${this.specialSes}' is not a positive integer.`
        }
        if (this.chapter > 5) {
            return `Chapter must be a possible special session number below 5. ${this.specialSes} is too high.`
        }
    }

    async getOrLawUrl () {
        if (!this.isValidated) {
            return ''
        }
        return this.isOrLeg ? this.heinUrl() : await this.orLegUrl()
    }

    heinUrl () {
        return `https://heinonline-org.soll.idm.oclc.org/HOL/SSLSearchCitation?journal=ssor&yearhi=${this.year}&chapter=${this.chapter}&sgo=Search&collection=ssl&search=go`
    }

    async orLegUrl () {
        const orLawOrLegLookup = await promiseReadJsonFile('orLawLegLookup.json') // pulls in data from /data/orLawLegLookup.json
        if (this.hasSpecialSession) {
            this.year += ` s.s.${this.specialSes}`
        }
        if (orLawOrLegLookup[this.year] != undefined) {
            let orLawFileName = orLawOrLegLookup[this.year].replace(/~/, '000' + this.chapter) // creates url suffix
            /*removes extra zeros from url suffix*/
            orLawFileName = orLawFileName.replace(
                /([^]*?\w)0*(\d{4}(?:\.|\w)*)/,
                '$1$2'
            )
            return `https://www.oregonlegislature.gov/bills_laws/lawsstatutes/${orLawFileName}`
        } else {
            warnBG(`Cannot find [${this.year}] in ORS lookup.`, 'navigate.js', 'OrLawRequest.orLegUrl')
            return ''
        }
    }
}


//logs message to background service worker
const infoNav = (info, functionName) => {
    infoBG(info, 'navigate.js', functionName, 'yellowgreen')
}

/**sets up browser to listen for text entered after "ORS " in (chrome?) omnibox */
browser.omnibox.onInputEntered.addListener(async omniString => {
    infoNav('Executed search from omnibox', 'omniBox.addListener()')
    buildAndNavigateToUrls(omniString)
})

// takes in search string, opens a new tab for each unique search
const buildAndNavigateToUrls = searchString => {
    const cleanText = sanitize(searchString)
    infoNav(`Received search request: ${cleanText}`, 'buildAndNavigateToUrls')
    let listOfSearches = searchString.split('|')
    infoNav(`Received ${listOfSearches.length} search request(s): ${listOfSearches}`, 'buildAndNavigateToUrls')
    listOfSearches.forEach(aSearch => {
        const search = new OrsSearch(aSearch)
        search.isOrLaw ? search.getOrLawUrl() : search.setOrsUrl()
        if (search.url && search.url?.length > 0) {
            search.execute()
        } else {
            warnBG(`URL is ${search.url}; something's wrong.`)
        }
    })
}

/** removes characters other than letters, numbers, hyphen, period and pipe | from user input to prevent accidental (or malicious) code injection; Lowercases text.
* @param {string} userText */
const sanitize = userText => {
    return userText.replace(/[-\(\)\{\}\]\[,`~$%#@!^&*_\+="'?\<\>;]/g, '|').toLowerCase()
}