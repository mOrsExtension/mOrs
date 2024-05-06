//mORS.js

const runMain = async () => {
    let docBody = document.body.cloneNode(true)
    docBody = await firstClean(docBody)
    const extractHeadingInfo = extractChapterInfo(docBody) // buildHeading.js
    console.log(`****${chapterInfo.titleNo}`)
    addToHead() // buildHeading.js
    sendAwait({startAnnos: chapterInfo.chapNo}, false) // launch in background
    docBody = extractHeadingInfo.bodyComponent // firstClean.js
    const tocDiv = (chapterInfo.isFormerProvisions) ? null : buildTOC(docBody) // buildTOC.js - not needed if former provisions section
    let mainDiv = document.createElement('div') // moving remaining body into its own separate "main" div
    mainDiv.id = 'main'
    mainDiv.innerHTML = docBody.innerHTML
    mainDiv = bodyCleanUp(mainDiv) // bodyClean.js
    mainDiv = buildBodyDivs(mainDiv) // createDivs.js
    const navConstructor = new VolNavConstructor() ***NEED TO BUILD HEADING FIRST, OR NO TITLE INFO USED
    const volumeNav = await navConstructor.init() //newDivs.js building new menu for navigating through volumes
    console.log(volumeNav)
    const finishedPromiseList = await Promise.all([
        buildFloatingMenuDiv(), // newDivs.js building floating menu
        newOrUpdateOrLawLinks(mainDiv), //buildOrLawLinks.js adds links for session laws
        buildHeading(),
    ])
    const floatMenuDiv = finishedPromiseList[0]
    //const volumeNav = finishedPromiseList[1]
    mainDiv = finishedPromiseList[1] // orLawLink.js : add links for OrLaws based on \data\orLawLegLookup.json
    const headingDiv = finishedPromiseList[2] // heading.js based on \data\volumeOutline.json
    finalCleanUp([headingDiv, volumeNav, tocDiv, mainDiv, floatMenuDiv]) // finalClean.js : puts together pieces, does post html rendering cleanup
    sectionAdjustments() // buttons.js : add buttons for collapsable sections, expanding links & button listeners
    if (await implementUserParameters()) { // userData.js : implement remaining stored data (other than OrLaw lookup/menu)
        navigateToTag() // navigate.js : navigate to tag (#) in url, if any
    }
}

//Startup
window.addEventListener('load', () => {
    infoCS(
        'Finished loading page html. Content scripts beginning.',
        'helpChrome.js',
        "on 'load'"
    )
    userStylesRefresh() // stylesheet.js
    runMain() // mORS.js (above) - implements changes to page
    listenToPopup() // addListeners.js - prepare to receive messages from popup.js's sendMsgToOrsTabs (or options.js)
})
