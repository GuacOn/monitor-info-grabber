// Description: Gumtree specific ad page modifications.

import { MIGCore } from './MIGCore';
const migCore = new MIGCore();

/**
 * Takes a list of HTML element class names (usually ad title + description), concatenates the textContent for GPT, then supplements any monitor models found with RTINGS review data.
 * @param {string} apiKey OpenAI API key (https://platform.openai.com/api-keys)
 */
// @ts-ignore
async function modifyPage(apiKey: string): Promise<void> {
  const elementsArray: Element[] = [
    document.getElementsByClassName("vip-ad-title__header")[0],
    document.getElementsByClassName("vip-ad-description__content--wrapped")[0],
  ];

  let tasks = [];

  // Retrieve textContent of all given elements for GPT prompt
  let gptPromptAdText: string = "";

  let i = 0;
  while (i < elementsArray.length) {
    gptPromptAdText = gptPromptAdText.concat(
      elementsArray[i].textContent + "\n"
    );
    i++;
  }

  // Send to GPT for analysis
  tasks.push(
    migCore.GPTFetchMonitorModel(apiKey, gptPromptAdText).then(
      async function (modelNumber) {
        console.log("Calling func retrieved model number: " + modelNumber);

        // For each unique model found
        for (i = 0; i < modelNumber.split(", ").length; i++) {
          let model: string = modelNumber.split(", ")[i];

          // Search RTINGS API for monitor model
          let result = await migCore.RTINGSSearch(model);
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

            elementsArray.forEach((element) => {
              // const elements = document.getElementsByClassName(className);
              // for (let i = 0; i < elements.length; i++) {
              migCore.setupHover(element as HTMLElement, migCore.popupDivs[i], model, modelURL);
              // }
            });
          }
        }
      },
      function (error) {
        console.log("Calling func error: " + error);
      }
    )
  );

  console.debug("Adding another task...");

  // Wait for all API calls to complete
  await Promise.all(tasks);

  console.log(`${migCore.getExtensionName()} has finished replacing elements on this page.`);
}
