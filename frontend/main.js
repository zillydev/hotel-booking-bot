document.getElementById('sendButton').addEventListener('click', sendMessage);
document.getElementById('userInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const userInput = document.getElementById('userInput').value;
    if (!userInput) return;

    appendMessage('user', userInput);
    document.getElementById('userInput').value = '';

    fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userInput })
    })
    .then(response => response.json())
    .then(data => appendMessage('assistant', data.response))
    .catch(error => console.error('Error:', error));
}

function appendMessage(role, text) {
    const chatbox = document.getElementById('chatbox');
    const message = document.createElement('p');
    message.className = `message ${role}`;
    const formattedText = text.replace(/\n/g, '<br>');
    message.innerHTML = formattedText;
    chatbox.appendChild(message);
    chatbox.scrollTop = chatbox.scrollHeight;
}
