//mORS.js

const runMain = async () => {
  let docBody = document.createElement("body");
  docBody.innerHTML = document.body.innerHTML;
  Array.from(document.body.attributes).forEach((attr) => {
    docBody.setAttribute(attr.name, attr.value);
  });
  docBody = await firstClean(docBody); // firstclean.js
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
    displayOrLaws(mainDiv), //buildOrLawLinks.js adds links for session laws
  ]);
  const floatMenuDiv = finishedPromises[0];
  const volumeNav = finishedPromises[1];
  mainDiv = finishedPromises[2]; // orLawLink.js : add links for OrLaws based on \data\orLawLegLookup.json
  await sectionAdjustments(mainDiv); // enhancements.js : add buttons for collapsable sections; add annos; adds ids expanding links & button listeners
  finalCleanUp([headingDiv, volumeNav, tocDiv, mainDiv, floatMenuDiv]); // finalClean.js : puts together pieces, does post html rendering cleanup
};

//Startup
window.addEventListener("load", async () => {
  infoCS(
    "Finished loading page html. Content scripts beginning.",
    "helpChrome.js",
    "on 'load'"
  );
  getAndUseData("doShowVerbose", showVerbose);
  userStylesRefresh(); // stylesheet.js
  await runMain(); // mORS.js (above) - implements changes to page
  await userData(); // userData
  // await startObserver(6); Depreciating temporarily to see if new awaits fix issue
  scrollToTag(); // userData.js : scroll to tag (#) in url, if any
  listenToPopup(); // addListeners.js - prepare to receive messages from popup.js's sendMsgToOrsTabs (or options.js)
});
