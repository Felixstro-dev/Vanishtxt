import express from 'express'
import { Server } from "socket.io"
import path from 'path'
import { createRequire } from 'module';
import { fileURLToPath } from 'url'
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { runCommand } from './commands.js';
import { validateName, getUsersInRoom, getUser, userLeavesApp, activateUser, customLog } from './utilities.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const protectionEnabled = process.env.ENABLE_PROTECTION || "false";
export const customFrontendEnabled = process.env.ENABLE_CUSTOM_FRONTEND || "false";
export const customFrontendPath = process.env.CUSTOM_FRONTEND_PATH || "custom-frontend";
export const commandsEnabled = process.env.ENABLE_COMMANDS || "true";

const allowedPasswords = (process.env.PROTECTION_PASSWORDS || "")
  .split(",")
  .map(p => p.trim())
  .filter(Boolean);
const autoReconnect = process.env.ENABLE_RECONNECT || "false";

const PORT = process.env.PORT || 3500
export const ADMIN = "system-messages-normal-user-unclaimable"

const app = express();

export const prohibitedNames = [
    'SYSTEM', 'ADMIN', 'MODERATOR', 'SERVER', 'OWNER', 'DEV', 'DEVELOPER', 'COMMANDS', 'COMMAND',
    'BOT', 'MANAGER', 'TEAM', 'STAFF', 'ADMINISTRATOR', 'SERVERBOT', 'INFO', "system-messages-normal-user-unclaimable", ADMIN
];

export const allowedCharacters = [
    'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R',
    'S','T','U','V','W','X','Y','Z','1','2','3','4','5','6','7','8','9','0','_','-'
];

function middleware(req, res, next) {
    if (protectionEnabled !== "true" && req.path == "/") {
        return res.redirect("/chat.html");
    }

    if (req.path !== "/chat.html") return next();

    const authCookie = req.cookies.auth;

    if (allowedPasswords.includes(authCookie) || protectionEnabled !== "true") return next();

    return res.redirect("/");
}

app.use(cookieParser());
app.use(middleware);

if (customFrontendEnabled == "true") {
    app.use(express.static(path.join(__dirname, customFrontendPath)))
} else {
    app.use(express.static(path.join(__dirname, "frontend")))
}
const expressServer = app.listen(PORT, () => {
    const message1 = `
    \x1b[38;5;93m╭──────────────────────────────────────────────────────╮
    \x1b[38;5;93m│ \x1b[38;5;7mVanishTXT v${pkg.version}\x1b[0m                                     \x1b[38;5;93m│
    \x1b[38;5;93m╰──────────────────────────────────────────────────────╯

    ${customLog("Starting", true, true)}`;
    console.log(message1);

    const message2 = `
    \x1b[38;5;7m╭──────────────────────────────────────────────────────╮
    \x1b[38;5;7m│ \x1b[0m Listening on \x1b[38;5;93mhttp://0.0.0.0:${PORT}\x1b[0m                    \x1b[38;5;7m│
    \x1b[38;5;7m╰──────────────────────────────────────────────────────╯`;
    console.log(message2)
})

// state 
export const UsersState = {
    users: [],
    setUsers: function (newUsersArray) {
        this.users = newUsersArray
    }
}

export const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false : [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`]
    }
})

io.on('connection', socket => {
    customLog(`A user connected...`, false, false, "    ")
    
    socket.emit('config', { autoReconnect: autoReconnect === "true" });

    // Welcome and Connected messgaes
    socket.emit('message', buildMsg(ADMIN, "Connected to websocket successfully!"));
    socket.emit('message', buildMsg('INFO', "Enter a username and chatroom to chat with other people.<br>Use /!help to see commands"));

    socket.on('enterRoom', ({ name, room }) => {
        const isValidName = validateName(name);
        room = room.toLowerCase();

        if (isValidName === "invalidName") {
            socket.emit('message', buildMsg(ADMIN, `The name "${name}" is reserved or blacklisted. \n Please choose another name.`));
            return;
        }
        if (isValidName === "invalidChar") {
            socket.emit('message', buildMsg(ADMIN, `The name "${name}" contains invalid characters`))
            return;
        }

        // leave previous room
        const prevRoom = getUser(socket.id)?.room;

        if (prevRoom) {
            socket.leave(prevRoom);
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`));
        }

        const user = activateUser(socket.id, name, room);

        if (prevRoom) {
            io.to(prevRoom).emit('userList', {
                users: getUsersInRoom(prevRoom)
            });
        }

        // join room 
        socket.join(user.room);

        // you have joined 
        socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room`));

        // To everyone else 
        socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`));

        // Update user list for room 
        io.to(user.room).emit('userList', {
            users: getUsersInRoom(user.room),
            room: user.room
        });
    });

    // When user disconnects - to all others 
    socket.on('disconnect', () => {
        const user = getUser(socket.id);
        userLeavesApp(socket.id);
        buildMsg(ADMIN, `You have disconnected from the room`)

        if (user) {
            io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`));

            io.to(user.room).emit('userList', {
                users: getUsersInRoom(user.room),
                room: user.room
            });
        }

        customLog(`A user disconnected...`, false, false, "    ")
    });

    socket.on('message', ({ name, text }) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            const isValidName = validateName(name);

            if (isValidName === "char" || isValidName === "name") return;

            const prohibitedStrings = [
                '<iframe>', '</iframe>',
                '<script>', '</script>',
                '<embed>', '</embed>',
                '<object>', '</object>',
                '<link>', '</link>',
                '<style>', '</style>',
                '<img>', '</img>',
                '<button>', '</button>',
                '<form>', '</form>',
                '<input>', '</input>',

                'onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur',
                'onmouseenter', 'onmouseleave', 'onkeydown', 'onkeyup', 'onchange',

                'src=', 'href=', 'style=', 'background=', 'data:', 'javascript:', 'vbscript:', 'expression('
            ];

            const cleanMessage = text.trim().toLowerCase();
            const containsProhibited = prohibitedStrings.some(str => cleanMessage.includes(str));

            if (cleanMessage.startsWith('/!')) runCommand(cleanMessage, room, socket);

            if (!containsProhibited) {
                io.to(room).emit('message', buildMsg(name, text));
            } else {
                console.log(`Blocked message! Possible XSS attempt`);
            }

        }
        
    });

    socket.on("chat_image", ({ name, type, image }) => {
        const room = getUser(socket.id)?.room;
        const isValidName = validateName(name);
        if (!room) return;
        if (!isValidName === "valid" || !isValidName === true) return;

        if (process.env.ENABLE_IMAGES !== "true")  {
            socket.emit('message', buildMsg(ADMIN, 'Sending images is disabled on this instance'));
            return;
        };

        const time = new Intl.DateTimeFormat("default", {
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
        }).format(new Date());

        io.to(room).emit("chat_image", {
            name,
            type,
            image,
            time,
        });
        customLog(`An Image has been sent!`, false, false, "    ")
    });


    // Listen for activity 
    socket.on('activity', (name) => {
        const room = getUser(socket.id)?.room;
        const isValidName = validateName(name);
        if (!room) return;
        if (!isValidName === "valid" || !isValidName === true) return;
        socket.broadcast.to(room).emit('activity', name);
    });
});


export function buildMsg(name, text) {
    return {
        name,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}

/* function getAllActiveRooms() {
    return Array.from(new Set(UsersState.users.map(user => user.room)))
} */