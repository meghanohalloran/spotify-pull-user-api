import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

const getToken = async () => {
  console.log("CLIENT_ID:", CLIENT_ID);
  console.log("CLIENT_SECRET:", CLIENT_SECRET);

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("Error: CLIENT_ID or CLIENT_SECRET is missing. Check your .env file!");
    return;
  }

  const url = "https://accounts.spotify.com/api/token";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  const data = await response.json();
  console.log("Response:", data);
};

getToken();