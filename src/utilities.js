import { UsersState, prohibitedNames, allowedCharacters } from "./index.js"

export function activateUser(id, name, room) {
    const user = { id, name, room }
    UsersState.setUsers([
        ...UsersState.users.filter(user => user.id !== id),
        user
    ])
    return user
}

export function userLeavesApp(id) {
    UsersState.setUsers(
        UsersState.users.filter(user => user.id !== id)
    )
}

export function getUser(id) {
    return UsersState.users.find(user => user.id === id)
}

export function getUsersInRoom(room) {
    return UsersState.users.filter(user => user.room === room)
}

export function getUserByName(name, room) {
    return UsersState.users.find(user => 
        user.name.toLowerCase() === name.toLowerCase() && user.room === room
    )
}

export function validateName(name) {
    const cleanName = name.trim().toUpperCase();

    if (![...cleanName].every(char => allowedCharacters.includes(char))) {
        return "invalidChar";
    }

    if (prohibitedNames.includes(cleanName)) {
        return "invalidName";
    }

    return true;
}

export function customLog(message, tint = false, returnEnabled = false, spacing = "") {
    const now = new Date();
    const time = now.toTimeString().slice(0, 8); // HH:MM:SS format

    const timeColor = `\x1b[38;5;247m`;
    const messageColor = tint ? `\x1b[38;5;93m` : '\x1b[38;5;7m';
    const reset = `\x1b[0m`;

    const formattedMessage = `${spacing}${timeColor}${time}${reset}${messageColor ? '  ' + messageColor + message : '  ' + message}${reset}`;

    if (returnEnabled) {
        return formattedMessage;
    } else {
        console.log(formattedMessage);
    }
}