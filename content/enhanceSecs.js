//enhanceSecs.js
/* exported sectionAdjustments */
/* global chapterInfo, sendAwait, warnCS, diff_match_patch, RegExpHandler, expandSingle, infoCS */

let /** object created by /background/annotation.js;
{'Chapter XX : [annos] , 'xx.xxx' : [annos]} */ annoObject;
let annoUrl;
let orsList = []; // list of ORS sections with divs in order

/**main program: adds #ids; updates burnt sec text; appends annotations to sections; builds buttons to collapse secs
 * @param {HTMLDivElement} bodyDiv
 */

const sectionAdjustments = async (bodyDiv) => {
  bodyDiv.querySelectorAll("div.section").forEach((secDiv) => {
    // cycle through div w/ class of 'section'
    addIds(secDiv);
    labelBurnt(secDiv);
    addDiffButtons(secDiv);
  });
  annoUrl =
    `https://www.oregonlegislature.gov/bills_laws/ors/ano00${chapterInfo.chapNo}.html`.replace(
      /0+(\d{3})/,
      "$1"
    );
  annoObject = await getAnnoList(); // fetches annoObject from background

  /** builds each section div and adds it to the object*/
  await Promise.all(
    annoObject.map(async (section) => {
      section["div"] = await makeAnnoSectionDiv(section);
    })
  );

  if (orsList.includes("Whole ORS Chapter")) {
    // If it exists add to start of chapter text
    bodyDiv.prepend(annoObject[0].div);
  }
  bodyDiv.querySelectorAll("div.section").forEach((aDiv) => {
    // cycle through div w/ class of 'section'
    addAnnos(aDiv);
    addButtonsToSections(aDiv);
  });
  addCollapseToggleButtons();
  const links = splitInternalAndExternalLinks();
  links.externalOrs.forEach((aLink) => {
    aLink.classList.add("linkExt");
  });
  links.internalOrs.forEach((aLink) => {
    aLink.anchor.classList.add("linkInt");
    makeLinkExpandTarget(aLink);
  });
};

/* asks background service worker to retrieve annotations URL already preprocessed into list of javascript objects per section */
const getAnnoList = async () => {
  return await sendAwait({ miscTask: "finishAnnoRetrieval" });
};

/** Adds id# to guide expansion when internal links are used (in addCollapseButtons below) */
const addIds = (aDiv) => {
  if (aDiv.classList.contains("ors") || aDiv.classList.contains("burnt")) {
    const anchor = aDiv?.children[0]?.querySelector("a");
    if (anchor == null) {
      return;
    }
    aDiv.id = anchor.textContent?.trim(); // make the button id = the anchor text (its ORS #)
    const replText = document.createTextNode(anchor.textContent);
    aDiv.children[0].replaceChild(replText, anchor); // then remove the link (because it would just point to itself, pointlessly)
  }
};

/**labels burnt sections as former ORS provisions */
const labelBurnt = (aDiv) => {
  if (aDiv.classList.contains("burnt")) {
    aDiv.children[0].textContent = `[Former ORS ${aDiv.children[0].textContent}]`;
  }
};

/** @param {HTMLDivElement} aDiv */
const addDiffButtons = (aDiv) => {
  if (
    aDiv.classList.contains("priorAmend") ||
    aDiv.classList.contains("furtherAmend")
  ) {
    const mainORS = getPriorORS(aDiv);
    if (mainORS) {
      const compareDiv = document.createElement("details");
      compareDiv.classList.add("compare");
      const compareSummary = document.createElement("SUMMARY");
      compareSummary.textContent = "See changes from base ORS";
      const details = document.createElement("div");
      const acknowledgement = document.createElement("div");
      acknowledgement.classList.add("acknowledgement");
      acknowledgement.innerHTML = `<p>Comparison text generated with <a href="https://github.com/JackuB/diff-match-patch/">Diff-Match-Patch</a></p><p>(Apache License 2.0; Copyright Google Inc.)</p>`;

      details.innerHTML = makeCompareHtml(
        buildTextByParas(mainORS), // innerText preserves paragraph breaks; textContent doesn't
        buildTextByParas(aDiv)
      );
      compareDiv.appendChild(compareSummary);
      compareDiv.appendChild(details);
      compareDiv.appendChild(acknowledgement);
      compareDiv.coll;
      aDiv.appendChild(compareDiv);
    }
  }
};

/** Not sure why innerText didn't preserve paragraphs, but this will + screens out source notes & leadlines
 * @param {HTMLDivElement} aDiv */
const buildTextByParas = (aDiv) => {
  let /**@type {string} */ textString = "";
  aDiv
    .querySelectorAll("p:not(.sourceNote):not(.sectionStart)")
    .forEach((p) => {
      textString += p.textContent + "\n";
    });
  return textString;
};

const getPriorORS = (aDiv) => {
  const /** @type {HTMLElement} */ parent = aDiv.parentElement || null;
  let /** @type {HTMLElement} */ lastChild = parent.previousElementSibling;
  try {
    while (
      !lastChild.classList.contains("section") ||
      !lastChild.classList.contains("ors")
    ) {
      lastChild = lastChild.previousElementSibling;
    }
  } catch (error) {
    warnCS`No prior ORS section before ${aDiv.textContent.slice(0, 50)}. Error: ${error}`;
    return;
  }
  return lastChild;
};

