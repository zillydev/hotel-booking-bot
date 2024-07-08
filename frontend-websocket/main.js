document.getElementById('sendButton').addEventListener('click', sendMessage);
document.getElementById('stopButton').addEventListener('click', () => send(ws, 'stop', null));

const userInput = document.getElementById('userInput');
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
});
userInput.focus();

const chatbox = document.getElementById('chatbox');
let currentMessageElement = null;

const websocketURL = `ws://localhost:8000/ws`;
const ws = new WebSocket(websocketURL);

ws.onopen = () => {
    console.log('Connected to WebSocket server');
}

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Received message:', message);
    switch (message.type) {
        case 'newChat':
            newMessage('assistant');
            break;
        case 'chat':
            appendMessage(message.data);
            break;
        case 'chatDone':
            completeMessage();
            break;
        case 'singleChat':
            newMessage('assistant');
            appendMessage(message.data);
            completeMessage();
            break;
        default:
            break;
    }
}

function send(ws, type, obj) {
    ws.send(JSON.stringify({ type, data: obj }));
}

function sendMessage() {
    const userInputValue = userInput.value;
    if (!userInputValue) return;

    newMessage('user');
    appendMessage(userInputValue);
    completeMessage();
    document.getElementById('userInput').value = '';
    send(ws, 'chat', userInputValue);

    userInput.focus();
}

function newMessage(role) {
    const message = document.createElement('p');
    currentMessageElement = message;
    message.className = `message ${role}`;
    chatbox.appendChild(message);
}

function appendMessage(text) {
    const formattedText = text.replace(/\n/g, '<br>');
    currentMessageElement.innerHTML = currentMessageElement.innerHTML + formattedText;
    chatbox.scrollTop = chatbox.scrollHeight;
}

function completeMessage() {
    currentMessageElement = null;
}
