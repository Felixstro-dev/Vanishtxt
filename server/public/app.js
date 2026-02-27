const msgInput = document.querySelector('#message')
const nameInput = document.querySelector('#name')
const chatRoom = document.querySelector('#room')
const usersList = document.querySelector('.user-list')
const roomList = document.querySelector('.room-list')
const chatDisplay = document.querySelector('.chat-display')
const statusDisplay = document.querySelector('.status')
const activityLoader = document.getElementById("activityloader");
const activityText = document.getElementById("activitytext");

function sendMessage(e) {
    e.preventDefault()
    if (nameInput.value && msgInput.value && chatRoom.value) {
        socket.emit('message', {
            name: nameInput.value,
            text: msgInput.value
        })
        msgInput.value = ""
    }
    msgInput.focus()
}

let currentRoom = null;

let autoReconnectEnabled = false;

function joinRoom(name, room, isAutoReconnect = false) {
    // Save to localStorage 
    if (autoReconnectEnabled) {
        localStorage.setItem('lastRoom', room);
        localStorage.setItem('lastUsername', name);
    }

    socket.emit('enterRoom', { name: name, room: room });
    chatDisplay.innerHTML = '';
    currentRoom = room;

    msgInput.disabled = false;
    document.getElementById("choose_image").disabled = false;
    document.getElementById("join").disabled = true;
    setTimeout(() => {
        document.getElementById("join").disabled = false;
    }, 4000);
}

function enterRoom(e) {
    if (currentRoom !== null) {
        return;
    }
    
    e.preventDefault();
    if (nameInput.value && chatRoom.value) {
        joinRoom(nameInput.value, chatRoom.value);
    }

}

document.querySelector('.form-msg')
    .addEventListener('submit', sendMessage)

document.querySelector('.form-join')
    .addEventListener('submit', enterRoom)

msgInput.addEventListener('keypress', () => {
    socket.emit('activity', nameInput.value)
});

// Receive config 
socket.on("config", (config) => {
    autoReconnectEnabled = config.autoReconnect;


    if (autoReconnectEnabled && !currentRoom) {
        const lastRoom = localStorage.getItem('lastRoom');
        const lastUsername = localStorage.getItem('lastUsername');

        if (lastRoom && lastUsername) {
            joinRoom(lastUsername, lastRoom, true);
        }
    }
})

socket.on("connect", () => {
    activityText.textContent = "";
    activityLoader.hidden = true;
    usersList.textContent = "";
    statusDisplay.textContent = "Connected to websocket server!"
    msgInput.disabled = false;
    document.getElementById("choose_image").disabled = false;


    if (autoReconnectEnabled && currentRoom) {
        const lastUsername = localStorage.getItem('lastUsername') || nameInput.value;
        if (lastUsername) {
            joinRoom(lastUsername, currentRoom, true);
        }
    }
})
socket.on("disconnect", () => {
    activityText.textContent = "Not connected";
    activityLoader.hidden = true;
    usersList.textContent = "Not connected to websocket server!";
    statusDisplay.textContent = "Not connected to websocket server!";
    msgInput.disabled = true;
    document.getElementById("choose_image").disabled = true;
});

socket.on("message", (data) => {
    activityText.textContent = "";
    const { name, text, time } = data;

    const li = document.createElement('li');
    li.classList.add('post');

    const isAdminMessage = name === 'system-messages-normal-user-unclaimable';
    const isOwnMessage = name === nameInput.value;

    if (isOwnMessage) {
        li.classList.add('post--right');
    } else if (!isAdminMessage) {
        li.classList.add('post--left');
    }

    const nameColor = stringtocolor(name)

    if (text.startsWith('/!')) return;

    if (!isAdminMessage) {
        const headerClass = isOwnMessage ? 'post__header--user' : 'post__header--reply';
        const header = document.createElement('div');
        header.className = `post__header ${headerClass}`;
        header.style.backgroundColor = nameColor;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'post__header--name';
        nameSpan.textContent = name;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'post__header--time';
        timeSpan.textContent = time;

        header.appendChild(nameSpan);
        header.appendChild(timeSpan);

        const textDiv = document.createElement('div');
        textDiv.className = 'post__text';
        linkifyText(textDiv, text);

        li.appendChild(header);
        li.appendChild(textDiv);
    } else {
        li.classList.add('post__system')
        li.innerHTML = `<div class="post__text--system">${text}</div>`;
    }

    chatDisplay.appendChild(li);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
    activityText.textContent = "";
});

