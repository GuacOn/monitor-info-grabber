// Description: Loaded on the Reddit post page

/**
 * Takes a list of HTML element class names (usually ad title + description), concatenates the textContent for GPT, then supplements any monitor models found with RTINGS review data.
 */
// @ts-ignore
async function modifyPage(apiKey: string) {

  // Using the unique names in slot for this reddit page
  var title = document.querySelectorAll("[id^=post-title]")[0];
  var body = document.querySelectorAll("[id$=post-rtjson-content]")[0];
  const elementsArray: Element[] = [title, body];

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
    GPTFetchMonitorModel(apiKey, gptPromptAdText).then(
      async function (modelNumber) {
        console.log("Calling func retrieved model number: " + modelNumber);

        // For each unique model found
        for (i = 0; i < modelNumber.split(", ").length; i++) {
          let model = modelNumber.split(", ")[i];

          // Search RTINGS API for monitor model
          let HTMLScorecardTable = await RTINGSSearch(model);
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

            elementsArray.forEach((element) => {
              // const elements = document.getElementsByClassName(className);
              // for (let i = 0; i < elements.length; i++) {
              setupHover(element as HTMLElement, popupDivs[i], model);
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

  console.log(`${manifest.name} has finished replacing elements on this page.`);
}
