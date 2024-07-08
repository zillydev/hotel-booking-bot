const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');

const { calculatePrice, bookRoom } = require("./functions");
const { sequelize, ChatHistory } = require("./models");

require('dotenv').config();

const { OpenAI, APIUserAbortError } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = 'gpt-4o';

const chatHistory = [];

let rooms = [];
let systemMessage = '';

let currentStream = null;

const tools = [
  // Calculate the price of the room based on the duration of stay and the price per night
  {
    type: "function",
    function: {
      name: "calculatePrice",
      description: "When the user confirms the room and duration of stay in nights, calculate the price of the room based on the duration of stay and the price per night of the selected room. Display the total price to the user.",
      parameters: {
        type: "object",
        properties: {
          pricePerNight: {
            type: "number",
            description: "The price per night of the room."
          },
          duration: {
            type: "number",
            description: "The duration of stay in nights."
          }
        },
        required: ["pricePerNight", "duration"]
      }
    }
  },

  // Confirm the booking with the user
  {
    type: "function",
    function: {
      name: "bookRoom",
      description: "Book the room for the user, only when the user has provided all details. Return the booking id.",
      parameters: {
        type: "object",
        properties: {
          fullName: {
            type: "string",
            description: "The full name of the user."
          },
          email: {
            type: "string",
            description: "The email of the user."
          },
          duration: {
            type: "number",
            description: "The duration of stay in nights."
          },
          roomId: {
            type: "number",
            description: "The id of the room booked."
          }
        },
        required: ["fullName", "email", "duration", "roomId"]
      }
    }
  }
]

const availableFunctions = {
  calculatePrice: calculatePrice,
  bookRoom: bookRoom
}

const saveChatToDatabase = async (role, content) => {
  try {
    await ChatHistory.create({ role, content });
  } catch (error) {
    console.error('Error saving chat to database: ', error);
  }
};

function send(ws, type, obj) {
  ws.send(JSON.stringify({ type, data: obj }));
}

const main = async () => {
  await sequelize.sync();
  rooms = await axios.get('https://bot9assignement.deno.dev/rooms').then(response => response.data);
  console.log(rooms);
  systemMessage = `You are a hotel booking assistant. Speak in a friendly manner. Format the responses in a readable way. Dont use bold or italics formatting. Don't make assumptions about what values to plug into functions. Ask for clarification if a user request is ambiguous. Available room data: ${JSON.stringify(rooms)}. Display room data in detail. Then ask the user to select a room. Then ask the duration of stay in nights. Then ask for confirmation. Then once user confirms booking, book the room. Dont tell things that are not mentioned to you, like you will receive a confirmation mail.`;
  chatHistory.push({ role: 'system', content: systemMessage });

  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server, path: '/ws' });

  websocketconnection(wss);

  const port = 8000;

  server.listen(port, () => {
      console.log(`Server started on http://localhost:${port}`);
  });
}

const websocketconnection = async (wss) => {
  wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
      const event = JSON.parse(message);
      const type = event.type;
      const data = event.data;
      switch (type) {
        case 'chat':
          chat(ws, data);
          break;
        case 'stop':
          if (currentStream)
            currentStream.abort();
          break;
        default:
          break;
      }
    });
  });
}

const chat = async (ws, data) => {
  console.log(data);
  if (data === '') {
    return;
  }
  chatHistory.push({ role: 'user', content: data });
  saveChatToDatabase('user', data);
  send(ws, 'newChat', '');

  try {
    const stream = openai.beta.chat.completions.stream({
      model: model,
      messages: chatHistory,
      tools: tools,
      stream: true
    });
    currentStream = stream;

    for await (const part of stream) {
      const content = part.choices[0]?.delta?.content || '';
      send(ws, 'chat', content);
    }
    currentStream = null;

    const response = (await stream.finalChatCompletion()).choices[0].message;
    console.log("response: ", response);

    const toolCalls = response.tool_calls;

    if (toolCalls) {
      chatHistory.push(response);
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionToCall = availableFunctions[functionName];
        const parameters = JSON.parse(toolCall.function.arguments);

        try {
          const functionResponse = await functionToCall(parameters);
          chatHistory.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: functionResponse
          });
        } catch (error) {
          console.error(`Error calling function ${functionName}: `, error);
          throw new Error('Error calling function');
        }
      }

      const secondStream = openai.beta.chat.completions.stream({
        model: model,
        messages: chatHistory,
        tools: tools,
        stream: true
      });
      currentStream = secondStream;

      for await (const part of secondStream) {
        const content = part.choices[0]?.delta?.content || '';
        send(ws, 'chat', content);
      }
      currentStream = null;
      if (secondStream.aborted) return;

      const secondResponse = (await secondStream.finalChatCompletion()).choices[0].message.content;
      console.log("secondResponse: ", secondResponse);

      await saveChatToDatabase('assistant', secondResponse);
      chatHistory.push({ role: 'assistant', content: secondResponse });

      send(ws, 'chatDone', '');
    } else {
      chatHistory.push({ role: 'assistant', content: response.content });
      send(ws, 'chatDone', '');
    }
  } catch (error) {
    if (error instanceof APIUserAbortError) return;

    console.error('Error:', error);
    send(ws, 'singleChat', 'An error occurred. Please try again.');
  }
}

main();