const makeCompareHtml = (oldTxt, newTxt) => {
  const dmp = new diff_match_patch(); // from /diff-match-patch/diff_match_patch_uncompressed.js
  const diffs = dmp.diff_main(oldTxt, newTxt);
  dmp.diff_cleanupSemantic(diffs);
  let html = [];
  const swapPatterns = {
    "&amp": /&/g,
    "&lt": /</g,
    "&gt": />/g,
    "<br>&nbsp;&nbsp;": /\n/g,
  };
  const spanOptions = {
    0: `class="delete"`,
    1: "",
    2: `class="insert"`,
  };
  for (var x = 0; x < diffs.length; x++) {
    const operation = (diffs[x][0] + 1).toString(); // 0=DIFF_EQUAL, 1: INSERT or -1:DELETE)
    let /**@type {string} */ text = diffs[x][1]; // Text of change.
    for (const swap in swapPatterns) {
      text = text.replaceAll(swapPatterns[swap], swap);
    }
    for (const spanType in spanOptions) {
      if (spanType == operation) {
        html.push(`<span ${spanOptions[spanType]}>${text}</span>`);
        break;
      }
    }
  }
  return html.join("");
};

const addChildrenToDiv = (subHead) => {
  let childList = [];
  if (subHead.childrenList.length > 0) {
    subHead.childrenList.forEach((child) => {
      let listItem = document.createElement("li");
      listItem.innerHTML = child;
      childList.push(listItem);
    });
  }
  return childList;
};

/**returns annotation section div built by using "summary/detail" to create collapsing div;
 */
const makeAnnoSectionDiv = async (orSection) => {
  orsList.push(orSection.ors);
  const newDiv = document.createElement("div");
  newDiv.classList.add("annotations");
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.innerHTML = `<a href="${annoUrl}" class="annoHeading" rel="noopener">${orSection.ors} Annotations</a>`;
  newDiv.appendChild(details);
  details.appendChild(summary);
  if (orSection.subheadingsList.length > 0) {
    orSection.subheadingsList.forEach(async (subHead) => {
      const typePara = document.createElement("p");
      typePara.innerHTML = subHead.subHeadTitle;
      const uList = document.createElement("ul");
      details.appendChild(typePara);
      details.appendChild(uList);
      const addChildList = addChildrenToDiv(subHead);
      addChildList.forEach((kid) => {
        uList.appendChild(kid);
      });
    });
    return newDiv;
  }
};

/** adds section annotations div to the end of appropriate section div */
const addAnnos = async (aDiv) => {
  const orsPosition = orsList.indexOf(aDiv.id);
  if (orsPosition > -1) {
    aDiv.appendChild(annoObject[orsPosition].div);
  }
};

/** adds functionality to make section divs collapsible when clicking on heads  */
const addButtonsToSections = (aDiv) => {
  const newButton = document.createElement("button"); // creating button functionality for collapsible divs that will include the section head
  newButton.className = "collapser";
  const collapsibleDiv = document.createElement("div"); // creating collapsible div below button that will include section body
  collapsibleDiv.className = "collapsible";
  let childrenList = [...aDiv.children];
  childrenList.forEach((childOfDiv, index) => {
    if (index == 0) {
      newButton.appendChild(childOfDiv); // first line becomes the button
    } else {
      collapsibleDiv.appendChild(childOfDiv); // the rest go in the collapsible part of section
    }
  }); // forEach subUnit
  aDiv.appendChild(newButton); // adding button to current div
  aDiv.appendChild(collapsibleDiv); // and collapsible to current div
};

/** Adds functionality for each section leadline button to toggle expand/collapse following section */
const addCollapseToggleButtons = () => {
  document.querySelectorAll("button.collapser").forEach((buttonElement) => {
    buttonElement.addEventListener("click", () => {
      buttonElement.nextElementSibling.classList.toggle("invisibility");
    });
  });
};

/** cycles through each internal ORS link adds button element to force target to expand on click */
const splitInternalAndExternalLinks = () => {
  let externalOrs = [];
  let internalOrs = [];
  document.querySelectorAll("a.orsLink").forEach((aLink) => {
    let linkText = aLink.textContent;
    if (isInternalChapLink(linkText)) {
      internalOrs.push({ text: linkText, anchor: aLink });
    } else {
      externalOrs.push(aLink);
    }
  });
  return { externalOrs: externalOrs, internalOrs: internalOrs };
};

/**@param {string} linkText */
const isInternalChapLink = (linkText) => {
  return new RegExpHandler(`\\b${chapterInfo.chapNo}\\.`).doesContain(linkText);
};

const makeLinkExpandTarget = (aLink) => {
  let target = getCollapsibleTarget(aLink.text);
  if (target != null) {
    aLink.anchor.addEventListener("click", () => {
      expandSingle(target);
      infoCS(
        `Scrolling to element id = '#${aLink.anchor.innerHTML}'`,
        "enhanceSecs.js",
        "makeLinkExpandTarget"
      );
    });
  }
};

const getCollapsibleTarget = (linkText) => {
  const targetSection = document.getElementById(linkText);
  const collapsible = targetSection?.children[1];
  if (collapsible?.classList.contains("collapsible")) {
    return targetSection;
  }
  warnCS(
    `Link target: '${linkText}' does not exist; or lacks collapsible children:\n Target is '${targetSection?.tagName}'. Child is '${collapsible?.tagName}'.`,
    "enhanceSecs.js",
    "getCollapsibleTarget"
  );
  return null;
};
