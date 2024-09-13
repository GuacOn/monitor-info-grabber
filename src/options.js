const form = document.getElementById('settings');
const apiKeyInput = document.getElementById('api_key');

browser.storage.local.get('api_key').then((res) => {
  apiKeyInput.value = res.api_key || '';
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  browser.storage.local.set({ api_key: apiKeyInput.value }).then(() => {
    alert('API key saved');
  });
});
