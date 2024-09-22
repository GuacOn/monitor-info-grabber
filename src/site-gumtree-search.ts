// Description: Loaded on the Gumtree search page 

import { MIGCore } from './MIGCore';
const migCore = new MIGCore();

/**
 * For each ad result, queries ad text + description, and supplements ad title with RTINGS data.
 */
// @ts-ignore
async function modifyPage(apiKey: string) {
  let className = "user-ad-row-new-design__title-span";
  let elements = document.getElementsByClassName(className);
  let tasks = [];

  for (let i = 0; i < elements.length; i++) {
    // for each ad element
    let adTitle = elements[i].textContent + "\n";
    let adDescriptionElement = elements[i].parentElement?.nextElementSibling?.nextElementSibling?.children[0];
    let adDescription: string = adDescriptionElement?.textContent ?? '';

    // Combine the two elements for our prompt
    let gptPromptAdText = adTitle + adDescription;

    // Send to GPT for analysis
    tasks.push(
      migCore.GPTFetchMonitorModel(gptPromptAdText).then(
        async function (modelName) {
          console.log("Calling func retrieved model number: " + modelName);

          // Search RTINGS API for monitor model
          let result = await migCore.RTINGSSearch(modelName);
          if (result) {
            let [HTMLScorecardTable, modelURL] = result;
            // If model found
            // Create our scorecard popup (unique per model)
            let popupDiv = document.createElement("div");
            popupDiv.style.display = "none";
            popupDiv.style.fontSize = "14px";
            popupDiv.style.position = "relative";
            popupDiv.style.top = "30px";
            popupDiv.style.left = "7px";
            popupDiv.style.backgroundColor = "#555";
            popupDiv.style.color = "#fff";
            popupDiv.style.padding = "8px";
            popupDiv.style.borderRadius = "5px;";

            migCore.popupDivs[i] = popupDiv;

            // Add HTML scorecard table to our popupDiv
            migCore.popupDivs[i].appendChild(HTMLScorecardTable);

            // const elements = document.getElementsByClassName(className);
            // for (let i = 0; i < elements.length; i++) {
            migCore.setupHover(elements[i] as HTMLElement, migCore.popupDivs[i], modelName, modelURL);
            // }
          }
        },
        function (error) {
          console.log("Calling func error: " + error);
        }
      )
    );

    console.debug("Adding another task...");
  }

  // Wait for all API calls to complete
  await Promise.all(tasks);

  console.log(`${migCore.getExtensionName()} has finished replacing elements on this page.`);
}
