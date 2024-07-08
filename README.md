# Hotel Booking Chatbot

This project is a conversational AI chatbot built to assist users with hotel booking inquiries and reservations.

## Features

- Hotel Search: Users can search for hotels based on data fetched from mock api.
- Booking Assistance: The chatbot guides users through the booking process.
- User-Friendly Interface: Easy-to-use interface for a smooth user experience.
- OpenAI/Gemini Integration: Powered by the OpenAI API/Gemini API for natural language understanding and response generation.
- Websockets: Streaming functionality using websockets for real-time chatbot responses.

## Screenshots

![hotel booking chatbot1](https://github.com/zillydev/hotel-booking-bot/assets/75972640/ddcf0a1c-d36e-413f-a9c9-c4c17b822b17)

![hotel booking chatbot2](https://github.com/zillydev/hotel-booking-bot/assets/75972640/8d45018f-ac49-41e0-9f1f-019064180935)

## Installation

### OpenAI/Gemini API standard chatbot

1. In the `server` directory, create a `.env` file with `.env.example` as a template.
2. Add your OpenAI API/Gemini API key to the `.env` file.
3. Run the following commands:

```bash
yarn install
yarn start-openai # for openai api
yarn start-gemini # for gemini api
```

4. In the `frontend` directory, run the following commands:

```bash
yarn install
yarn start
```

5. Open your browser and navigate to `http://127.0.0.1:8080`.

### OpenAI API websockets chatbot

1. In the `server-websocket` directory, create a `.env` file with `.env.example` as a template.
2. Add your OpenAI API key to the `.env` file.
3. Run the following commands:

```bash
yarn install
yarn start
```

4. In the `frontend-websocket` directory, run the following commands:

```bash
yarn install
yarn start
```

5. Open your browser and navigate to `http://127.0.0.1:8080`.
