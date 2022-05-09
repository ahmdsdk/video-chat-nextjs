const express = require("express");
const next = require("next");
const http = require("http");
const socket = require("socket.io");

const port = parseInt(process.env.PORT) || 3000;
const dev = process.env.NODE !== "production";

process.env.__NEXT_REACT_ROOT = "true"

const app = next({ dev });

const handle = app.getRequestHandler();

let users = [];
let userCount = 0;

app.prepare().then(() => {
    const server = http.createServer((req, res) => {
        return handle(req, res);
    });

    const io = socket(server, {
        cors: {
            origin: `http://localhost:${port}`,
            methods: ['GET', 'POST']
        }
    });
    
    // when a new connection has been established
    io.on("connection", (socket) => {
        // console.log("socket connected!", socket.id);
        socket.emit("userId", socket.id);

        // when a new user has set up a username
        socket.on("addUser", (user, callback) => {
            const err = {};
            const exists = users.some(u => u.name === user.name);

            if (exists) {
                err.status = 404;
                err.msg = "User already exists"
                return callback(err, err.msg);
            }

            users.push({
                name: user.name,
                id: socket.id
            });
            userCount++;

            // console.log("users:", users);
            socket.broadcast.emit("allUsers", users);
            return callback(false, err.msg);
        });

        // if for some reason an existing user disconnected and connected again
        socket.on("updateUserId", ({ name, id }) => {
            const exists = users.some(u => u.name === name);
            if (exists) {
                const index = users.indexOf(u => u.name === name);
                users[index].id = id;                
            } else {
                users.push({
                    name,
                    id: socket.id
                });
                userCount++;
            }
            // console.log("updated users:", users);
        });

        // when all users are requested
        socket.on("getUsers", () => {
            socket.emit("allUsers", users);
        });
        
        // when a call is made
        socket.on("callUser", (data) => {
            // console.log(`calling user from ${data.name} id: ${data.from} to ${data.userToCall}`);
            io.to(data.userToCall).emit("userCalling", { signal: data.signalData, from: data.from, name: data.name });
        });
        
        // when a call is answered
        socket.on("answerCall", (data) => {
            io.to(data.to).emit("callAccepted", data.signal);
        });

        socket.on("endCall", () => {
            socket.broadcast.emit("callEnded", socket.id);
        });

        socket.on("disconnected", ({name, id}) => {
            // console.log("socket disconnected", id);
            users = users.filter(u => u.id !== id);
        });
    });

    server.listen(port, (err) => {
        if (err) throw err
        console.log(`> Server listening on http://localhost:${port}`);
    });
}).catch((ex) => {
    console.error(ex.stack);
    process.exit(1);
});