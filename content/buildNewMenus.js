/* exported VolNavConstructor, buildFloatingMenuDiv */
/* global infoCS, browser, chapterInfo, sendAwait, RegExpHandler, expandAllSections, collapseAllSections, makeVisible, toggleFullWidth */

//buildNewMenus.js

/** add floating div menu with version info & select buttons */
const buildFloatingMenuDiv = async () => {
  //creating menu
  infoCS("creating menu", "createDivs.js", "buildFloatingMenuDiv");
  let menuPanel = document.createElement("div");
  menuPanel.id = "floatMenu";
  let versionParagraph = document.createElement("p");

  let buttonRow1 = document.createElement("div");
  let buttonRow2 = document.createElement("div");
  let buttonRow3 = document.createElement("div");
  let manifest = browser.runtime.getManifest(); // apparently does not require await
  let thisVersion = manifest.version;
  versionParagraph.classList.add("version");
  versionParagraph.innerHTML = `style markup by <a href="https://github.com/mOrsExtension/mOrs/#readme">mOrs</a> v.${thisVersion}`;
  menuPanel.appendChild(versionParagraph);
  menuPanel.appendChild(buttonRow1);
  menuPanel.appendChild(buttonRow2);
  menuPanel.appendChild(buttonRow3);

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
    const { chapNo } = await sendAwait(
      { getChapInfo: { chapNum: chapterInfo.chapNo, offset: offset } },
      true
    );
    let url = `https://www.oregonlegislature.gov/bills_laws/ors/ors00${chapNo}.html`;
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
  buttonRow2.appendChild(
    createButton("prevChap", "Previous Chapter", async () => {
      await navToOffsetChap(-1);
    })
  );
  buttonRow2.appendChild(
    createButton("nextChap", "Next Chapter", async () => {
      await navToOffsetChap(1);
    })
  );
  buttonRow3.appendChild(
    createButton("TOC_link", "Table of Contents", async () => {
      makeVisible("div#toc", true);
      document.getElementById("toc").scrollIntoView();
    })
  );
  buttonRow3.appendChild(
    createButton("Vol_link", "Volume Navigation", async () => {
      makeVisible("div#volumeOutline", true);
      document.getElementById("volumeOutline").scrollIntoView();
    })
  );

  return menuPanel;
};

class VolNavConstructor {
  static async buildDiv() {
    let volumeOutlineDiv = document.createElement("div");
    volumeOutlineDiv.id = "volumeOutline";
    let /** @type {JSON} raw JSON in /data */ volJson = await sendAwait(
        { fetchJson: "VolumeOutline" },
        true
      );
    volumeOutlineDiv.innerHTML = this.#getHtmlFromVolOutline(volJson);
    this.highlightMatch(volumeOutlineDiv, "volume");
    return volumeOutlineDiv;
  }

  /**  Convert the JSON data into nested HTML lists using builtin CSS "summary/details" to form dropdowns*/
  static #getHtmlFromVolOutline(data) {
    let /** @type {string} cumulative HTML in text */ mainList = "";
    for (const volumeKey in data.volumes) {
      const curVolume = data.volumes[volumeKey];
      mainList += `<details class="volume" data-volume="${volumeKey}">`; // Volume dropdown info
      mainList += `<summary>Volume ${volumeKey}: ${curVolume.heading}</summary><ul>`; // Volume header, start list of titles
      for (const titleKey in curVolume.titles) {
        const curTitle = curVolume.titles[titleKey];
        mainList += `<li><details class="title" data-title="${titleKey.trim()}">`; // Title dropdown info
        mainList += `<summary>Title ${titleKey.trim()}: ${
          curTitle.heading
        }</summary><ul>`; // Title header, start list of chapters
        for (const chapterKey in curTitle.chapters) {
          const /**@type {string} */ curChapter = curTitle.chapters[chapterKey];
          let formerProvisions = "";
          if (/Former Provisions/.test(curChapter)) {
            formerProvisions = " former_provisions";
          }
          mainList += `<li class="chapter${formerProvisions}"><a class="orsLink" data-chapter="${chapterKey.trim()}">`; // ORS chapter link
          mainList += `ORS ${chapterKey.trim()}</a>: <span data-chapter="${chapterKey.trim()}">${curChapter}</span></li>`; // Chapter info
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
  static highlightMatch(
    /** @type {HTMLDetailsElement}*/ searchIn,
    /** @type {string} */ type
  ) {
    const { name, identity, cssSelector, doNext } = this.hierarchy[type];
    const matchingElem = [...searchIn.querySelectorAll(cssSelector)].find(
      (detailElem) => {
        return (
          detailElem.dataset[name].toString() ==
          chapterInfo[identity].toString()
        );
      }
    );
    if (matchingElem) {
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
