//buildTOC.js

/** Returns Div of table of contents, formatted */
const buildTOC = (/**@type {HTMLBodyElement}*/ docBody) => {
    const tocDiv = document.createElement('div')
    tocDiv.id = 'toc'
    //heading
    const h1 = document.createElement('h1')
    tocDiv.appendChild(h1)
    h1.innerText = 'Table of Contents'
    //content
    const tocBody = document.createElement('div')
    tocDiv.appendChild(tocBody)
    tocBody.className = 'content'

    // Identifying where TOC ends and body begins
    let notDone = true
    const pElements = docBody.querySelectorAll('p')
        pElements.forEach((aPara, index) => {
        if (notDone) {
            if (/<b>/.test(aPara.innerHTML)) {
                // bold text indicates ORS section, note, or repealed/renumbered sec
                infoCS(
                `TOC ended with bold at paragraph # ${index}: ${aPara.textContent}`,
                'toc.js',
                'buildTOC'
                )
                notDone = false
            }
            if (index > 0 && pElements[0].textContent == aPara.textContent) {
                //repeated text indicates a heading
                infoCS(
                `TOC ended with repeated paragraph # ${index}: ${aPara.textContent}`,
                'toc.js',
                'buildTOC'
                )
                notDone = false
            }
            // otherwise, pull the paragraph out of the body and into the TOC
            if (notDone) {tocBody.appendChild(aPara)}
        }
    }) // and repeat

    // identifying components of TOC
    tocBody.querySelectorAll('p').forEach(aPara => {
        const paraText = aPara.innerHTML
        /** "(Temporary provisions ...) */
        if (/^\(Temporary\sprovisions/.test(paraText)) {
            aPara.className = 'tempHead'
        } else if
        /** Leading parens with at least 4 characters (E.g. "(Disputes)" */
        (/^\([^/(\\[^]{4,}\)/.test(paraText)) {
            aPara.className = 'subHead'
        } else if
        /**  Heading (4+ non-lower case letters) (E.g., "PENALTIES") */
        (/^[^a-z(_]{4,}/.test(paraText)) {
            aPara.className = 'head'
        }
        aPara.classList.add('toc')
    })
    return tocDiv
}
