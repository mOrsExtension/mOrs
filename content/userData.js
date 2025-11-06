//userData.js

/** info logging for use of user data in this script */
const infoUserData = (infoMsg, functionName) => {
  infoCS(infoMsg, `userData.js`, functionName, "#dd44ff");
};

/** returns promises to take in a command and executes function using result
 * @param {string} dataRequest
 * @param {function} doAfterRetrieval*/
const getAndUseData = async (dataRequest, doAfterRetrieval) => {
  try {
    const response = await sendAwait({ getStorage: dataRequest });
    const responseTruth = response[dataRequest];
    infoUserData(
      `Content script received: '${dataRequest}'='${responseTruth}'`,
      "getAndUseData"
    );
    await functionCreator(doAfterRetrieval, responseTruth);
  } catch (error) {
    warnCS(
      `Error with response to '${dataRequest}': ${error}`,
      "userData.js",
      "getAndUseData"
    );
    throw error;
  }
};
/** creates an async function an runs data through it
 * @param {function} aFunction
 * @param {boolean} isTrue*/
const functionCreator = async (aFunction, isTrue) => {
  return await aFunction(isTrue);
};

const showCollapse = (isTrue) => {
  isTrue ? collapseAllSections() : expandAllSections();
};

const userData = async () => {
  const finishedData = await Promise.all(
    // functions in helper.js
    [
      ["isCollapseDefault", showCollapse],
      ["doShowFullWidth", setFullWidth],
      ["doShowBurnt", showBurnt],
      ["doShowSourceNotes", showSourceNotes],
      ["doShowMenu", showMenu],
      ["doShowVolNav", showVolumeOutline],
      ["doShowTOC", showTOC],
      ["doShowAnnos", showAnnos],
    ].map((item) => {
      return getAndUseData(item[0], item[1]);
    })
  );
};

/** determines section from url (based on #xxx)
 * scroll to html id tag in url, if any */
const scrollToTag = async () => {
  let toTag = new tagFindAndSeek(window.location.toString());
  if (toTag.hasTarget) {
    toTag.scrollToTarget();
  }
};

/** Takes in ors URL and if there's a #tag that can be found on page, scrolls browser to it) */
class tagFindAndSeek {
  constructor(fullUrl) {
    this.url = fullUrl;
    this.urlRegExp = new RegExpHandler("(?:\\.html\\#)([^\\/]*)"); // tag : $1
    if (this.urlRegExp.doesContain(fullUrl)) {
      this.#getUpperTargetString();
      this.#setDocElement();
    }
  }
  #getUpperTargetString() {
    try {
      this.targetIdString = this.urlRegExp
        .firstMatchGroupNo(this.url, 1)
        .toUpperCase();
      if (this.targetIdString.length > 0) {
        this.hasTarget = true;
      }
    } catch (error) {
      this.hasTarget = false;
    }
  }

  #setDocElement() {
    let elem = document.getElementById(this.targetIdString);
    if (elem != null) {
      this.targetDocElement = elem;
    } else {
      infoUserData(
        `Could not find element with id = '#${this.targetIdString}' to scroll to.`,
        "urlHandler/#setDocElement"
      );
      this.hasTarget = false;
    }
  }

  async scrollToTarget() {
    if (!this.hasTarget || this.targetDocElement == null) {
      return;
    }
    infoUserData(
      `Scrolling to element id = '#${this.targetIdString}'`,
      "urlHandler/scrollToTarget"
    );
    this.targetDocElement.scrollIntoView();
    this.#expandTarget();
  }

  #expandTarget() {
    try {
      expandSingle(this.targetDocElement); // helper.js - expands the section if collapsed
    } catch (error) {
      warnCS(error, "userData.js", "tagFindAndSeek");
    }
  }
}

const buildColors = async () => {};

/**replaces parts of stylesheet; called at launch or via msg from popup or options when user changes stylesheet */
const userStylesRefresh = async () => {
  const theRootStyle = document.documentElement.style;
  const replacementSheet = await sendAwait({ miscTask: "buildColorData" }); // calls /background/style.js
  for (let key in replacementSheet) {
    theRootStyle.setProperty(`--${key}`, replacementSheet[key]);
  }
  infoUserData(
    `Added user css properties to stylesheet: ${JSON.stringify(
      replacementSheet
    )}`,
    "buildColors"
  );
};
