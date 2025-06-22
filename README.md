# draugnet UI

<img title="Draugnet logo" src="https://github.com/draugnet/draugnetUI/raw/main/webroot/img/logo_vertical_dark_800.png" width="300" height="300">

The UI component of draugnet, providing easy access to the functionalities of [draugnet](https://github.com/draugnet/draugnet). 

### Capabilities

The tool allows you to submit to a MISP community via draugnet in one of 3 currently supported ways (MISP JSON, object template, freetext).

Any submission will generate a token that you can use to retrieve your data (along with any modifications / messages added by the community behind the draugnet instance).

Tokens are stored locally in your Token Store in the right panel of the UI - these reside in your browser's localStorage, so it's highly recommended to export your tokens for later use.

If you wish to involve a third party outside of the MISP community behind draugnet in the resolution of an incident, simply share the token with them. They will get full read/write access to the single report that is associated with your token (anything linked to your other tokens stays private).

### Installation

- [ ] Make sure you copy `webroot/config.default.json` to `webroot/config.json` and populate it[^1]. 
- [ ] Simply point apache to the webroot directory and serve the tool as you would any static webpage.

[^1]: The contents of this file are meant to be public and only contain the URL of the draugnet backend along with the community's timezone (failing to set up the latter will simply cause some incorrect highlighting when viewing your reports - normally used to denote data added since your last submission).
