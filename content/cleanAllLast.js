/* exported finalCleanUp, chapAndSecRegExp */
/* globals RegExpHandler, chapterInfo, infoCS */
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

  finalBody.querySelectorAll("a").forEach((anAnchor) => {
    anAnchor.rel = "noopener";
    switch (anAnchor.className) {
      case "cst":
        {
          anAnchor.href =
            "https://www.oregonlegislature.gov/bills_laws/Pages/ORS.aspx";
        }
        break;

      case "preface":
        {
          anAnchor.href =
            "https://www.oregonlegislature.gov/bills_laws/BillsLawsEDL/ORS_Preface.pdf";
        }
        break;

      case "orsLink":
        {
          // chapter was already explicitly assigned (because it's in the navigation piece)
          if (anAnchor.dataset.chapter) {
            anAnchor.href = `https://www.oregonlegislature.gov/bills_laws/ors/ors00${anAnchor.dataset.chapter}.html`;
            anAnchor.href = RegExpHandler.replaceAllWith(
              anAnchor.href,
              /(ors)0+(\d{3})/,
              "$1$2"
            ); // deletes any extra zeros in link URLs (e.g. fixes "\ors0090.html" => "\ors090.html")
            break;
          }

          // link is to current chapter
          if (
            RegExpHandler.doesContainThis(
              `^${chapterInfo.chapNo}.`,
              anAnchor.innerText
            )
          ) {
            anAnchor.href = RegExpHandler.replaceAllWith(
              anAnchor.innerText,
              /(\S+)/,
              "#$1"
            );
            break;
          }

          // create link to external chapter, targets the specific chapter id
          anAnchor.href = RegExpHandler.replaceAllWith(
            anAnchor.textContent,
            /[^]*?(([1-9]\d{0,2}[A-C]?)\.\S*)[^]*?/,
            `https://www.oregonlegislature.gov/bills_laws/ors/ors00$2.html#$1`
          );
          anAnchor.href = RegExpHandler.replaceAllWith(
            anAnchor.href,
            /(ors)0+(\d{3})/,
            "$1$2"
          ); // delete any extra zeros in link URLs (e.g. fixes "\ors0090.html" => "\ors090.html")
        }
        break;

      default:
        break;
    }
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
  document.body = finalBody; // putting it all live and in front of user
};
