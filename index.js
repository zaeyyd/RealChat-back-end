const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const router = require("./router");
const cors = require("cors");

const PORT = process.env.PORT || 5000;

const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(router);
app.use(cors({ origin: "*" }));

//all the code will run inside this function
io.on("connection", (socket) => {

  // socket event when a user joins a chat room
  socket.on("join", ({ name, room }, callback) => {
    const { user, error } = addUser({ id: socket.id, name, room });

    console.log("joineddd");

    if (error) return callback(error);

    socket.join(user.room);

    // sends message to everyone (except user)
    socket.broadcast.to(user.room).emit("message", {
      user: "admin",
      text: `${user.name} joined ${user.room}`,
    });

    // sends welcome message to user that joins chat room 
    socket.emit("message", {
      user: "admin",
      text: `welcome to ${user.room} ${user.name}!`,
    });

    // *not currently being used*
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  // sends a message to a chat room
  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    console.log(message);

    io.to(user.room).emit("message", { user: user.name, text: message });

    callback();
  });

  // sends letters being typed by users in real-time
  socket.on("showMessage", (message, callback) => {
    const user = getUser(socket.id);

    console.log(message);

    io.to(user.room).emit("liveEdit", { user: user.name, text: message });

    callback();
  });

  // event when a user leaves a chat room
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", {
        user: "admin",
        text: `${user.name} left :(`,
      });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(PORT, () => console.log(`Server on port ${PORT}`));
