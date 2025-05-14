const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = {};

io.on("connection", (socket) => {
    socket.on("join-room", ({ roomId, username }) => {
        if (!rooms[roomId]) {
        rooms[roomId] = {
            players: [],
            board: Array(9).fill(null),
            currentPlayer: "X",
            sockets: {},
            names: {},
        };
    }

        const room = rooms[roomId];
    if (room.players.length >= 2) {
        socket.emit("room-full");
        return;
    }

        const symbol = room.players.length === 0 ? "X" : "O";
    room.players.push({ id: socket.id, name: username, symbol });
    room.sockets[symbol] = socket.id;
    room.names[symbol] = username; // Map symbol to username
    socket.join(roomId);

    io.to(roomId).emit("player-list", room.players);

    if (room.players.length === 2) {
        io.to(roomId).emit("start-game", {
            currentPlayer: room.currentPlayer,
            names: room.names, // Send mapping
        });
    }

        socket.on("make-move", ({ index }) => {
            const symbol = room.players.find(p => p.id === socket.id)?.symbol;
            if (
                symbol === room.currentPlayer &&
                room.board[index] === null
            ) {
                room.board[index] = symbol;
                const winner = getWinner(room.board);
                const isDraw = !room.board.includes(null);

                if (winner) {
                    io.to(roomId).emit("move-made", {
    index,
    player: symbol,
    board: room.board,
    winner,
    isDraw: false,
    nextPlayer: room.currentPlayer,
    names: room.names, // Include player names
});
                } else if (isDraw) {
                    io.to(roomId).emit("move-made", {
    index,
    player: symbol,
    board: room.board,
    winner,
    isDraw: false,
    nextPlayer: room.currentPlayer,
    names: room.names, // Include player names
});
                } else {
                    room.currentPlayer = symbol === "X" ? "O" : "X";
                    io.to(roomId).emit("move-made", {
    index,
    player: symbol,
    board: room.board,
    winner,
    isDraw: false,
    nextPlayer: room.currentPlayer,
    names: room.names, // Include player names
});
                }
            }
        });

        socket.on("reset-game", () => {
            room.board = Array(9).fill(null);
            room.currentPlayer = "X";
            io.to(roomId).emit("game-reset", {
                board: room.board,
                currentPlayer: room.currentPlayer,
            });
        });

        socket.on("disconnect", () => {
            room.players = room.players.filter(p => p.id !== socket.id);
            io.to(roomId).emit("player-list", room.players);
        });
    });
});

function getWinner(board) {
    const combos = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
    ];
    for (let [a, b, c] of combos) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
