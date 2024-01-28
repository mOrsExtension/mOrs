//@ts-check
//mORS.js

const runMain = async () => {
   let docBody = document.body.cloneNode(true)
   docBody = await firstClean(docBody)
   const extractHeadingInfo = extractChapterInfo(docBody) // buildHeading.js
   addToHead() // buildHeading.js
   callStartAnnos() // buildHeading.js
   docBody = extractHeadingInfo.bodyComponent // firstClean.js
   const tocDiv = (chapterInfo.isFormerProvisions) ? null : buildTOC(docBody) // buildTOC.js - not needed if former provisions section
   let mainDiv = document.createElement('div') // moving remaining body into its own separate "main" div
   mainDiv.id = 'main'
   mainDiv.innerHTML = docBody.innerHTML
   mainDiv = bodyCleanUp(mainDiv) // bodyclean.js
   mainDiv = buildBodyDivs(mainDiv) // createDivs.js
   const finishedPromiseList = await Promise.all([
      buildFloatingMenuDiv(), // newDivs.js building floating menu
      VolNavConstructor.buildDiv(), //newDivs.js building new menu for navigating through volumes
      newOrUpdateOrLawLinks(mainDiv),
      buildHeading()
   ])
   const floatMenuDiv = finishedPromiseList[0]
   const volumeNav = finishedPromiseList[1]
   mainDiv = finishedPromiseList[2] // orLawLink.js : add links for OrLaws based on \data\orLawLegLookup.json
   const headingDiv = finishedPromiseList[3] // heading.js based on \data\volumeOutline.json
   finalCleanUp([headingDiv, volumeNav, tocDiv, mainDiv, floatMenuDiv]) // finalClean.js : puts together pieces, does post html rendering cleanup
   sectionAdjustments() // buttons.js : add buttons for collapsable sections, expanding links & button listeners

   //TODO #34 Move implementing user parameters to earlier in process to avoid issues with scroll stops in the wrong place?
   if (await implementUserParameters()) { // storedData.js : implement remaining stored data (other than OrLaw lookup/menu)
      navigateToTag() // navToTag.js : navigate to tag (#) in url, if any
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
