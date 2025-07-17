//storedData.js

const infoStoredData = (infoMsg, functionName) => {
    infoCS(infoMsg, `storedData.js`, functionName, '#dd44ff')
}

//TODO: #95 Make into object, retrieve items as list, begin before page load completed.
const implementUserParameters = async () => {

    /** returns promise to take in a command and executes function if true (or false if any)
     * @param {string} dataRequest
     * @param {any} responsiveFunction */
    const getInformation = async (dataRequest, responsiveFunction) => {
        try {
            const response = await sendAwait({'getStorage': dataRequest})
            const isReturnTrue = response[dataRequest]
            infoStoredData(
                `Content script received response: '${dataRequest}'='${isReturnTrue}'`,
                'getInformation'
            )
            console.log(responsiveFunction)
            responsiveFunction(isReturnTrue)
        } catch (e) {
            warnCS(
                `Error with response to '${dataRequest}': ${e}`,
                'storedData.js',
                'getInformation'
            )
        }
    }

    // MAIN Implement User Parameters
    await getInformation('isCollapseDefault', doCollapse => {
        doCollapse ? collapseAllSections() : expandAllSections() // in helper.js
    })
    await getInformation('doShowFullWidth', isTrue => {
        setFullWidth(isTrue) // in helper.js
    })
    await getInformation('doShowBurnt', doShow => {
        showBurnt(doShow) // in helper.js
    })
    await getInformation('doShowSourceNotes', isTrue => {
        showSourceNotes(isTrue) //  in helper.js
    })
    await getInformation('doShowMenu', isTrue => {
        showMenu(isTrue) // in helper.js
    })
    await getInformation('doShowVolNav', isTrue => {
        showVolumeOutline(isTrue) // in helper.js
    })
    await getInformation('doShowTOC', isTrue => {
        showTOC(isTrue) // in helper.js
    })
    await getInformation('doShowAnnos', isTrue => {
        showAnnos(isTrue) // in helper.js
    })
    return true
}

/** determines section from url (based on #xxx) */
/** scroll to html id tag in url, if any */
const scrollToTag = async () => {
    let toTag = new tagFindAndSeek (window.location.toString())
    if (toTag.hasTarget) {
//        await newDelay(100) // delay in milliseconds before starting scroll. Seems to reduce issues with scrolling and then needing html redrawn.
        toTag.scrollToTarget()
    }
}
const newDelay = async (msecs) => {
    setTimeout(() => {return true}, msecs)
}

/** Takes in ors URL and if there's a #tag that can be found on page, scrolls browser to it) */
class tagFindAndSeek {
    constructor (fullUrl) {
        this.url = fullUrl
        this.urlRegExp = new RegExpHandler("(?:\\.html\\#)([^\\/]*)") // tag : $1
        if (this.urlRegExp.testMe(fullUrl)) {
            this.#getUpperTargetString()
            this.#setDocElement()
        }
    }
    #getUpperTargetString () {

        try {
            this.targetIdString = this.urlRegExp.firstMatchGroupNo(this.url, 1).toUpperCase()
            if (this.targetIdString.length > 0) {
                this.hasTarget = true
            }
        } catch (error) {
            warnCS(error)
            this.hasTarget = false
        }
    }

    #setDocElement() {
        let elem = document.getElementById(this.targetIdString)
        if (elem != null) {
            this.targetDocElement = elem
        } else {
            infoStoredData(`Could not find element with id = '#${this.targetIdString}' to scroll to.`, 'urlHandler/#setDocElement')
            this.hasTarget = false
        }
    }

    async scrollToTarget() {
        if (!this.hasTarget || this.targetDocElement == null) {
            return
        }
        infoStoredData(
            `Scrolling to element id = '#${this.targetIdString}'`,
            'urlHandler/scrollToTarget'
        )
        this.targetDocElement.scrollIntoView()
        this.#expandTarget ()
    }

    #expandTarget () {
        try {
            expandSingle(this.targetDocElement) // helper.js - expands the section if collapsed
        } catch (error) {
            warnCS(error, "userData.js", "tagFindAndSeek")
        }
    }
}

const buildColors = async () => {
    const theRootStyle = document.documentElement.style
    const replacementSheet = await sendAwait({miscTask: 'buildColorData'}) // calls /background/style.js
    for (let key in replacementSheet) {
        theRootStyle.setProperty(`--${key}`, replacementSheet[key])
    }
    infoStoredData(
        `Added user css properties to stylesheet: ${JSON.stringify(replacementSheet)}`,
        'buildColors'
    )
}

/**replaces part of stylesheet - called on launch or on msg from popup.js or options.js when user data changes re: stylesheet */
const userStylesRefresh = async () => {
    tryCatchWarnCS({          // nothing returned, no need to await...
        tryFunction : buildColors,
        warningMsg : `Error applying stylesheet from userData.js : buildColors`}
    )
}
