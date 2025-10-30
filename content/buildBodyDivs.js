//createDivs.js

//CLASSES:

/** Constructs a blank <div> into which you can add paragraphs & children*/
class GenericDiv {
  constructor(/**@type {HTMLParagraphElement} */ firstElement, classList) {
    this.classList = [];
    this.classList = this.classList.concat(classList);
    this.Div = this.#constructNewDiv(firstElement);
  }

  #constructNewDiv(elem) {
    let newDiv = document.createElement("div");
    newDiv.className = this.classList.join(" ");
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
    /**@type {string | string[]} */ classList
  ) {
    let newChild = new GenericDiv(childParagraph, classList);
    this.Div.appendChild(newChild.Div);
    return newChild;
  }
}

/** closes lower levels, determines parentage*/
class HierarchyHelper {
  constructor(className) {
    this.parent = parents.getActive("body"); //default value
    this.buildClass = "none";
    this.buildType = "none";
    this.#sortClass(className);
  }

  /** Build paragraph based on identified type */
  #sortClass(className) {
    let isInForm = Boolean(parents.getActive("form")); // finds out if we're in a form
    switch (className) {
      case "headingLabel":
        {
          if (isInForm) {
            // if it's in a form; treat as text
            this.#setParent();
          } else {
            this.#closeOldAndBuildNew("head", "body", "heading");
          }
        }
        break;
      case "subheadLabel":
        {
          if (isInForm) {
            // if it's in a form; treat as text
            this.#setParent();
          } else {
            this.#closeOldAndBuildNew("sub", "head", "subhead");
          }
        }
        break;
      case "tempHeadLabel":
        {
          this.#closeOldAndBuildNew("temp", "sub", "tempProvision");
        }
        break;
      case "startNote":
        {
          this.#closeOldAndBuildNew("note", "temp", "note");
        }
        break;
      case "startForm":
        {
          this.#closeOldAndBuildNew("form", "sec", "form");
        }
        break;
      case "sectionStart":
        {
          this.#closeOldAndBuildNew("sec", "note", "section");
        }
        break;
      default:
        {
          this.#setParent();
        }
        break;
    }
  }

  /** Closes other lower items based on parent to avoid misfiling */
  #closeOldAndBuildNew(close, parentItem, newItem) {
    parents.closeParent(close);
    this.buildType = close;
    this.parent = parents.getParentElement(parentItem);
    this.buildClass = newItem;
  }

  #setParent() {
    this.parent = parents.getParentElement("form");
  }
}

/** updates parents and additional classes belonging to current section <div> (including note types) */
class SectionClassifier {
  constructor(
    /**@type {HTMLParagraphElement}*/ paraElem,
    /**@type {GenericDiv}*/ currentParent
  ) {
    this.paraElem = paraElem;
    this.newParent = currentParent;
    this.newClasses = [];
    this.newClasses = this.getNewClasses();
  }

