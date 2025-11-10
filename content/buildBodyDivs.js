/* exported buildBodyDivs */
/* global warnCS */
//createDivs.js

//CLASSES:

/** Constructs a blank <div> with opening paragraph and classList into which you can add paragraphs & children*/
class GenericDiv {
  constructor(/**@type {HTMLParagraphElement} */ firstElement, initialClasses) {
    this.classes = [];
    this.addClass(initialClasses);
    this.Div = this.#constructNewDiv(firstElement);
  }

  addClass(newClass) {
    this.classes = this.classes.concat(newClass);
  }

  #constructNewDiv(elem) {
    let newDiv = document.createElement("div");
    newDiv.className = this.classes.join(" ");
    newDiv.appendChild(elem);
    return newDiv;
  }

  /** put this <p> into the end of this div */
  addParagraph(paragraph) {
    this.Div.appendChild(paragraph);
  }

  /** Builds new div and makes it a kid of this div*/
  addChildDiv(
    /**@type {GenericDiv}*/ childParagraph,
    /**@type {string | string[]} */ initialClasses
  ) {
    let newChild = new GenericDiv(childParagraph, initialClasses);
    this.Div.appendChild(newChild.Div);
    return newChild;
  }
}

/** based on initial classification closes lower levels, determines parentage & what to build/close */
class HierarchyHelper {
  constructor(className) {
    this.buildDivClass = "none";
    this.buildDivPrototype = "none";
    this.#sortClass(className);
  }

  /** Build paragraph based on identified type */
  #sortClass(className) {
    if (
      (className == "headingLabel" || className == "subheadLabel") &&
      Boolean(parents.getActive("form"))
    ) {
      // in a form, ignore text that looks like headings or subheadings
      this.#setParent();
    } else {
      let buildMap = {
        headingLabel: ["head", "body", "heading"],
        subheadLabel: ["sub", "head", "subhead"],
        tempHeadLabel: ["temp", "sub", "tempProvision"],
        startNote: ["note", "temp", "note"],
        startForm: ["form", "sec", "form"],
        sectionStart: ["sec", "note", "section"],
      };
      if (className in buildMap) {
        this.#build(buildMap[className]);
      } else {
        this.#setParent();
      }
    }
  }

  /** Closes other lower items based on parent to avoid misfiling */
  #build(/** @type {string[]} */ buildArray) {
    const [type, parentFrom, newClass] = buildArray;
    parents.closeParent(type);
    this.buildDivPrototype = type;
    this.parent = parents.getParentElement(parentFrom);
    this.buildDivClass = newClass;
  }

  #setParent() {
    this.parent = parents.getParentElement("form");
  }
}

/** updates parents and additional classes belonging to current section <div> (including note types) */
class SectionClassifier {
  constructor(
    /**@type {HTMLParagraphElement}*/ paraElem,
    /**@type {GenericDiv}*/ currentParent,
    /**@type {HTMLParagraphElement} */ priorElem
  ) {
    this.paraElem = paraElem;
    this.newParent = currentParent;
    this.newClasses = [];
    this.priorElem = priorElem;
    this.newClasses = this.getNewClasses();
  }

  getNewClasses() {
    if (this.newParent.classes.includes("note")) {
      let noteClasses = this.#noteClasses();
      if (noteClasses.length > 1) {
        return noteClasses;
      }
      parents.closeParent("temp"); // else: piece following the note
      this.newParent = parents.getParentElement("sub"); // and look for other potential parents (sub-div, div heads)
    }
    if (this.#isBurnt()) {
      return ["burnt"];
    }
    if (this.#isOrs()) {
      return ["ors"];
    }
    return ["undefined"];
  }

  #noteClasses() {
    let prevSibText = this.priorElem?.textContent || "";
    let paraText = this.paraElem?.textContent || "";
    const noteTypeTests = [
      { orSessionLaw: Boolean(/Sec\.\s\d{1,3}\w?\./.test(paraText)) },
      {
        futureRepeal: Boolean(
          /repeal[^]*user.s\sconvenience/.test(prevSibText)
        ),
      },
      {
        furtherAmend: Boolean(
          /amendment[^]*(become|takes? effect)[^]*(after|\bon\b|\bat\b)[^]*\sconvenience/.test(
            prevSibText
          )
        ),
      },
      {
        priorAmend: Boolean(
          /amendment[^]*(become|takes? effect)[^]*until[^]*\sconvenience/.test(
            prevSibText
          )
        ),
      },
    ];
    const testPassed = noteTypeTests.findIndex((test) => {
      return Object.values(test)[0];
    });
    if (testPassed > -1) {
      let noteClass = Object.keys(noteTypeTests[testPassed]);
      return [noteClass, "noteSec"];
    }
    return [];
  }

  /** if the first paragraph of section is a source note, section is repealed/renumbered */
  #isBurnt() {
    let nextSibClass = this.paraElem?.nextElementSibling?.className || "";
    return nextSibClass == "sourceNote";
  }

  /** if first paragraph of section contains a leadline, its a new ORS section*/
  #isOrs() {
    let paraHtml = this.paraElem?.innerHTML || "";
    return /span\sclass="leadline"/.test(paraHtml);
  }
}

