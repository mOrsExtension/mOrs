//firstClean.js

const firstClean = async (bodyNode) => {
    let bodyHtml = await(errataFixes(bodyNode.innerHTML))
    bodyHtml = regExpCleanUp(bodyHtml)
    bodyNode.innerHTML = wrapAnchorText(bodyHtml)
    bodyNode = removeSpanStyles(bodyNode)
    return removeAttributesAndStylesFromPElems(bodyNode)
}

const regExpCleanUp = bodyHTML => {
    const /** @type {[RegExp|String, String][]} */ cleanUpList = [
        [/(\n|\r|\f|\s\s)+/, ' '], // removes line breaks, double spaces
        [/\s\s+/, ' '], // removes left over double spaces ('done twice to deal with odd number of spaces >2)
        [/<div[^>]*>/, ''], // remove opening divs
        [/<\/div>/, ''], // remove closing divs
        [/\[(19\d{2}|20\d{2}|Sub|For|Re|Am)/, '</p><p class="default">[$1'], // new paragraph for source notes
        [/<\/b>/, '</b></p><p class="default">'] // new paragraph after bold text ends
    ]
    cleanUpList.forEach(([toReplace, replaceWith]) => {
        bodyHTML = new RegExpHandler(toReplace).replaceAll(bodyHTML, replaceWith )
    })
    return bodyHTML
}

const wrapAnchorText = bodyHTML => {
    bodyHTML = anchorWrap(
        /**add links for ORS chapter references (class="orsLink") */
        bodyHTML,
        /\b[1-9]\d{0,2}[A-C]?\b\.(\d{3}\b|\b7\dA?\.\d{4})\b/,
        'orsLink'
    )
    bodyHTML = anchorWrap(
        /**add links for "Preface to ORS text" (class='preface') */
        bodyHTML,
        /Preface\sto\sOregon\sRevised\sStatutes/,
        'preface'
    )
    bodyHTML = anchorWrap(
        /**and links for comparative section table references (class =' cst') */
        bodyHTML,
        /(\d{4}\sComparative\sSection\sTable\slocated\sin\sVolume\s22)/,
        'cst'
    )
    bodyHTML = anchorWrap(
        //builds links for session laws in source notes
        bodyHTML,
        /((?:20|19)\d{2})(?:\W*s\.s\.\d?)?\W*c\.\W*(\d+)/, // ("e.g. 2015 c.218"; "1996 s.s.1 c.3"; "1974 s.s. c.24")
        'sessionLaw'
    )
    bodyHTML = anchorWrap(
        // builds links for session laws references in text
        bodyHTML,
        // (e.g. Chapter 28, Oregon Laws 2015, or "chapter 3, Oregon Laws 2020 (first special session)."
        /(?:C|c)hapter\s(\d{1,4}),\sOregon\sLaws\s((?:20|19)\d{2})(\s\(\w+\sspecial\ssession\))?/,
        'sessionLaw'
    )
    return bodyHTML
}
/**wraps text found by regular expression in an anchor & gives it <a> class
* @param {string} oldText
* @param {RegExp|string} regExWrap
* @param {string} anchorClass */
const anchorWrap = (oldText, regExWrap, anchorClass) => {
    // uses RegExp.replace(callback to use matches to generate replacement piece)
    return oldText.replace(RegExp(regExWrap, 'g'), (/** @type {string} */ match) => {
        return `<a class="${anchorClass}">${match}</a>`
    })
}

const removeSpanStyles = (/**@type {HTMLElement}*/ docBody) => {
    const spanElements = docBody.querySelectorAll('span[style]')
    spanElements.forEach(aSpan => {
        const spanParent = aSpan.parentElement
        while (aSpan.firstChild) {
            spanParent.insertBefore(aSpan.firstChild, aSpan)
        }
        spanParent.removeChild(aSpan)
    })
    return docBody
}

const removeAttributesAndStylesFromPElems = (/**@type {HTMLElement}*/ docBody) => {
    docBody.querySelectorAll('p').forEach(pElem => {
        pElem.removeAttribute('style') // remove all style elements
        pElem.removeAttribute('align') // remove all align elements
        pElem.className = 'default' // Reclassify all <p> elements to "default"
        if (!/[\S]+/.test(pElem?.textContent)) {pElem.remove()} //delete paragraphs without text
    })
    return docBody
}

/** Returns string of text with errata replaced per errataList.json
* and global RegExp cleanup & wrapping of anchors (links) */
const errataFixes = async (/**@type {String}*/ bodyHtml) => {
    /**returns errataList from JSON file /data/errataList.json as {key:value} object*/
    const promiseErrataList = await (async () => {
        try {
            return await sendAwait({'fetchJson':'ErrataList'})
        } catch (e) {
            warnCS(e)
            return bodyHtml
        }
   })()

   // After awaiting the retrieval of list, iterate through it and make each regExp change to text
   const errataList = await promiseErrataList
    for (var key in errataList) {
        bodyHtml = new RegExpHandler(errataList[key]['old'], '').replacePerFlags(
            bodyHtml,
            errataList[key]['new']
        )
    }
   return bodyHtml
}