function linkifyText(container, rawText) {
    const urlRegex = /(https?:\/\/[^\s]+)(?=\s|$)/g;
    let lastIndex = 0;
    let match;

    while ((match = urlRegex.exec(rawText)) !== null) {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;

        if (matchStart > lastIndex) {
            container.appendChild(document.createTextNode(rawText.slice(lastIndex, matchStart)));
        }

        const link = document.createElement('a');
        link.href = match[0];
        link.textContent = match[0];
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        container.appendChild(link);

        lastIndex = matchEnd;
    }

    if (lastIndex < rawText.length) {
        container.appendChild(document.createTextNode(rawText.slice(lastIndex)));
    }
}


socket.on("chat_image", (data) => {
    activityText.textContent = "";
    const { name, image, time } = data;

    const isOwnMessage = name === nameInput.value;
    const li = document.createElement('li');
    li.classList.add('post');

    if (isOwnMessage) {
        li.classList.add('post--right');
    } else {
        li.classList.add('post--left');
    }

    const blob = new Blob([image], { type: data.type });
    const url = URL.createObjectURL(blob);

    const nameColor = stringtocolor(name)

    const headerClass = isOwnMessage ? 'post__header--user' : 'post__header--reply';
    li.innerHTML = `
        <div style="background-color: ${nameColor}; background: ${nameColor}" class="post__header ${headerClass}">
            <span class="post__header--name">${name}</span>
            <span class="post__header--time">${time}</span>
        </div>
        <div class="post__text">
            <img width="300px" style="image-rendering: pixelated;" src="${url}">
        </div>
    `;

    chatDisplay.appendChild(li);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
    activity.textContent = "";
});

const typingUsers = new Set();
const typingTimeouts = new Map();
const TYPING_DELAY = 1500;

function updateActivityText() {
    if (typingUsers.size === 0) {
        activityLoader.hidden = true;
        activityText.textContent = "";
        return;
    }

    const users = [...typingUsers];
    activityLoader.hidden = false;

    if (users.length === 1) {
        activityText.textContent = `${users[0]} is typing...`;
    } else {
        activityText.textContent = `${users.join(", ")} are typing...`;
    }
}

socket.on("activity", (name) => {
    typingUsers.add(name);
    updateActivityText();

    if (typingTimeouts.has(name)) {
        clearTimeout(typingTimeouts.get(name));
    }

    typingTimeouts.set(
        name,
        setTimeout(() => {
            typingUsers.delete(name);
            typingTimeouts.delete(name);
            updateActivityText();
        }, TYPING_DELAY)
    );
});


socket.on('userList', ({ users, room }) => {
    showUsers(users, room);
    console.log('userList:', users);
})

function showUsers(users, room) {
    if (!users || users.length === 0) {
        usersList.textContent = 'not connected to any room';
        return;
    }

    const maxDisplay = 15;
    const displayedUsers = users.slice(0, maxDisplay).map(u => u.name).join(', ');
    const remainingCount = users.length - maxDisplay;

    let content = `Users in ${room}: ${displayedUsers}`;
    if (remainingCount > 0) {
        content += ` and ${remainingCount} more`;
    }

    usersList.textContent = content;
}

function stringtocolor(str) {
    let hash = 0;

    if (str == 'INFO') return '#2b6da3';

    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }   
    const hue = Math.abs(hash) % 360;
    const saturation = 55;
    const lightness = 30;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
