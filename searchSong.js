import "dotenv/config";
import fetch from "node-fetch";
import getAccessToken from "./spotifyAuth.js";

async function searchSong(songName) {
  const token = await getAccessToken();
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
    songName
  )}&type=track&limit=1`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    const track = data.tracks.items[0];

    if (track) {
      console.log(`🎵 Song: ${track.name}`);
      console.log(`👨‍🎤 Artist: ${track.artists.map((a) => a.name).join(", ")}`);
      console.log(`🔗 Spotify URL: ${track.external_urls.spotify}`);
    } else {
      console.log("No song found!");
    }
  } catch (error) {
    console.error("Error fetching song:", error);
  }
}

// Example Usage
searchSong("Blinding Lights"); // Replace with your song name
