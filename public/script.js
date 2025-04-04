const socket = io();

let username = null;
let currentRoomId = null; // Avoid naming conflicts with event parameters

// Room creation
document.getElementById("create-room").onclick = () => {
  username = document.getElementById("username").value.trim();
  if (!username) {
    alert("Please enter your username.");
    return;
  }
  socket.emit("create-room", username);
};

socket.on("room-created", (newRoomId) => {
  document.getElementById("room-section").classList.add("hidden");
  document.getElementById("editor-section").classList.remove("hidden");
  document.getElementById("current-room-id").innerText = newRoomId;
  currentRoomId = newRoomId; // Save the room ID locally
});

// Room joining
document.getElementById("join-room").onclick = () => {
  username = document.getElementById("username").value.trim();
  const roomIdInput = document.getElementById("room-id").value.trim();
  if (!username || !roomIdInput) {
    alert("Please enter both username and room ID.");
    return;
  }
  socket.emit("join-room", { roomId: roomIdInput, username });
};

socket.on("room-joined", ({ roomId, code }) => {
  document.getElementById("room-section").classList.add("hidden");
  document.getElementById("editor-section").classList.remove("hidden");
  document.getElementById("current-room-id").innerText = roomId;
  document.getElementById("code-editor").value = code;
  currentRoomId = roomId;
});

// Update members list
socket.on("update-members", (members) => {
  const membersList = document.getElementById("members");
  membersList.innerHTML = ""; // Clear existing members
  members.forEach((member) => {
    const li = document.createElement("li");
    li.textContent = member.username;
    membersList.appendChild(li);
  });
});

// Handle live code updates
const codeEditor = document.getElementById("code-editor");
codeEditor.oninput = () => {
  if (document.getElementById("token-status").innerText === "You hold the token.") {
    socket.emit("code-update", codeEditor.value);
  } else {
    alert("You don't hold the token. Request it first!");
  }
};

// Sync code updates with other users
socket.on("code-update", (code) => {
  if (codeEditor.value !== code) {
    codeEditor.value = code; // Update only if the received code is different
  }
});

// Handle token requests
document.getElementById("request-token").onclick = () => {
  socket.emit("request-token");
};

socket.on("grant-token", (holder) => {
  if (holder === username) {
    alert("You have been granted the token. You can now edit the code.");
    document.getElementById("token-status").innerText = "You hold the token.";
  } else {
    document.getElementById("token-status").innerText = `${holder} holds the token.`;
  }
});

socket.on("release-token", () => {
  document.getElementById("token-status").innerText = "Token released.";
});

// Error handling
socket.on("error", (message) => {
  alert(`Error: ${message}`);
});

// Notify when a user joins
socket.on("user-joined", (newUser) => {
  console.log(`${newUser} has joined the room.`);
  alert(`${newUser} has joined the room.`);
});

// Handle releasing the token
document.getElementById("release-token").onclick = () => {
  if (document.getElementById("token-status").innerText === "You hold the token.") {
    socket.emit("release-token");
  } else {
    alert("You don't hold the token to release.");
  }
};

// Handle disconnections or room exits
socket.on("user-left", (user) => {
  alert(`${user} has left the room.`);
});
