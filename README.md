# monitor-info-grabber
Firefox extension that supplements listings for used monitors with information from the Rtings review site. Uses OpenAI GPT to extract the monitor models from advertisement text, then queries the RTINGS site for matching models, and adds this information to the existing ad.

Note: Requires an OpenAI API key (set via Extension -> Options).

This project uses:
- JavaScript
- AI! (via OpenAI's gpt-4o-mini API)
- Firefox Extensions 
- Github Actions (pushing to main branch will build and deploy to Firefox Add-ons automatically using GH Actions)