  getNewClasses() {
    if (this.newParent.classList.includes("note")) {
      let noteClasses = this.#noteClasses();
      if (noteClasses.length > 1) {
        return noteClasses;
      }
      parents.closeParent("temp"); // else: piece following the note
      this.newParent = parents.getParentElement("sub"); // and look for other potential parents (subdiv, div heads)
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
    let prevSibText = this.paraElem?.previousElementSibling?.textContent || "";
    let paraText = this.paraElem?.textContent || "";
    let noteClass = "";
    if (/Sec\.\s\d{1,3}\w?\./.test(paraText)) {
      noteClass = "sessionLaw";
    } else if (/repeal[^]*user.s\sconvenience/.test(prevSibText)) {
      noteClass = "futureRepeal";
    } else if (
      /amendment[^]*become[^]*after[^]*\sconvenience/.test(prevSibText) ||
      /amendment[^]*would become[^]*\sconvenience/.test(prevSibText)
    ) {
      noteClass = "furtherAmend";
    } else if (
      /amendment[^]*become[^]*until[^]*\sconvenience/.test(prevSibText)
    ) {
      noteClass = "priorAmend";
    }
    if (noteClass != "") {
      // if so, add classes to sec
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
    }
  }

  /**removes named parent's potential children from active list (they're done having children) */
  closeParent(startWith) {
    if (startWith in ParentHierarchy.typeList) {
      ParentHierarchy.typeList
        .slice(ParentHierarchy.typeList.indexOf(startWith))
        .forEach((parent) => {
          this.#activeParents[parent] = null;
        });
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
          .slice(reversedList.indexOf(startWith)) // skip those < startWith
          .find((possibleParent) => {
            this.#activeParents[possibleParent] != null; // finds first non-null
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

//GLOBAL functions (probably could also be classes, but whatever)
let cleanerObject = {
  /**@type {HTMLDivElement} */ body: document.createElement("div"),
  month:
    "(?:January|February|March|April|May|June|July|August|September|October|November|December)",
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
      noteDiv.querySelectorAll("p").forEach((notePara) => {
        this.cleanUpNotes(notePara, noteDiv);
      });
    });
  },
  cleanUpNotes(notePara, noteDiv) {
    switch (notePara.classList) {
      case "startNote":
        {
          notePara.textContent = notePara.textContent.trim();
        }
        break;
      case "furtherAmend":
        {
          const introPara = notePara.previousElementSibling;
          const isDateTrue = this.colorBasedOnDate(
            introPara,
            `on\\sand\\safter\\s(${this.month}\\s\\d{1,2},\\s20\\d{2}),`,
            "afterDate"
          );
          noteDiv.classList.add(isDateTrue ? "isTrue" : "isFalse");
        }
        break;
      case "priorAmend":
        {
          const introPara = notePara.previousElementSibling;
          const isDateTrue = this.colorBasedOnDate(
            introPara,
            `until\\s(${this.month}\\s\\d{1,2},\\s20\\d{2}),`,
            "untilDate"
          );
          noteDiv.classList.add(isDateTrue ? "isTrue" : "isFalse");
        }
        break;
      case "futureRepeal": {
        const introPara = notePara.previousElementSibling;
        const isDateTrue = this.colorBasedOnDate(
          introPara,
          `until\\s(${this.month}\\s\\d{1,2},\\s20\\d{2}),`,
          "untilDate"
        );
        noteDiv.classList.add(isDateTrue ? "isTrue" : "isFalse");
      }
    }
  },
  /**wraps text found by regular expression in an span and gives it a class; helper.js
   * @param {HTMLElement} searchedElem / Element to be replaced
   * @param {string|RegExp} searchText / entire expression to be wrapped
   * @param {string} spanClass / assigned class */
  colorBasedOnDate(searchedElem, searchText, spanClass) {
    const searchFor = RegExp(searchText);
    let elemHTML = searchedElem.innerHTML;
    let isDateTrue = false;
    let foundMatch = elemHTML.match(searchFor);
    if (foundMatch) {
      const theDate = new Date(foundMatch[1]);
      const theText = foundMatch[0];
      isDateTrue = theDate > new Date() == (spanClass == "untilDate");
      elemHTML = this.addWrap(elemHTML, theText, isDateTrue);
    }
    return isDateTrue;
  },
  addWrap(elemHTML, match, isDateTrue) {
    const newSpan = document.createElement("span");
    newSpan.textContent = match;
    newSpan.classList.add(isDateTrue ? "isTrue" : "isFalse");
    let wrappedArray = elemHTML.split(match);
    wrappedArray.splice(1, 0, newSpan.innerHTML);
    return wrappedArray.join("");
  },
};

/** called from mORS.js (main script).
Goes through each paragraph, creates divs for headings, note groups, sections, notes and forms;
or adds content of each */
const buildBodyDivs = (/**@type {HTMLDivElement}*/ bodyCopy) => {
  bodyCopy.querySelectorAll("p").forEach((pElem) => {
    let {
      /**@type {GenericDiv} */ parent: aParent,
      /**@type {String} */ buildClass: aBuildClass,
      /**@type {String} */ buildType: aBuildType,
    } = new HierarchyHelper(pElem.className);
    let buildClasses = [aBuildClass];

    if (aBuildType == "none") {
      aParent.addParagraph(pElem); // put generic paragraph into parent
      if (pElem.classList.contains("endForm")) {
        parents.closeParent("form"); // whatever comes after the end line of a form doesn't belong in form
      }
      return;
    }
    if (aBuildType == "sec") {
      // use section classifier to adjust parents & classes
      const {
        /** @type {Array} */ newClasses: addClassList,
        /** @type {GenericDiv} */ newParent: newParent,
      } = new SectionClassifier(pElem, aParent);
      aParent = newParent;
      buildClasses = buildClasses.concat(addClassList);
    }

    let newDiv = aParent.addChildDiv(pElem, buildClasses);
    parents.setActive(aBuildType, newDiv);
    if (pElem.classList.contains("sourceNote")) {
      parents.closeParent("sec"); // whatever comes after source notes doesn't belong in its section
    }
  });

  let newBodyDiv = newMainBodyDiv.Div;
  cleanerObject.body = newBodyDiv;
  return cleanerObject.doAllCleanUp();
};
