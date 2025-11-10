/* exported bodyCleanUp */
/* global RegExpHandler, infoCS */

//bodyClean.js

const bodyCleanUp = (docBody) => {
  const tabRegExp = "(?:&nbsp;|\\s){0,20}"; //regExp for a tab/blank space (extending to 20 to capture chapter 3 long tabs)

  /** First pass tagging paragraphs [SearchString, classParagraphAs]
   * Tags ORS Refs, Leadlines, Forms, & makes links for internal ORS refs */
  const /**@type {[String|RegExp, String][]} */ firstPassClass = [
      // finding paragraphs starting with subsections (e.g., (2), (14))
      [`^${tabRegExp}\\(\\d{1,2}\\)`, "subSec"],

      // lower case (repeating) letters (e.g., (a), (v), (bb), (iv))
      [`^${tabRegExp}\\([a-z]{1,5}\\)`, "para"],

      // upper case (repeating) letters (e.g., (A), (V), (BB), (XX))
      [`^${tabRegExp}\\([A-Z]{1,5}\\)[^]`, "subPara"],

      // session law sections (E.g., "Sec. 14.") may or may not include leadline
      [
        `^<b>${tabRegExp}(Sec\\.\\s\\d{1,3}[a-f]?\\.[^>\\]]*?)<\\/b>`,
        "sectionStart",
      ],

      // ORS sections, already wrapped in anchor <a>; may have leadline or be further amended version
      [`^<b>${tabRegExp}<a class="orsLink">`, "sectionStart"],

      // source notes
      [
        `^${tabRegExp}\\[(<a class="sessionLaw"|Para|Sub|Former|Repeal|Renumbered|Am|Enacted)`,
        "sourceNote",
      ],

      // Notes paragraphs ("Note:", "Note 4:") prepping for wrap in <div>
      [
        `^${tabRegExp}<b>${tabRegExp}Note(\\s\\d)?:${tabRegExp}<\\/b>`,
        "startNote",
      ],

      // Heading (5+ initial capital letters) (E.g., "PENALTIES"; but not "TAX")
      [`^${tabRegExp}[^a-z0-9(_]{3,}[^a-z0-9(_]*$`, "headingLabel"],

      // Leading parens with at least 4 letters (E.g. "(Disputes)")
      [`^${tabRegExp}\\([^]{5,}\\)$`, "subheadLabel"],

      // "(Temporary provisions ... - introduce notes
      [`${tabRegExp}\\(Temporary\\sprovisions`, "tempHeadLabel"],
    ];
  let paraList = docBody.querySelectorAll("p");
  // iterates backwards through list in order to filter double headings
  for (let i = paraList.length - 1; i > -1; i--) {
    let aPara = paraList[i];
    firstPassClass.forEach(([searchFor, /**@type {String} */ newClass]) => {
      if (RegExpHandler.doesContainThis(searchFor, aPara.innerHTML)) {
        aPara.className = newClass;
      }
    });
    // concatenates headings appearing in adjacent lines and deletes second one
    if (
      aPara.classList.contains("headingLabel") &&
      paraList[i + 1] &&
      paraList[i + 1].classList.contains("headingLabel")
    ) {
      aPara.innerText = new RegExpHandler(`([^]*?)(\\s){2,}([^]*?)`).replaceAll(
        `${aPara.innerText} ${paraList[i + 1].innerText}`,
        "$1 $3"
      );
      paraList[i + 1].remove();
    }
  }

  //delete extra spaces in labeled paragraphs
  docBody
    .querySelectorAll(
      "p.subSec, p.para, p.subPara, p.sectionStart, p.sourceNote, p.note"
    )
    .forEach((aPara) => {
      //search for leading tabs & delete
      aPara.innerHTML = new RegExpHandler(
        `^${tabRegExp}(?:<b>)?${tabRegExp}`,
        ""
      ).replacePerFlags(aPara.innerHTML, "");
    });

  //figure out whether upper case (L+) is paragraph (l) or subparagraph (L)
  let subParas = docBody.querySelectorAll("p.subPara");
  subParas.forEach((aPara, pIndex) => {
    if (/^\(L+\)/.test(aPara.textContent)) {
      // find each upper case (L) (or (LL) or (LLL))
      if (pIndex > 0 && !/^\(K+\)/.test(subParas[pIndex - 1].textContent)) {
        // unless previous paragraph is a "(K+)"
        aPara.className = "para"; // reclass as paragraph
      }
    }
  });

  // Find beginning & end of forms:
  let defaultParas = docBody.querySelectorAll("p.default");
  defaultParas.forEach((aPara) => {
    if (/^_{78}$/.test(aPara?.textContent)) {
      // looking for 77 consecutive underscores
      if (
        /(form|follow|)[^]*:$/.test(aPara?.previousElementSibling?.textContent)
      ) {
        // based on keywords indicating form plus colon:
        aPara.className = "startForm";
        infoCS(
          `Form start > '${aPara?.previousElementSibling?.textContent?.slice(
            0,
            60
          )}...'`,
          "bodyClean.js",
          "defaultParas.forEach"
        );
      } else {
        infoCS(
          `Form end(?) > '${aPara?.previousElementSibling?.textContent?.slice(
            0,
            60
          )}...'`,
          "bodyClean.js",
          "defaultParas.forEach"
        );
        aPara.className = "endForm";
      }
    }
  });

  // make sure that there aren't more form ends than form starts
  let arraysBegan = 0;
  let priorEnd;
  let formParas = docBody.querySelectorAll(
    "p.startForm, p.endForm, p.sectionStart"
  );
  formParas.forEach((aPara) => {
    switch (aPara.className) {
      case "startForm": // iterate the number of forms
        priorEnd = null;
        arraysBegan < 1 ? arraysBegan++ : (aPara.className = "default"); // shouldn't be "starting more than one form"
        break;

      case "endForm":
        if (arraysBegan > 0) {
          arraysBegan--; // subtract arrays began when you close
          priorEnd = aPara;
        } else {
          // if you can't subtract any further, go back to the previous option
          if (priorEnd) {
            priorEnd.className = "default"; // not any more
            priorEnd = aPara;
          } else {
            aPara.className = "default"; // but if it there just aren't any forms open, then this must be something else
          }
        }
        break;

      case "sectionStart": //start back at zero any time you get into a new section, hopefully not necessary, but at least should keep any form jank contained within section.
        arraysBegan = 0;
        break;

      default:
        break;
    }
  });

  // Find leadlines...
  docBody.querySelectorAll("p.sectionStart").forEach((aPara) => {
    // for ORS:
    aPara.innerHTML = RegExpHandler.replaceAllWith(
      aPara.innerHTML,
      `(\\/a>${tabRegExp})([^]{2,})`,
      '$1<span class="leadline">$2</span>'
    );
    // for Session laws:
    aPara.innerHTML = RegExpHandler.replaceAllWith(
      aPara.innerHTML,
      `(Sec\\.\\s\\d{1,3}[a-f]?\\.${tabRegExp})([^]{2,})`,
      '$1<span class="leadline">$2</span>'
    );
  });

  /** For units that have roman numerals change paragraphs to sub-subparagraphs
   * (or subparagraphs to sub-sub-subparagraphs)
   * @param {String} changeFrom
   * @param {String} changeTo */
  const romanizeParagraphs = (changeFrom, changeTo) => {
    let findFirstParent = new RegExpHandler(/^\(([^]+?)\)/);
    /**Returns lower case value in the leading parenthesis as lowercase
     * E.g. '(B) Example text' ==> 'b'; '(ii) thing' ==> 'ii' *
     * @param {String} theText */
    const inParensLowerCase = (theText) => {
      let result = findFirstParent.firstMatchGroupNo(theText, 1);
      if (typeof result == "string") {
        return result.toLowerCase();
      }
      return "";
    };

    /** Turns num (under 90) into lower case roman numeral string.
     * E.g.: 77 => lxxvii
     * @param {number} num */
    const romanize = (num) => {
      let romeLookup = { L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
      let roman = "";
      for (let i in romeLookup) {
        while (num >= romeLookup[i]) {
          // until the numbers are equal
          roman += i; // add largest roman numeral to roman numeral
          num -= romeLookup[i]; // subtract amount from number
        } // repeat
      }
      return roman.toLowerCase();
    };

    /** get list of all paragraphs (or subparagraphs) */
    const subsArray = Array.from(docBody.querySelectorAll(`p.${changeFrom}`));
    for (let i = 0; i < subsArray.length; i++) {
      let parenthesisContent = inParensLowerCase(subsArray[i].textContent);
      if (parenthesisContent == "ii") {
        //every roman numeral will have an (ii), that's what we're looking for.
        let doExit = false;
        /** usually roman numerals will start with previous paragraph (i); but could be (A)(i)
         * @type {number} */ let startRomanWith = -1;
        if (/^\(i\)/.test(subsArray[i - 1]?.textContent?.toLowerCase())) {
          // if the former starts with an (i), it's definitely roman numerals
        } else if (
          !/^\(hh\)/.test(subsArray[i - 1]?.textContent?.toLowerCase())
        ) {
          /**but unless it's (hh), the (ii) is still (99% likely) roman numerals */
          startRomanWith = 0; // just don't change it to a subparagraph, since it's likely there's a (A)(i) or (ii)(I) issue here.
        } else {
          // if there *is* a preceding (hh), then never mind, this (ii) is not a roman numeral after all
          // (unless there happens to be an (hh)(A)(i) or (HH)(i)(I) (followed by a (ii) or (II)); but remotely unlikely enough not to account for it)
          doExit = true;
        }
        /**comparison for testing roman numerals, just makes index cleaner @type {number} */ let romanNumberCount = 3; // starting with what should be (iii)
        while (doExit == false) {
          inParensLowerCase(subsArray[i + romanNumberCount - 2]?.textContent) ==
          romanize(romanNumberCount)
            ? romanNumberCount++
            : (doExit = true);
          for (let j = startRomanWith; j < romanNumberCount - 2; j++) {
            subsArray[i + j].className = changeTo; // reclass all of them as sub-subparagraphs or sub-sub-subparagraphs
          }
        }
      }
    } // for (0 to subsArray.length) loop
  }; //romanizeParagraphs
  romanizeParagraphs("para", "subSubPara"); // first check paragraphs
  romanizeParagraphs("subPara", "subSubSubPara"); // then check subparagraphs

  return docBody;
};
