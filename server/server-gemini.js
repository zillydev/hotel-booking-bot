const { calculatePrice, bookRoom } = require("./functions-gemini");
const { sequelize, ChatHistory } = require("./models");
const { frontendUrl } = require('./config');

const axios = require('axios');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors( { origin: frontendUrl } ));

require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

let chat;

let rooms = [];
let systemMessage = '';

const tools = {
  functionDeclarations: [
    // Calculate the price of the room based on the duration of stay and the price per night
    {
      name: "calculatePrice",
      description: "When the user confirms the room and duration of stay in nights, calculate the price of the room based on the duration of stay and the price per night of the selected room. After calculating the price, display the total price to the user.",
      parameters: {
        type: "OBJECT",
        properties: {
          pricePerNight: {
            type: "NUMBER",
            description: "The price per night of the room."
          },
          duration: {
            type: "NUMBER",
            description: "The duration of stay in nights."
          }
        },
        required: ["pricePerNight", "duration"]
      }
    },

    // Confirm the booking with the user
    {
      name: "bookRoom",
      description: "Book the room for the user. Return the booking id.",
      parameters: {
        type: "OBJECT",
        properties: {
          fullName: {
            type: "STRING",
            description: "The full name of the user."
          },
          email: {
            type: "STRING",
            description: "The email of the user."
          },
          duration: {
            type: "NUMBER",
            description: "The duration of stay in nights."
          },
          roomId: {
            type: "NUMBER",
            description: "The id of the room booked."
          }
        },
        required: ["fullName", "email", "duration", "roomId"]
      }
    }
  ]
}

const availableFunctions = {
  calculatePrice: calculatePrice,
  bookRoom: bookRoom
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  tools: tools,
});

const init = async () => {
  await sequelize.sync();
  rooms = await axios.get('https://bot9assignement.deno.dev/rooms').then(response => response.data);
  console.log(rooms);
  systemMessage = `You are a hotel booking assistant. Speak in a friendly manner. Format the responses in a readable way. Dont use bold or italics formatting. Available room data: ${JSON.stringify(rooms)}. Display room data in detail. Then ask the user to select a room. Then ask the duration of stay in nights. Then confirm the booking with the user. Dont tell things that are not mentioned to you, like you will receive a confirmation mail.`;
  chat = model.startChat({
    systemInstruction: {
        role: "system",
        parts: [{ text: systemMessage }]
      }
  });
}

const saveChatToDatabase = async (role, content) => {
  try {
    await ChatHistory.create({ role, content });
  } catch (error) {
    console.error('Error saving chat to database: ', error);
  }
};

app.post('/chat', async (req, res) => {
  const userInput = req.body.message;
  if (userInput === '') {
    return;
  }
  saveChatToDatabase('user', userInput);

  const result = await chat.sendMessage(userInput);
  const call = result.response.functionCalls();

  if (call) {
    const functionCall = call[0];
    console.log(functionCall);
    const functionResponse = await availableFunctions[functionCall.name](functionCall.args);

    const result2 = await chat.sendMessage([{
      functionResponse: {
        name: functionCall.name,
        response: functionResponse
      }
    }]);

    const response = result2.response.text();
    saveChatToDatabase('assistant', response);
    res.json({ response: response });
  } else {
    const response = await result.response.text();
    saveChatToDatabase('assistant', response);
    res.json({ response: response });
  }
});

init();

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
