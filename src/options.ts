const form = document.getElementById("settings");
const apiKeyInput: HTMLInputElement = document.getElementById("api_key") as HTMLInputElement;

browser.storage.local.get("api_key").then((res) => {
  apiKeyInput.value = res.api_key || "";
});

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    browser.storage.local.set({ api_key: apiKeyInput.value }).then(() => {
      alert("API key saved");
    });
  });
}
