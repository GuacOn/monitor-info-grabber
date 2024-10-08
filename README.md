# ![Test Image 1](./src/icons/border-96.png) Monitor Review Finder

[Firefox extension](https://addons.mozilla.org/en-GB/firefox/addon/monitor-info-grabber/) that supplements listings for used monitors with information from the Rtings review site. Uses OpenAI GPT to extract the monitor models from advertisement text, then queries the RTINGS site for matching models, and adds this information to the existing ad.

Note: Requires an OpenAI API key (set via Extension -> Options).

## Notes for contributing
`npm run build` will compile the project in the `built` directory, and copy across files required for the extension such as `manifest.json`, HTML, and CSS.

### Adding sites
Take a look at the existing `site-*.ts` files for examples, the idea is to pick the correct HTML elements to grab the data from (for model number extraction), such as a title and description.


This project uses:

- TypeScript (strict)
- AI! (via OpenAI's gpt-4o-mini API)
- Firefox Extensions
- Github Actions (pushing to `main` branch (with a bumped version number) will build and deploy to Firefox Add-ons automatically using GH Actions)

![](https://github.com/GuacOn/monitor-info-grabber/blob/main/usage-example.gif)
