//mORS.js

const runMain = async () => {
  let docBody = document.createElement("body");
  docBody.innerHTML = document.body.innerHTML;
  Array.from(document.body.attributes).forEach((attr) => {
    docBody.setAttribute(attr.name, attr.value);
  });
  docBody = await firstClean(docBody);
  const extractHeadingInfo = extractChapterInfo(docBody); // buildHeading.js
  addToHead(); // buildHeading.js
  sendAwait({ startAnnos: chapterInfo.chapNo }, false); // open annos page in background, don't await response or completion
  docBody = extractHeadingInfo.bodyComponent; // firstClean.js
  const tocDiv = chapterInfo.isFormerProvisions ? null : buildTOC(docBody); // buildTOC.js - not needed if former provisions section
  let mainDiv = document.createElement("div"); // moving remaining body into its own separate "main" div
  mainDiv.id = "main";
  mainDiv.innerHTML = docBody.innerHTML;
  mainDiv = bodyCleanUp(mainDiv); // bodyClean.js
  mainDiv = buildBodyDivs(mainDiv); // createDivs.js
  const headingDiv = await buildHeading();
  const finishedPromises = await Promise.all([
    buildFloatingMenuDiv(), // newDivs.js building floating menu
    VolNavConstructor.buildDiv(), //newDivs.js building new menu for navigating through volumes
    newOrUpdateOrLawLinks(mainDiv), //buildOrLawLinks.js adds links for session laws
  ]);
  const floatMenuDiv = finishedPromises[0];
  const volumeNav = finishedPromises[1];
  mainDiv = finishedPromises[2]; // orLawLink.js : add links for OrLaws based on \data\orLawLegLookup.json
  finalCleanUp([headingDiv, volumeNav, tocDiv, mainDiv, floatMenuDiv]); // finalClean.js : puts together pieces, does post html rendering cleanup
  await sectionAdjustments(); // enhancements.js : add buttons for collapsable sections; add annos; adds ids expanding links & button listeners
  await startObserver(6);
  scrollToTag(); // userData.js : scroll to tag (#) in url, if any
};

//Startup
window.addEventListener("load", () => {
  infoCS(
    "Finished loading page html. Content scripts beginning.",
    "helpChrome.js",
    "on 'load'"
  );
  userStylesRefresh(); // stylesheet.js
  implementUserParameters(); // userData
  runMain(); // mORS.js (above) - implements changes to page
  listenToPopup(); // addListeners.js - prepare to receive messages from popup.js's sendMsgToOrsTabs (or options.js)
});