class ParentHierarchy {
  static typeList = ["body", "head", "sub", "temp", "note", "sec", "form"];

  #activeParents = {};
  /** @param {GenericDiv} bodyDiv*/
  constructor(bodyDiv) {
    ParentHierarchy.typeList.forEach((item) => {
      this.#activeParents[item] = null;
    });
    this.#activeParents.body = bodyDiv;
  }

  /** returns the activeParent value (including null) for given item
   * @param {string} item
   */
  getActive(item) {
    let /** @type {GenericDiv|null} */ activeItem = this.#activeParents[item];
    return activeItem;
  }

  /**inserts item into active item object*/
  setActive(itemType, item) {
    if (ParentHierarchy.typeList.includes(itemType)) {
      this.#activeParents[itemType] = item;
    } else {
      warnCS("Tried to create a div of unidentified type?");
    }
  }

  /**removes named parent's potential children from active list (they're done having children) */
  closeParent(startWith) {
    if (ParentHierarchy.typeList.includes(startWith)) {
      ParentHierarchy.typeList
        .slice(ParentHierarchy.typeList.indexOf(startWith))
        .forEach((parent) => {
          if (this.#activeParents[parent] != null) {
            this.#activeParents[parent] = null;
          }
        });
    } else {
      warnCS(`Could not close ${startWith}`);
    }
  }

  /** Cycles backwards thru potential parents list to return first existing (otherwise main body) to be div's parent
   * @param {string} startWith
   */
  getParentElement(startWith) {
    let /** @type {GenericDiv} */ ans = this.getActive("body");
    if (startWith != "body") {
      let reversedList = ParentHierarchy.typeList.slice(1).reverse(); // reverses array and removes "body" (default)
      let foundInList =
        reversedList
          .slice(reversedList.indexOf(startWith)) // skip those before startWith
          .find((possibleParent) => {
            return this.#activeParents[possibleParent] != null; // finds first non-null
          }) || "body"; // default answer if no other living parent found
      ans = this.#activeParents[foundInList];
    }
    return ans;
  }
}

// GLOBAL VARIABLES
// initializing object for holding which parent of certain children class is active
const newMainBodyDiv = new GenericDiv(document.createElement("p"), "");
newMainBodyDiv.Div.id = "main";
newMainBodyDiv.Div.innerHTML = "";
const parents = new ParentHierarchy(newMainBodyDiv);

