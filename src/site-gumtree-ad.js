let apiKey = browser.storage.local.get("api_key");
apiKey.then(onGot, onError);
function onGot(item) {
  console.debug(item["api_key"]);

  console.log(`Extension ${manifest.name} v${manifest.version} starting...`);
  const elementsList = [
    "vip-ad-title__header",
    "vip-ad-description__content--wrapped",
  ];
  modifyPage(item["api_key"], elementsList);
}

function onError(error) {
  alert("Please set your OpenAI API key in the extension settings.");
  console.log(`Error: ${error}`);
}

/**
 * Takes a list of HTML element class names (usually ad title + description), concatenates the textContent for GPT, then supplements any monitor models found with RTINGS review data.
 * @param {string} apiKey OpenAI API key (https://platform.openai.com/api-keys)
 * @param {Array} elementsList Name of the class we will add information to
 */
async function modifyPage(apiKey, elementsList) {
  // let elements = document.getElementsByClassName(className);
  let tasks = [];

  // let adTitleElement = elements[0];
  // let adTitleText = adTitleElement.textContent + "\n";
  // let adDescriptionElement = document.getElementsByClassName("")[0];

  // Retrieve textContent of all given elements for GPT prompt
  let gptPromptAdText = "";

  let i = 0;
  while (i < elementsList.length) {
    gptPromptAdText = gptPromptAdText.concat(
      document.getElementsByClassName(elementsList[i])[0].textContent + "\n"
    );
    i++;
  }

  // Send to GPT for analysis
  tasks.push(
    GPTFetchMonitorModel(apiKey, gptPromptAdText).then(
      async function (modelNumber) {
        console.log("Calling func retrieved model number: " + modelNumber);

        // Search RTINGS API for monitor model
        let HTMLScorecardTable = await RTINGSSearch(modelNumber);
        if (HTMLScorecardTable) {
          // Add HTML scorecard table to our popupDiv
          popupDiv.appendChild(HTMLScorecardTable);

          elementsList.forEach((className) => {
            let popupDivClone = popupDiv.cloneNode(true);

            const elements = document.getElementsByClassName(className);
            for (let i = 0; i < elements.length; i++) {
              setupHover(elements[i], popupDivClone, modelNumber);
            }
          });
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
