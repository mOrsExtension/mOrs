//storedData.js

const implementUserParameters = async () => {

    /** returns promise to take in a command and executes function if true (or false if any)
     * @param {string} dataRequest
     * @param {any} responsiveFunction */
    const getInformation = async (dataRequest, responsiveFunction) => {
        try {
            const response = await sendAwait({'getStorage': dataRequest})
            const isReturnTrue = response[dataRequest]
            infoCS(
                `Response to '${dataRequest}'='${isReturnTrue}'`,
                'storedData.js',
                'getInformation'
            )
            responsiveFunction(isReturnTrue)
        } catch (e) {
            warnCS(
                `Error seeking response to '${dataRequest}': ${e}`,
                'storedData.js',
                'getInformation'
            )
        }
    }

    // MAIN Implement User Parameters
    await getInformation('collapseDefaultStored', doCollapse => {
        doCollapse ? collapseAllSections() : expandAllSections() // in helper.js
    })
    await getInformation('showFullWidth', isTrue => {
        setFullWidth(isTrue) // in helper.js
    })
    await getInformation('doShowBurnt', doShow => {
        showBurnt(doShow) // in helper.js
    })
    await getInformation('showSNsStored', isTrue => {
        showSourceNotes(isTrue) //  in helper.js
    })
    await getInformation('showMenuStored', isTrue => {
        showMenu(isTrue) // in helper.js
    })
    await getInformation('showNavStored', isTrue => {
        showVolumeOutline(isTrue) // in helper.js
    })
    return true
}

/** determines section from url (based on #xxx) */
/** scroll to html id tag in url, if any */
const navigateToTag = async () => {
    let navToTag = new urlHandler (window.location.toString())
    if (navToTag.hasTarget) {
//        await newDelay(100) // delay in milliseconds before starting scroll. Seems to reduce issues with scrolling and then needing html redrawn.
        navToTag.scrollToTarget()
    }
}
const newDelay = async (msecs) => {
    setTimeout(() => {return true}, msecs)
}

    /** Takes in ors URL and if there's a #tag that can be found on page, scrolls browser to it) */
    class urlHandler {
    constructor (fullUrl) {
        this.url = fullUrl
        this.idFinder =  /(?:\.html\#)([^\/]*)/
        this.hasTarget = this.idFinder.test(fullUrl)
        if (this.hasTarget) {
            this.getUpperTargetString()
            this.setDocElement()
        }
    }
    getUpperTargetString () {
        try {
            let id = this.idFinder.exec(this.url)  //TODO - could maybe use RegExpHandler instead?
            if (id !=null && id[1] !=null) {
                this.targetIdString = id[1].toUpperCase()
            }
        } catch (error) {
            warnCS(error)
            this.hasTarget = false
        }
    }
    setDocElement() {
        let elem = document.getElementById(this.targetIdString)
        if (elem != null) {
            this.targetDocElement = elem
        } else {
            this.hasTarget = false
        }
    }

    async scrollToTarget() {
        if (!this.hasTarget || this.targetDocElement == null) {
            return
        }
        infoCS(`navigating to '${this.targetIdString}'`, 'userData.js', 'urlHandler/scrollToTarget')
        this.targetDocElement.scrollIntoView()
        this.expandTarget ()
    }

    expandTarget () {
        try {
            expandSingle(this.targetDocElement) // helper.js - expands the section if collapsed
        } catch (error) {
            warnCS(error, "userData.js", "navigateToTag")
        }
    }
}

/**replaces part of stylesheet - called on launch or on msg from popup.js or options.js when user data changes re: stylesheet */
const userStylesRefresh = async () => {
    const theRootStyle = document.documentElement.style
    try {
        const replacementSheet = await sendAwait({miscTask: 'buildColorData'}) // calls /background/style.js
        for (let key in replacementSheet) {
            theRootStyle.setProperty(`--${key}`, replacementSheet[key])
        }
        infoCS(
            `Added user css properties to stylesheet: ${JSON.stringify(replacementSheet)}`,
            'userData.js',
            'userStylesRefresh'
        )
    } catch (e) {
        warnCS(
            `Error applying stylesheet ${e}.`,
            'userData.js',
            'userStylesRefresh'
        )
    }
}