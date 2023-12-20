//@ts-check
//mORS.js

const runMain = async () => {
   let docBody = document.body.cloneNode(true)
   docBody = await firstClean(docBody)
   const extractHeadingInfo = stripInfo(docBody) // heading.js
   docBody = extractHeadingInfo.bodyComponent // firstClean.js
   const tocDiv = extractHeadingInfo.headData.isFormerProvisions
   ? null
   : buildTOC(docBody) // toc.js
   let mainDiv = document.createElement('div') // moving remaining body into its own separate "main" div
   mainDiv.id = 'main'
   mainDiv.innerHTML = docBody.innerHTML
   mainDiv = DomClean2(mainDiv) // bodyclean.js
   mainDiv = buildBodyDivs(mainDiv) // createDivs.js
   const floatMenuDiv = await buildFloatingMenuDiv() // newDivs.js building it even if user won't use it, because they can turn it on later
   const volumeNav = await buildVolumeNav() //newDivs.js building new menu for navigating through volumes
   mainDiv = await newOrUpdateOrLawLinks(mainDiv) // orLawLink.js : add links for OrLaws based on \data\orLawLegLookup.json
   const headingDiv = await buildHeading(extractHeadingInfo.headData) // heading.js based on \data\volumeOutline.json
   finalCleanUp([headingDiv, volumeNav, tocDiv, mainDiv, floatMenuDiv]) // finalClean.js : puts together pieces, does post html rendering cleanup
   addButtons() // buttons.js : add buttons for collapsable sections, expanding links & button listeners
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
