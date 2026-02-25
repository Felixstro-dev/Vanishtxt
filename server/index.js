import express from 'express'
import { Server } from "socket.io"
import path from 'path'
import { fileURLToPath } from 'url'
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { runCommand } from './commands.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const protectionEnabled = process.env.ENABLE_PROTECTION || "false";

export const commandsEnabled = process.env.ENABLE_COMMANDS || "true";

const allowedPasswords = (process.env.PROTECTION_PASSWORDS || "")
  .split(",")
  .map(p => p.trim())
  .filter(Boolean);
const autoReconnect = process.env.ENABLE_RECONNECT || "false";

const PORT = process.env.PORT || 3500
export const ADMIN = "system-messages-normal-user-unclaimable"

const app = express();

const prohibitedNames = [
    'SYSTEM', 'ADMIN', 'MODERATOR', 'SERVER', 'OWNER', 'DEV', 'DEVELOPER', 'COMMANDS', 'COMMAND',
    'BOT', 'MANAGER', 'TEAM', 'STAFF', 'ADMINISTRATOR', 'SERVERBOT', 'INFO', "system-messages-normal-user-unclaimable", ADMIN
];

const allowedCharacters = [
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

app.use(express.static(path.join(__dirname, "public")))

const expressServer = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
})

// state 
const UsersState = {
    users: [],
    setUsers: function (newUsersArray) {
        this.users = newUsersArray
    }
}

export const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500", "http://127.0.0.1:5500"]
    }
})

io.on('connection', socket => {
    console.log(`User ${socket.id} connected`);

    
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

        // leave previs room
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

        console.log(`User ${socket.id} disconnected`);
    });

    // Listening for a message event 
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
                console.log('A message has been sent!');
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
        console.log('An image has been sent!');
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

// User functions 
function activateUser(id, name, room) {
    const user = { id, name, room }
    UsersState.setUsers([
        ...UsersState.users.filter(user => user.id !== id),
        user
    ])
    return user
}

function userLeavesApp(id) {
    UsersState.setUsers(
        UsersState.users.filter(user => user.id !== id)
    )
}

export function getUser(id) {
    return UsersState.users.find(user => user.id === id)
}

function getUsersInRoom(room) {
    return UsersState.users.filter(user => user.room === room)
}

export function getUserByName(name, room) {
    return UsersState.users.find(user => 
        user.name.toLowerCase() === name.toLowerCase() && user.room === room
    )
}

function validateName(name) {
    const cleanName = name.trim().toUpperCase();

    if (![...cleanName].every(char => allowedCharacters.includes(char))) {
        return "invalidChar";
    }

    if (prohibitedNames.includes(cleanName)) {
        return "invalidName";
    }

    return true;
}

/* function getAllActiveRooms() {
    return Array.from(new Set(UsersState.users.map(user => user.room)))
} */
