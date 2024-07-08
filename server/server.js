const { calculatePrice, bookRoom } = require("./functions");
const { sequelize, ChatHistory } = require("./models");
const { frontendUrl } = require('./config');

const axios = require('axios');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors( { origin: frontendUrl } ));

require('dotenv').config();

const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = 'gpt-3.5-turbo';

const chatHistory = [];

let rooms = [];
let systemMessage = '';

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
      description: "Book the room for the user. Return the booking id.",
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

const init = async () => {
  await sequelize.sync();
  rooms = await axios.get('https://bot9assignement.deno.dev/rooms').then(response => response.data);
  console.log(rooms);
  systemMessage = `You are a hotel booking assistant. Speak in a friendly manner. Format the responses in a readable way. Dont use bold or italics formatting. Available room data: ${JSON.stringify(rooms)}. Display room data in detail. Then ask the user to select a room. Then ask the duration of stay in nights. Then confirm the booking with the user. Dont tell things that are not mentioned to you, like you will receive a confirmation mail.`;
  chatHistory.push({ role: 'system', content: systemMessage });
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

  chatHistory.push({ role: 'user', content: userInput });
  await saveChatToDatabase('user', userInput);

  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: chatHistory,
      tools: tools
    });

    const response = completion.choices[0].message;
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

      const secondResponse = await openai.chat.completions.create({
        model: model,
        messages: chatHistory,
        tools: tools
      });

      const response2 = secondResponse.choices[0].message.content;

      await saveChatToDatabase('assistant', response2);
      chatHistory.push({ role: 'assistant', content: response2 });

      res.json({ response: response2 });
    } else {
      chatHistory.push({ role: 'assistant', content: response.content });
      res.json({ response: response.content });
    }
  } catch (error) {
    console.error('Error when generating response: ', error);
    res.json({ response: 'Sorry, I am unable to respond at the moment. Please try again later.' });
  }
});

init().catch(error => console.error('Error when initialising: ', error));

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