//GLOBAL object (probably could also be class, but whatever)
let cleanerObject = {
  /**@type {HTMLDivElement} */ body: document.createElement("div"),

  doAllCleanUp() {
    this.getFormParagraphs();
    this.getNoteParagraphs();
    return this.body;
  },
  getFormParagraphs() {
    this.body.querySelectorAll("div.form").forEach((formDiv) => {
      formDiv.querySelectorAll("p").forEach((formPElem) => {
        this.fixParaBasedOnClass(formPElem);
      });
    });
  },
  fixParaBasedOnClass(formPElem) {
    switch (formPElem.className) {
      case "startForm":
      case "endForm":
        {
          formPElem.remove();
        }
        break;
      case "headingLabel":
        {
          formPElem.className = "formHeading";
        }
        break;
      default: {
        if (
          /^[^a-z]+$/.test(formPElem.textContent) &&
          !/^(_|\s)+$/.test(formPElem.textContent)
        ) {
          formPElem.className = "formHeading";
        } else {
          formPElem.className = "default";
        }
      }
    }
  },
  getNoteParagraphs() {
    this.body.querySelectorAll("div.note").forEach((noteDiv) => {
      noteDiv
        .querySelectorAll(":scope>p, :scope > div")
        .forEach((noteChild) => {
          this.cleanUpNotes(noteChild, noteDiv);
        });
    });
  },

  cleanUpNotes(noteChild, noteDiv) {
    [...noteChild.classList].find((classElem) => {
      if (classElem == "startNote") {
        noteChild.textContent = noteChild.textContent.trim();
        return true;
      }
      const introPara = noteChild.previousElementSibling?.innerHTML || "";
      const month =
        "(?:January|February|March|April|May|June|July|August|September|October|November|December)";
      const caseCheck = [
        [
          "furtherAmend",
          RegExp(`on\\sand\\safter\\s(${month}\\s\\d{1,2},\\s20\\d{2})`),
          false,
        ],
        [
          "priorAmend",
          RegExp(`until\\s(${month}\\s\\d{1,2},\\s20\\d{2})`),
          true,
        ],
        [
          "futureRepeal",
          RegExp(`repealed\\s+(${month}\\s\\d{1,2},\\s20\\d{2})`),
          true,
        ],
      ];
      caseCheck.find((test) => {
        if (classElem == test[0]) {
          let { addClass, replacementHTML } = this.getNoteClassAndSpan(
            introPara,
            test[1],
            test[2]
          );
          noteDiv.classList.add(addClass);
          if (replacementHTML && noteChild.previousElementSibling) {
            noteChild.previousElementSibling.innerHTML = replacementHTML;
          }
          return true;
        }
        return false;
      });
    });
  },

  /**wraps text found by regular expression in an span and gives it a class; helper.js
   * @param {string} searchHTML innerHTML to be replaced
   * @param {RegExp} searchFor entire expression to be wrapped
   * @param {Boolean} isAfter is the check to see if it's after date (false = before)  */
  getNoteClassAndSpan(searchHTML, searchFor, isAfter) {
    let isDateTrue; // can be undefined
    let foundMatch = searchHTML.match(searchFor);
    let replacementHTML;
    if (foundMatch) {
      const theDate = new Date(foundMatch[1]); // first matching group
      const matchedText = foundMatch[0];
      let hasDateOccurred = theDate > new Date();
      isDateTrue = hasDateOccurred == isAfter; // has occurred
      replacementHTML = searchHTML.replace(
        matchedText,
        `<span class="${isDateTrue ? "isTrue" : "isFalse"}">${matchedText}</span>`
      );
      return {
        addClass: isDateTrue ? "isTrue" : "isFalse",
        replacementHTML: replacementHTML,
      };
    } else return { addClass: "isUnknown" };
  },
};

/** called from mORS.js (main script).
Goes through each paragraph, creates divs for headings, note groups, sections, notes and forms;
or adds content of each */
const buildBodyDivs = (/**@type {HTMLDivElement}*/ bodyCopy) => {
  let pList = bodyCopy.querySelectorAll("p");
  pList.forEach((pElem, pIndex) => {
    let {
      /**@type {GenericDiv} */ parent: aParent,
      /**@type {String} */ buildDivClass: aBuildClass,
      /**@type {String} */ buildDivPrototype: divPrototype,
    } = new HierarchyHelper(pElem.className);
    let buildClasses = [aBuildClass];

    if (divPrototype == "none") {
      aParent.addParagraph(pElem); // put generic paragraph into its parent and move on
      if (pElem.classList.contains("endForm")) {
        parents.closeParent("form"); // make sure whatever comes after the end line of a form doesn't get in form
      }
      return;
    }
    if (divPrototype == "sec") {
      // use section classifier to adjust parents & classes
      const {
        /** @type {Array} */ newClasses: addClassList,
        /** @type {GenericDiv} */ newParent: newParent,
      } = new SectionClassifier(pElem, aParent, pList[pIndex - 1]); // not sure why previousSibling isn't working, but just getting prior index works
      aParent = newParent;
      buildClasses = buildClasses.concat(addClassList);
    }

    const newDiv = aParent.addChildDiv(pElem, buildClasses); // create a child
    parents.setActive(divPrototype, newDiv); // make child the active parent

    // TODO: Does this make any sense here? source Notes aren't a builder, are they? Okay to delete?
    if (pElem.classList.contains("sourceNote")) {
      console.log("I matter!?");
      parents.closeParent("sec"); // whatever comes after source notes doesn't belong in its section
    }
  }); // next "p"

  let newBodyDiv = newMainBodyDiv.Div;
  cleanerObject.body = newBodyDiv;
  return cleanerObject.doAllCleanUp();
};
