//finalClean.js

/**
* stitches together all of the divs and puts it back in the body
* @param {any[]} finalDivs
*/
const finalCleanUp = finalDivs => {
    let finalBody = document.createElement('body')
    finalDivs.forEach(newDiv => {
        if (newDiv instanceof Element) {
            finalBody.appendChild(newDiv)
        }
    })

    finalBody.querySelectorAll('a').forEach(anAnchor => {
        anAnchor.rel = 'noopener'
        switch (anAnchor.className) {
            case 'cst': {
                anAnchor.href =
                'https://www.oregonlegislature.gov/bills_laws/Pages/ORS.aspx'
            } break

            case 'preface': {
                anAnchor.href =
                'https://www.oregonlegislature.gov/bills_laws/BillsLawsEDL/ORS_Preface.pdf'
            } break

            case 'orsLink': {
                // chapter was already explicitly assigned (because it's in the navigation piece)
                if (anAnchor.dataset.chapter) {
                    anAnchor.href = `https://www.oregonlegislature.gov/bills_laws/ors/ors00${anAnchor.dataset.chapter}.html`
                    anAnchor.href = new RegExpHandler(/(ors)0+(\d{3})/).replaceAll(anAnchor.href, '$1$2') // deletes any extra zeros in link URLs (e.g. fixes "\ors0090.html" => "\ors090.html")
                    break
                }

                // link is to current chapter
                if (new RegExpHandler(`^${chapterInfo.chapNo}\.`).testMe(anAnchor.innerText)) {
                    anAnchor.href = new RegExpHandler(/(\S+)/).replaceAll(anAnchor.innerText, '#$1')
                    break
                }

                // create link to external chapter, targets the specific chapter id
                console.log(`'${anAnchor.textContent}' is outside chapter`)
                const chapAndSecRegExp = new RegExpHandler(/[^]*?(([1-9]\d{0,2}[A-C]?)\.\S*)[^]*?/)
                anAnchor.href = chapAndSecRegExp.replaceAll(anAnchor.textContent, `https://www.oregonlegislature.gov/bills_laws/ors/ors00$2.html#$1`)
                console.log (anAnchor.href)
                anAnchor.href = new RegExpHandler(/(ors)0+(\d{3})/).replaceAll(anAnchor.href, '$1$2') // delete any extra zeros in link URLs (e.g. fixes "\ors0090.html" => "\ors090.html")
            } break

            default:
            break
        }
    })

    // delete empty divs
    let allElements = finalBody.getElementsByTagName('*')
    Array.from(allElements).forEach(anElement => {
        if (new RegExpHandler(/^(\s|&nbsp)+$/).testMe(anElement.textContent)) {  //TODO: #47 Double check that this still works after removing backslash before ampersand
            infoCS(
                `Deleting ${anElement.innerHTML}`,
                'finalClean.js',
                'forEach(anElement)'
            )
            anElement.remove()
        }
    })
    document.body = finalBody // putting it all live and in front of user
}