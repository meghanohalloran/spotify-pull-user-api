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

// FETCH USER'S SAVED SONGS 
app.get("/saved-songs", async (req, res) => {
  if (!accessToken) return res.status(401).send("Missing access token. Please log in.");

  try {
    const response = await fetch("https://api.spotify.com/v1/me/tracks", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching saved songs:", error);
    res.status(500).send("Error fetching saved songs.");
  }
});

// SEARCH FOR A SPECIFIC SONG 
app.get("/search", async (req, res) => {
  if (!accessToken) return res.status(401).send("Missing access token. Please log in.");

  const query = req.query.q;
  if (!query) return res.status(400).send("Please provide a search query.");

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    // Debugging step
    console.log("Raw Spotify API Response:", JSON.stringify(data, null, 2));

    // Check if 'tracks' and 'items' exist
    if (!data.tracks || !data.tracks.items) {
      return res.status(500).send("Invalid response from Spotify API.");
    }

    // Extract only necessary song details
    const formattedResults = data.tracks.items.map((track) => ({
      song: track.name,
      artist: track.artists.map((artist) => artist.name).join(", "),
      album: track.album.name,
      album_cover: track.album.images.length > 0 ? track.album.images[0].url : null, // Get album cover
      preview_url: track.preview_url, // 30s preview
      spotify_url: track.external_urls.spotify, // Link to Spotify
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error("Error searching for song:", error);
    res.status(500).send("Error searching for song.");
  }
});

// FETCH USER'S PLAYLISTS (LIMITED TO A MARKET)
app.get("/user-playlists", async (req, res) => {
  if (!accessToken) return res.status(401).send("Missing access token. Please log in.");

  const market = req.query.market || "US"; // Default to US if not provided

  try {
    // Fetch user's playlists
    const playlistsResponse = await fetch("https://api.spotify.com/v1/me/playlists", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const playlistsData = await playlistsResponse.json();
    
    if (!playlistsData.items) {
      return res.status(500).send("Error retrieving playlists.");
    }

    // Fetch tracks for each playlist (limited to the specified market)
    const playlists = await Promise.all(
      playlistsData.items.map(async (playlist) => {
        const tracksResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?market=${market}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        const tracksData = await tracksResponse.json();
        
        return {
          playlist_name: playlist.name,
          playlist_url: playlist.external_urls.spotify,
          tracks: tracksData.items
            ? tracksData.items.map((item) => ({
                song: item.track?.name,
                artist: item.track?.artists.map((artist) => artist.name).join(", "),
                album: item.track?.album.name,
                spotify_url: item.track?.external_urls?.spotify,
              }))
            : [],
        };
      })
    );

    res.json(playlists);
  } catch (error) {
    console.error("Error fetching playlists:", error);
    res.status(500).send("Error fetching playlists.");
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
