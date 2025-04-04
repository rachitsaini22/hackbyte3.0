
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // Serve static files (HTML, CSS, JS)

const rooms = {}; // To store room details and their members
const roomTokens = {}; // To manage token ownership per room
const roomCode = {}; // To store the current code for each room

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle room creation
  socket.on("create-room", (username) => {
    if (!username) {
      return socket.emit("error", "Username cannot be empty.");
    }

    const roomId = generateRoomId();
    rooms[roomId] = [{ id: socket.id, username }];
    roomTokens[roomId] = null;
    roomCode[roomId] = "";
    socket.join(roomId);

    console.log(`Room created: ${roomId}`);
    socket.emit("room-created", roomId);
    io.to(roomId).emit("update-members", rooms[roomId]);
  });

  // Handle room joining
  socket.on("join-room", ({ roomId, username }) => {
    if (!username || !roomId) {
      return socket.emit("error", "Room ID and Username are required.");
    }

    if (!rooms[roomId]) {
      return socket.emit("error", "Room does not exist.");
    }

    if (rooms[roomId].some((member) => member.username === username)) {
      return socket.emit("error", "Username is already taken in this room.");
    }

    rooms[roomId].push({ id: socket.id, username });
    socket.join(roomId);
    socket.emit("room-joined", { roomId, code: roomCode[roomId] });
    io.to(roomId).emit("update-members", rooms[roomId]);
    socket.to(roomId).emit("user-joined", username);
  });

  // Handle token requests
  socket.on("request-token", () => {
    const roomId = getRoomId(socket.id);
    if (roomId) {
      if (!roomTokens[roomId]) {
        roomTokens[roomId] = socket.id;
        io.to(roomId).emit("grant-token", getUsername(roomId, socket.id));
      } else {
        socket.emit("error", "Token is already held by another user.");
      }
    }
  });

  // Handle token release
  socket.on("release-token", () => {
    const roomId = getRoomId(socket.id);
    if (roomId && roomTokens[roomId] === socket.id) {
      roomTokens[roomId] = null;
      io.to(roomId).emit("release-token");
    } else {
      socket.emit("error", "You do not hold the token.");
    }
  });

  // Handle code updates
  socket.on("code-update", (code) => {
    const roomId = getRoomId(socket.id);
    if (roomId && roomTokens[roomId] === socket.id) {
      roomCode[roomId] = code;
      socket.to(roomId).emit("code-update", code);
    } else {
      socket.emit("error", "You do not have editing access.");
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const roomId = getRoomId(socket.id);
    if (roomId) {
      rooms[roomId] = rooms[roomId].filter((member) => member.id !== socket.id);

      if (roomTokens[roomId] === socket.id) {
        roomTokens[roomId] = null;
        io.to(roomId).emit("release-token");
      }

      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
        delete roomTokens[roomId];
        delete roomCode[roomId];
      } else {
        io.to(roomId).emit("update-members", rooms[roomId]);
      }
    }
    console.log("A user disconnected:", socket.id);
  });
});

// Helper function to generate a unique room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Helper function to get the room ID for a given socket ID
function getRoomId(socketId) {
  for (const roomId in rooms) {
    if (rooms[roomId].some((member) => member.id === socketId)) {
      return roomId;
    }
  }
  return null;
}

// Helper function to get the username of a user in a room
function getUsername(roomId, socketId) {
  const member = rooms[roomId]?.find((member) => member.id === socketId);
  return member ? member.username : null;
}

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
