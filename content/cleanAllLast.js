/* exported finalCleanUp, chapAndSecRegExp */
/* globals RegExpHandler, chapterInfo, infoCS, expandSingle, warnCS */
//finalClean.js

/**
 * stitches together all of the divs and puts it back in the body
 * @param {any[]} finalDivs
 */
const finalCleanUp = (finalDivs) => {
  let finalBody = document.createElement("body");
  finalDivs.forEach((newDiv) => {
    if (newDiv instanceof Element) {
      finalBody.appendChild(newDiv);
    }
  });

  finalBody.querySelectorAll("a").forEach((anchor) => {
    anchor.rel = "noopener";
    anchor.classList.forEach((nameOfClass) => {
      switch (nameOfClass) {
        case "cst":
          {
            anchor.href =
              "https://www.oregonlegislature.gov/bills_laws/Pages/ORS.aspx";
          }
          break;

        case "preface":
          {
            anchor.href =
              "https://www.oregonlegislature.gov/bills_laws/BillsLawsEDL/ORS_Preface.pdf";
          }
          break;

        default:
          break;
      }
    });
  });

  const { externalOrs, internalOrs } = splitLinks(finalBody).result;
  externalOrs.forEach((anchor) => {
    anchor.classList.add("linkExt");
    if (anchor.dataset.chapter) {
      // chapter was already explicitly assigned (because it's in the navigation piece)
      anchor.href = `https://www.oregonlegislature.gov/bills_laws/ors/ors00${anchor.dataset.chapter}.html`;
    } else {
      // create link to external chapter, targets the specific chapter id
      anchor.href = RegExpHandler.replaceAllWith(
        anchor.textContent,
        /[^]*?(([1-9]\d{0,2}[A-C]?)\.\S*)[^]*?/,
        `https://www.oregonlegislature.gov/bills_laws/ors/ors00$2.html#$1`
      );
    }
    anchor.href = RegExpHandler.replaceAllWith(
      anchor.href,
      /(ors)0+(\d{3})/,
      "$1$2"
    ); // delete any extra zeros in link URLs (e.g. fixes "\ors0090.html" => "\ors090.html")
  });
  internalOrs.forEach((aLink) => {
    const { anchor, text } = aLink;
    anchor.classList.add("linkInt");
    anchor.href = `#${text}`;
    const target = getCollapsibleTarget(text, finalBody);
    makeLinkExpandTarget(anchor, target);
  });

  // delete empty divs
  let allElements = finalBody.getElementsByTagName("*");
  Array.from(allElements).forEach((anElement) => {
    if (
      new RegExpHandler(/^(\s|&nbsp;)+$/).doesContain(anElement.textContent)
    ) {
      infoCS(
        `Deleting ${anElement.innerHTML}`,
        "finalClean.js",
        "forEach(anElement)"
      );
      anElement.remove();
    }
  });

  const addCopyOnlySpaces = () => {
    const spacesToAdd = {
      subSec: 2,
      para: 4,
      subPara: 7,
      subSubPara: 10,
      subSubSubPara: 13,
    };
    for (const unit in spacesToAdd) {
      let spaces = "";
      for (var i = 0; i < spacesToAdd[unit]; i++) {
        spaces += "&nbsp;";
      }
      finalBody.querySelectorAll(`.${unit}`).forEach((item) => {
        const span = document.createElement("span");
        span.className = "copyOnly";
        span.textContent = spaces;
        item.insertBefore(span, item.firstChild);
      });
    }
  };
  addCopyOnlySpaces();

  document.body = finalBody; // putting it all live and in front of user
};

/** Classifies each ORS link based on whether it's internal link; used to create button element to force expand on click
 * @param {HTMLBodyElement} bodyElem */
const splitLinks = (bodyElem) => {
  let result = { externalOrs: [], internalOrs: [] };
  bodyElem.querySelectorAll("a.orsLink").forEach((aLink) => {
    let linkText = aLink.textContent;
    if (isInternalChapLink(linkText)) {
      result.internalOrs.push({ text: linkText, anchor: aLink });
    } else {
      result.externalOrs.push(aLink);
    }
  });
  return { result };
};
/**@param {string} linkText */
const isInternalChapLink = (linkText) => {
  return new RegExpHandler(`\\b${chapterInfo.chapNo}\\.`).doesContain(linkText);
};

/**
 * @param {HTMLAnchorElement} anchor
 * @param {Element} target */
const makeLinkExpandTarget = (anchor, target) => {
  if (target != null) {
    anchor.addEventListener("click", () => {
      expandSingle(target);
      infoCS(
        `Scrolling to element id = '#${anchor.innerHTML}'`,
        "cleanAllLast.js",
        "makeLinkExpandTarget"
      );
    });
  }
};

/** returns target of internal ORS links
 * @param {string} linkText
 * @param {HTMLDivElement} bodyDiv */
const getCollapsibleTarget = (linkText, bodyDiv) => {
  let linkCleaned = linkText.replace(
    /([!"#$%&'()*+,./:;<=>?@[\]^`{|}~])/g,
    "\\$1"
  ); // querySelector doesn't like unescaped punctuation
  if (/\b\d/.test(linkCleaned)) {
    linkCleaned = `\\3${linkCleaned.slice(0, 1)} ${linkCleaned.slice(1)}`; // it also doesn't like initial numbers
  }
  const targetSection = bodyDiv.querySelector(`#${linkCleaned}`);

  const collapsible = targetSection?.children[1];
  if (collapsible?.classList.contains("collapsible")) {
    return targetSection;
  }
  warnCS(
    `Link target: '${linkCleaned}' does not exist; or lacks collapsible children:\n Target is '${targetSection?.tagName}'. Child is '${collapsible?.tagName}'.`,
    "enhanceSecs.js",
    "getCollapsibleTarget"
  );
  return null;
};
