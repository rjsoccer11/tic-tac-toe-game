const socket = io();
const username = localStorage.getItem("username");
const room = localStorage.getItem("room");
let board = Array(9).fill(null);
let mySymbol = null;
let myTurn = false;
let gameOver = false;
let names = {}; // Maps X and O to usernames

socket.emit("join-room", { roomId: room, username });

socket.on("room-full", () => alert("Room full!"));

socket.on("player-list", (players) => {
    const me = players.find(p => p.name === username);
    mySymbol = me?.symbol;

    // Map symbols to names
    players.forEach(p => {
        names[p.symbol] = p.name;
    });

    document.getElementById("status").textContent = players.length === 2
        ? `Game ready! You are "${mySymbol}"`
        : `Waiting for opponent...`;
});

socket.on("start-game", ({ currentPlayer }) => {
    myTurn = currentPlayer === mySymbol;
    gameOver = false;
    renderBoard();
    updateStatus(currentPlayer);
});

socket.on("move-made", ({ index, player, board: newBoard, winner, isDraw, nextPlayer }) => {
    board = newBoard;
    renderBoard();

    if (winner) {
        document.getElementById("status").textContent = `${names[winner]} wins!`;
        gameOver = true;
    } else if (isDraw) {
        document.getElementById("status").textContent = `It's a draw!`;
        gameOver = true;
    } else {
        myTurn = nextPlayer === mySymbol;
        updateStatus(nextPlayer);
    }
});

socket.on("game-reset", ({ board: newBoard, currentPlayer }) => {
    board = newBoard;
    gameOver = false;
    myTurn = currentPlayer === mySymbol;
    renderBoard();
    updateStatus();
});

function renderBoard() {
    const boardDiv = document.getElementById("board");
    boardDiv.innerHTML = "";

    board.forEach((val, i) => {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.textContent = val || "";
        cell.onclick = () => {
            if (myTurn && !val && !gameOver) {
                socket.emit("make-move", { index: i });
                myTurn = false;
                updateStatus();
            }
        };
        boardDiv.appendChild(cell);
    });
}

function updateStatus(currentPlayerSymbol) {
    if (gameOver) return;

    const turnName = names[currentPlayerSymbol];
    document.getElementById("status").textContent = `${names[currentPlayerSymbol]}'s turn`;
}

function reset() {
    socket.emit("reset-game");
}

renderBoard();
