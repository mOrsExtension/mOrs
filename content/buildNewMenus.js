//buildNewMenus.js
//@ts-check

/** add floating div menu with version info & select buttons */
const buildFloatingMenuDiv = async () => {
   //creating menu
   infoCS('creating menu', 'createDivs.js', 'buildFloatingMenuDiv')
   let menuPanel = document.createElement('div')
   menuPanel.id = 'floatMenu'
   let verPara = document.createElement('p')
   let buttonRow1 = document.createElement('p')
   let buttonRow2 = document.createElement('p')
   let manifest = browser.runtime.getManifest() // apparently does not require await
   let thisVersion = manifest.version
   verPara.classList.add('version')
   verPara.innerHTML = `style markup by <a href="https://github.com/mOrsExtension/mOrs/#readme">mOrs<\/a> v.${thisVersion}`
   menuPanel.appendChild(verPara)
   menuPanel.appendChild(buttonRow1)
   menuPanel.appendChild(buttonRow2)

   /** adding buttons
    * @param {string} id
    * @param {string} text
    * @param {any} onClick */
   const createButton = (id, text, onClick) => {
      let thisButton = document.createElement('button')
      thisButton.id = id
      thisButton.textContent = text
      thisButton.addEventListener('click', onClick)
      return thisButton
   }

   /**calculating next/prev chapter number & returning chapter url */
   const findOffsetUrl = async offset => {
      const offSetChap = deliverToBackground({chapInfo: { chapNum: thisChapNum, offset: offset }}, true)
      let url = `https://www.oregonlegislature.gov/bills_laws/ors/ors00${offSetChap[0]}.html`
      // delete any extra zeros in link URLs (e.g. fixes "\ors0090.html" => "\ors090.html"):
      return new RegExpHandler(/(ors)0+(\d{3})/).replaceAll(url, '$1$2')
   }

   /**building button functionality to navigate to url */
   const navToOffsetChap = async offset => {
      const offsetUrl = await findOffsetUrl(offset)
      infoCS(
         `Navigating +${offset} chap to ${offsetUrl}`,
         'newDivs.js',
         'navToOffsetChap',
         '#4f4'
      )
      location.href = offsetUrl
   }

   /**adding buttons to rows 1 & 2 of menu */
   buttonRow1.appendChild(
      createButton('buttonExpand', 'Expand All', expandAllSections)
   )
   buttonRow1.appendChild(
      createButton('buttonCollapse', 'Collapse All', collapseAllSections)
   )
   buttonRow1.appendChild(
      createButton('fullWidth', 'Reading Mode', toggleFullWidth)
   )
   buttonRow2.appendChild(
      createButton('prevChap', 'Previous Chapter', async () => {
         await navToOffsetChap(-1)
      })
   )
   buttonRow2.appendChild(
      createButton('nextChap', 'Next Chapter', async () => {
         await navToOffsetChap(1)
      })
   )
   return menuPanel
}

const buildVolumeNav = async () => {

   /**  Convert the JSON data into nested HTML lists*/
   const VolOutlineJsonToHtml = data => {
      let mainList = ''
      for (const volumeKey in data.Volumes) {
         const volume = data.Volumes[volumeKey]
         mainList += `<details class="volume" data-volume="${volumeKey}">` // Volume dropdown info
         mainList += `<summary>Volume ${volumeKey}</summary><ul>` // Volume header, start list of titles
         for (const titleKey in volume.Titles) {
            const title = volume.Titles[titleKey]
            mainList += `<li><details class="title" data-title="${titleKey.trim()}">` // Title dropdown info
            mainList += `<summary>Title ${titleKey.trim()}: ${title.Heading}</summary><ul>` // Title header, start list of chapters
            for (const chapterKey in title.Chapters) {
               const chapter = title.Chapters[chapterKey]
               mainList += `<li class="chapter"><a class="orsLink" data-chapter="${chapterKey.trim()}">` // ORS chapter link
               mainList += `ORS ${chapterKey.trim()}</a>:<span data-chapter="${chapterKey.trim()}">${chapter}</span></li>` // Chapter info
            }
            mainList += '</ul></details></li>' // Close the title's <ul> & <details>
         }
         mainList += '</ul></details>' // Close the volume's <details>
      }
      return mainList
   }

   let volumeOutlineDiv = document.createElement('div')
   volumeOutlineDiv.id = 'volumeOutline'
   let volOutline = ''
   try {
      const volJson = await deliverToBackground({'fetchJson': 'VolumeOutline'}, true)
      volOutline = VolOutlineJsonToHtml(volJson)
   } catch (error) {
      warnCS(`Could not fetch volume outline, error: ${error}`, 'buildNewMenus.js', 'buildVolumeNav')
   }
   volumeOutlineDiv.innerHTML = volOutline

   //open to current chapter & highlight:
   const chapInfo = await deliverToBackground({getChapInfo: { chapNum: thisChapNum }}, true)
   volumeOutlineDiv.querySelectorAll('details').forEach(aDetail => {
      if (aDetail.dataset.volume == chapInfo[2]) {
         (Boolean(aDetail.firstElementChild)
         ? aDetail.firstElementChild?.classList.add('highlight')
         : infoCS('Volume was not highlighted', 'newDivs.js', 'buildVolumeNav'))
         aDetail.open = true
      }
      if (aDetail.dataset.title == chapInfo[1]) {
         aDetail.open = true
         Boolean(aDetail.firstElementChild)
         ? aDetail.firstElementChild?.classList.add('highlight')
         : infoCS('Title was not highlighted', 'newDivs.js', 'buildVolumeNav')

         aDetail.querySelectorAll('span').forEach(aSpan => {
            if (aSpan.dataset.chapter == thisChapNum) {
               aSpan.classList.add('highlight')
            }
         })
      }
   })

   return volumeOutlineDiv
}
