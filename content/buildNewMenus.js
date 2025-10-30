//buildNewMenus.js

/** add floating div menu with version info & select buttons */
const buildFloatingMenuDiv = async () => {
  //creating menu
  infoCS("creating menu", "createDivs.js", "buildFloatingMenuDiv");
  let menuPanel = document.createElement("div");
  menuPanel.id = "floatMenu";
  let verPara = document.createElement("p");
  let buttonRow1 = document.createElement("p");
  let buttonRow2 = document.createElement("p");
  let manifest = browser.runtime.getManifest(); // apparently does not require await
  let thisVersion = manifest.version;
  verPara.classList.add("version");
  verPara.innerHTML = `style markup by <a href="https://github.com/mOrsExtension/mOrs/#readme">mOrs</a> v.${thisVersion}`;
  menuPanel.appendChild(verPara);
  menuPanel.appendChild(buttonRow1);
  menuPanel.appendChild(buttonRow2);

  /** adding buttons
   * @param {string} id
   * @param {string} text
   * @param {any} onClick */
  const createButton = (id, text, onClick) => {
    let thisButton = document.createElement("button");
    thisButton.id = id;
    thisButton.textContent = text;
    thisButton.addEventListener("click", onClick);
    return thisButton;
  };

  /**calculating next/prev chapter number & returning chapter url */
  const findOffsetUrl = async (offset) => {
    const fetchOffsetChapInfo = sendAwait(
      { getChapInfo: { chapNum: chapterInfo.chapNo, offset: offset } },
      true
    );
    let url = `https://www.oregonlegislature.gov/bills_laws/ors/ors00${fetchOffsetChapInfo.chapNo}.html`;
    // delete any extra zeros in link URLs (e.g. fixes "\ors0090.html" => "\ors090.html"):
    return RegExpHandler.replaceAllWith(url, /(ors)0+(\d{3})/, "$1$2");
  };

  /**building button functionality to navigate to url */
  const navToOffsetChap = async (offset) => {
    const offsetUrl = await findOffsetUrl(offset);
    infoCS(
      `Navigating +${offset} chap to ${offsetUrl}`,
      "buildNewMenus.js",
      "navToOffsetChap",
      "#4f4"
    );
    location.href = offsetUrl;
  };

  /**adding buttons to rows 1 & 2 of menu */
  buttonRow1.appendChild(
    createButton("buttonExpand", "Expand All", expandAllSections)
  );
  buttonRow1.appendChild(
    createButton("buttonCollapse", "Collapse All", collapseAllSections)
  );
  buttonRow1.appendChild(
    createButton("fullWidth", "Reading Mode", toggleFullWidth)
  );
  /*  Depreciated. #TODO item #75, volume navigation not working; offset at fault (perhaps?)
    buttonRow2.appendChild(
        createButton('prevChap', 'Previous Chapter', async () => {
            await navToOffsetChap(-1)
        })
    )
    buttonRow2.appendChild(
        createButton('nextChap', 'Next Chapter', async () => {
            await navToOffsetChap(1)
        })
    ) */
  return menuPanel;
};

class VolNavConstructor {
  static async buildDiv() {
    let volumeOutlineDiv = document.createElement("div");
    volumeOutlineDiv.id = "volumeOutline";
    let volJson = await sendAwait({ fetchJson: "VolumeOutline" }, true);
    volumeOutlineDiv.innerHTML = this.getHtmlFromVolOutline(volJson);
    this.highlightMatch(volumeOutlineDiv, "volume");
    return volumeOutlineDiv;
  }

  /**  Convert the JSON data into nested HTML lists using builtin CSS "summary/details" to form dropdowns*/
  static getHtmlFromVolOutline(data) {
    let mainList = "";
    for (const volumeKey in data.Volumes) {
      const volume = data.Volumes[volumeKey];
      mainList += `<details class="volume" data-volume="${volumeKey}">`; // Volume dropdown info
      mainList += `<summary>Volume ${volumeKey}</summary><ul>`; // Volume header, start list of titles
      for (const titleKey in volume.Titles) {
        const title = volume.Titles[titleKey];
        mainList += `<li><details class="title" data-title="${titleKey.trim()}">`; // Title dropdown info
        mainList += `<summary>Title ${titleKey.trim()}: ${
          title.Heading
        }</summary><ul>`; // Title header, start list of chapters
        for (const chapterKey in title.Chapters) {
          const chapter = title.Chapters[chapterKey];
          mainList += `<li class="chapter"><a class="orsLink" data-chapter="${chapterKey.trim()}">`; // ORS chapter link
          mainList += `ORS ${chapterKey.trim()}</a>:<span data-chapter="${chapterKey.trim()}">${chapter}</span></li>`; // Chapter info
        }
        mainList += "</ul></details></li>"; // Close the title's <ul> & <details>
      }
      mainList += "</ul></details>"; // Close the volume's <details>
    }
    return mainList;
  }

  static hierarchy = {
    volume: {
      name: "volume",
      identity: "volNo",
      cssSelector: "details.volume",
      doNext: "title",
    },
    title: {
      name: "title",
      identity: "titleNo",
      cssSelector: "details.title",
      doNext: "chapter",
    },
    chapter: {
      name: "chapter",
      identity: "chapNo",
      cssSelector: "span",
      doNext: null,
    },
  };

  /** slightly recursive function to highlight volume, title then chapters */
  static highlightMatch(/** @type {HTMLDetailsElement}*/ searchIn, type) {
    const { name, identity, cssSelector, doNext } = this.hierarchy[type];
    console.log(
      `${searchIn}, ${name}, ${chapterInfo[identity]}, ${cssSelector}`
    );
    const matchingElem = [...searchIn.querySelectorAll(cssSelector)].find(
      (detailElem) => {
        return (
          detailElem.dataset[name].toString().trim() ==
          chapterInfo[identity].toString().trim()
        );
      }
    );
    if (matchingElem) {
      console.log(matchingElem);
      if (doNext) {
        // volume & title
        matchingElem.firstElementChild
          ? matchingElem.firstElementChild?.classList.add("highlight")
          : infoCS(
              `No ${name} child to highlight`,
              "buildNewMenus.js",
              "checkDetailForHighlighting",
              true
            );
        matchingElem.open = true;
        this.highlightMatch(matchingElem, doNext);
      } else {
        // chapter
        matchingElem.classList.add("highlight");
      }
    }
  }
}
