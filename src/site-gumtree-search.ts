// Description: Loaded on the Gumtree search page 

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
      GPTFetchMonitorModel(apiKey, gptPromptAdText).then(
        async function (value) {
          console.log("Calling func retrieved model number: " + value);

          // Search RTINGS API for monitor model
          let HTMLScorecardTable = await RTINGSSearch(value);
          if (HTMLScorecardTable) {
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

            popupDivs[i] = popupDiv;

            // Add HTML scorecard table to our popupDiv
            popupDivs[i].appendChild(HTMLScorecardTable);

            // const elements = document.getElementsByClassName(className);
            // for (let i = 0; i < elements.length; i++) {
            setupHover(elements[i] as HTMLElement, popupDivs[i], value);
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

  console.log(`${manifest.name} has finished replacing elements on this page.`);
}
