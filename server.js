import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import open from "open";

dotenv.config();
const app = express();
const PORT = 3000;

// Spotify credentials from .env file
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/callback";

let accessToken = ""; // Store the token here

// Step 1: Redirect user to Spotify login
app.get("/login", (req, res) => {
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=user-library-read playlist-read-private`;
  res.redirect(authUrl);
});

// Step 2: Handle Spotify callback and get access token
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  const tokenUrl = "https://accounts.spotify.com/api/token";

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await response.json();
    accessToken = data.access_token; // Store token

    res.send("Authentication successful! You can now make API requests.");
  } catch (error) {
    console.error("Error getting access token:", error);
    res.status(500).send("Error retrieving token.");
  }
});

// FETCH A USER'S PUBLIC PLAYLISTS
app.get("/user-playlists", async (req, res) => {
  if (!accessToken) return res.status(401).send("Missing access token. Please log in.");

  const userId = req.query.user_id; // Pass Spotify user ID as a query param
  if (!userId) return res.status(400).send("Please provide a Spotify user ID.");

  try {
    const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (data.error) {
      return res.status(data.error.status).send(data.error.message);
    }

    res.json(data.items.map((playlist) => ({
      name: playlist.name,
      id: playlist.id,
      total_tracks: playlist.tracks.total,
      spotify_url: playlist.external_urls.spotify,
      image: playlist.images.length > 0 ? playlist.images[0].url : null,
    })));
  } catch (error) {
    console.error("Error fetching user playlists:", error);
    res.status(500).send("Error fetching user playlists.");
  }
});


// Start the server
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Opening login page...");
  await open("http://localhost:3000/login");
});
