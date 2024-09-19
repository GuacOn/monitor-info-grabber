let apiKey = browser.storage.local.get("api_key");
apiKey.then(onGot, onError);
function onGot(item) {
  console.debug(item["api_key"]);

  console.log(`Extension ${manifest.name} v${manifest.version} starting...`);
  gumtreeReplaceTextByClass(item["api_key"], "vip-ad-title__header");
}

function onError(error) {
  alert("Please set your OpenAI API key in the extension settings.");
  console.log(`Error: ${error}`);
}

/**
 * Queries ad title + description, and supplements ad title with RTINGS data.
 * @param {string} apiKey OpenAI API key (https://platform.openai.com/api-keys)
 * @param {string} className Name of the class we will add information to
 */
async function gumtreeReplaceTextByClass(apiKey, className) {
  let elements = document.getElementsByClassName(className);
  let tasks = [];

  let adTitleElement = elements[0];
  let adTitleText = adTitleElement.textContent + "\n";
  let adDescriptionElement = document.getElementsByClassName(
    "vip-ad-description__content--wrapped"
  )[0];

  // Combine the two elements for our prompt
  let gptPromptAdText = adTitleText + adDescriptionElement.textContent;

  const popupDiv = document.createElement("div");
  popupDiv.style.display = "none";
  popupDiv.style.position = "relative";
  popupDiv.style.top = "30px";
  popupDiv.style.left = "7px";
  popupDiv.style.backgroundColor = "#555";
  popupDiv.style.color = "#fff";
  popupDiv.style.padding = "8px";
  popupDiv.style.borderRadius = "5px;";

  // const node = document.createTextNode("This is a new paragraph.");
  // popupDiv.appendChild(node);

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

          // Function to handle hover functionality
          const setupHover = (elementToHover, popupElement) => {
            const escapeRegExp = (string) =>
              string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            // Create a link element
            const linkElement = document.createElement("a");
            linkElement.className = "modelLink";
            linkElement.href = "rtings.com";
            linkElement.innerHTML = modelNumber;
            linkElement.style.cursor = "pointer"; // Optional: Change cursor to pointer
            linkElement.style.textDecoration = "underline"; // Optional: Underline link

            // Replace modelNumber in the innerHTML with the link element
            elementToHover.innerHTML = elementToHover.innerHTML.replace(
              new RegExp(escapeRegExp(modelNumber), "i"),
              linkElement.outerHTML
            );

            // Append the popup element
            elementToHover.appendChild(popupElement);
            popupElement.style.display = "none"; // Initially hide the popup

            // Add event listeners to the link element
            elementToHover
              .getElementsByClassName("modelLink")[0]
              .addEventListener("mouseenter", () => {
                popupElement.style.display = "block";
              });

            elementToHover
              .getElementsByClassName("modelLink")[0]
              .addEventListener("mouseleave", () => {
                popupElement.style.display = "none";
              });
          };

          // Set up hover for the title
          setupHover(adTitleElement, popupDiv);

          // Set up hover for the description
          const popupDivDesc = popupDiv.cloneNode(true);
          setupHover(adDescriptionElement, popupDivDesc);
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
