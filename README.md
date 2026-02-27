# Vanishtxt
Formerly roomyfy

[![License](https://img.shields.io/badge/license-MIT-blueviolet?style=for-the-badge)](https://opensource.org/licenses/MIT)  [![Node.js](https://img.shields.io/badge/Node.js->=18-brightgreen?style=for-the-badge)](https://nodejs.org/)  [![NPM](https://img.shields.io/badge/NPM->=9-orange?style=for-the-badge)](https://www.npmjs.com/)  

Websocket-based, anonymous and open source chatroom site.

**Official EU instance**: https://vanishtxt-eu.chjk.xyz/ 

**Official US instance**: https://vanishtxt-us.chjk.xyz/

Instance status: https://status.chjk.xyz/status/vanishtxt

>  **IMPORTANT**
>
>  Please update your instance's install or run script if your instance is on version 1.2.0 or later due to a change in the file structure.
>

## Setting up your own instance:

### Requirements: 
- Node.js (>v18 LTS recommended)
- NPM (v9+ recommended)
- git

### Linux / MacOS:
Install:
```
git clone https://github.com/Felixstro-dev/vanishtxt.git
cd vanishtxt
npm install
```
Start:
```
cd /path/to/your/install
npm run main
```
Update:
```
cd /path/to/your/install
git pull
npm install #just to be safe
```

### Windows:
(Not tested on windows)

## Environment Variables

| Variable             | Type    | Default  | Description                                |
|---------------------|--------|---------|--------------------------------------------|
| PORT                 | string | 3500    | Port to run the server on                  |
| ENABLE_PROTECTION    | boolean | false  | Enable password protection                  |
| PROTECTION_PASSWORDS | string | -       | Comma-separated list of allowed passwords |
| ENABLE_IMAGES        | boolean | true   | Enable image sharing    |
| ENABLE_COMMANDS       | boolean | true   | Enable "/!" commands    |
| NODE_ENV             | string | -   | if "production" all cross-origin requests are denied 
| ENABLE_RECONNECT     | boolean | false  | Automatically reconnect to the last room on connection/disconnect (only supported on some frontends)
| ENABLE_CUSTOM_FRONTEND | boolean | false | Toggle the custom frontends feature |
| CUSTOM_FRONTEND_PATH | string | ./src/custom-frontend/ | Changes the path that gets served when the custom frontends feature is enabled |
