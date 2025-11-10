/* exported generateCSS,*/
/* global getFromStorage, infoBG, warnBG, readJsonFile*/
//background/style.js

/**  retrieves CSS, either from sync.storage for User Custom or from css.json file for preset options
 * merges them with calculations*/
const generateCSS = async () => {
  let cssOptions;
  try {
    const userCss = await getFromStorage("cssSelector"); // find user's selected CSS style saved in popup (E.g., Dark)
    if (userCss == "Custom") {
      cssOptions = await getFromStorage("userColors"); // get css from synced user data for custom
    } else {
      cssOptions = (await readJsonFile("cssPresetColors.json"))[userCss]; // get css from json defaults
    }
    const { linkText, buttonColor, altBack } = cssOptions; // pull out values to make calculations
    infoBG(
      `Loaded '${userCss}' stylesheet & calculated css for linkVisited, linkInt & buttonHover`,
      "style.js",
      "GenerateCss"
    );
    return {
      ...cssOptions,
      linkVisited: purplerLink(linkText),
      linkInt: greenerLink(linkText),
      buttonHover: mergeColor(buttonColor, altBack),
    };
  } catch (error) {
    warnBG(`Issue retrieving styles: ${error}`, "styles.js", "generateCss");
    throw error;
  }
};

/**converts #hex string into {rgb} object*/
const hexToRGB = (hex) => {
  let h = hex.slice(hex[0] == "#" ? 1 : 0); // removes any #
  if (h.length === 3) h = [...h].map((x) => x + x).join(""); // converts 3 char hex to 6 char.
  var result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); // parses hexString
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, b: 0, g: 0 };
};

/**converts {rgb} object into #hex string
 * @param {{ r:number; g:number; b:number;}} rgb */
const rgbToHex = (rgb) => {
  return (
    "#" +
    ((1 << 24) | (rgb.r << 16) | (rgb.g << 8) | rgb.b).toString(16).slice(1)
  );
};

/**takes in color in hex, splits into rgb, moves in direction of newColor (in hex), returns new hex
 * @param {string|{r:0, b:0, g:0}} existingColor
 * @param {string|{r:0, b:0, g:0}} newColor
 * @param {number} pChange */
const colorShift = (existingColor, newColor, pChange = 50) => {
  const aObj =
    typeof existingColor == "string" ? hexToRGB(existingColor) : existingColor;
  const bObj = typeof newColor == "string" ? hexToRGB(newColor) : newColor;
  const a = [aObj.r, aObj.g, aObj.b];
  const b = [bObj.r, bObj.g, bObj.b];
  const dist = Math.sqrt(
    (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2
  );
  const vect = [
    (b[0] - a[0]) / dist,
    (b[1] - a[1]) / dist,
    (b[2] - a[2]) / dist,
  ];
  const pDelta = (pChange * dist) / 100;
  const newRGB = {
    r: Math.round(a[0] + vect[0] * pDelta),
    g: Math.round(a[1] + vect[1] * pDelta),
    b: Math.round(a[2] + vect[2] * pDelta),
  };
  return rgbToHex(newRGB);
};

/** make link color more purple for visited
 * @param {string} linkColor */
const purplerLink = (linkColor) => {
  const lRGB = hexToRGB(linkColor);
  const newPurple = lRGB.r + lRGB.g + lRGB.b < 384 ? "#440088" : "#cc99ff"; // darker / lighter
  return colorShift(linkColor, newPurple);
};

/** make link color more green for internal
 * @param {string} linkColor */
const greenerLink = (linkColor) => {
  const lRGB = hexToRGB(linkColor);
  const newGreen = lRGB.r + lRGB.g + lRGB.b < 384 ? "#448800" : "#ccff99"; // darker / lighter
  return colorShift(linkColor, newGreen);
};

/** merge two colors
 * @param {string} colorOne
 * @param {string} colorTwo */
const mergeColor = (colorOne, colorTwo) => {
  return colorShift(colorOne, colorTwo, 50);
};
