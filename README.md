# Roomyfy

[![License](https://img.shields.io/badge/license-MIT-blueviolet?style=for-the-badge)](https://opensource.org/licenses/MIT)  [![Node.js](https://img.shields.io/badge/Node.js->=18-brightgreen?style=for-the-badge)](https://nodejs.org/)  [![NPM](https://img.shields.io/badge/NPM->=9-orange?style=for-the-badge)](https://www.npmjs.com/)  

Websocket-based, anonymous and open source chatroom site.

**Official EU instance**: https://roomyfy-eu.chjk.xyz/ 

**Official US instance**: https://roomyfy-us.chjk.xyz/

Instance status: https://status.chjk.xyz/status/roomyfy

## Setting up your own instance:

### Requirements: 
- Node.js (>v18 LTS recommended)
- NPM (v9+ recommended)
- git

### Linux / MacOS:
```
git clone https://github.com/Felixstro-dev/Roomyfy.git
cd Roomyfy
cd server
npm install
npm run main
```

### Windows:
(Not tested on windows)

## Environment Variables
in /server

| Variable             | Type    | Default  | Description                                |
|---------------------|--------|---------|--------------------------------------------|
| PORT                 | string | 3500    | Port to run the server on                  |
| ENABLE_PROTECTION    | boolean | false  | Enable password protection                  |
| PROTECTION_PASSWORDS | string | -       | Comma-separated list of allowed passwords |
| ENABLE_IMAGES        | boolean | true   | Enable image sharing    |
| ENABLE_COMMANDS       | boolean | true   | Enable "/!" commands    |
| NODE_ENV             | string | -   | if "production" all cross-origin requests are denied 
| ENABLE_RECONNECT     | boolean | false  | Automatically reconnect to the last room on connection/disconnect
