const axios = require('axios');

const calculatePrice = async ({ pricePerNight, duration }) => {
    console.log(pricePerNight, duration);
    return `Total price: ${pricePerNight * duration}`;
}

const bookRoom = async ({ fullName, email, duration, roomId }) => {
    const bookingData = { fullName, email, nights: duration, roomId };
    console.log(bookingData);
    const response = await axios.post('https://bot9assignement.deno.dev/book', bookingData);
    console.log(response.data);
    return `Booking id: ${response.data.bookingId}`;
}

module.exports = { calculatePrice, bookRoom };
