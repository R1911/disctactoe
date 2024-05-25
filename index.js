require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

let gameMode = null; // 'com' or 'player'
let currentPlayer = "X";
let playerX = null;
let playerO = null;
const board = Array(3)
  .fill()
  .map(() => Array(3).fill("-"));

client.once("ready", () => {
  console.log("Ready!");
});

function modeSelectionRow() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("com")
        .setLabel("VS COM")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("player")
        .setLabel("VS Player")
        .setStyle(ButtonStyle.Success)
    ),
  ];
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "tictactoe"
  ) {
    playerX = interaction.user; // Capture the initiating user
    await interaction.reply({
      content: "Choose your game mode:",
      components: modeSelectionRow(),
    });
  } else if (interaction.isButton()) {
    switch (interaction.customId) {
      case "com":
        gameMode = "com";
        playerO = "Computer"; // Set player O as "Computer"
        resetBoard();
        currentPlayer = "X"; // Start the game with player X
        await interaction.update({
          content: `Starting a new game of Tic-Tac-Toe VS COMPUTER`,
          components: createBoardComponents(interaction.user.id),
        });
        break;
      case "player":
        gameMode = "player";
        playerO = null; // Player O will be determined when another player joins
        resetBoard();
        await interaction.update({
          content: `Starting a new game of Tic-Tac-Toe VS PLAYER. Waiting for another player to join.`,
          components: createBoardComponents(interaction.user.id).concat(
            joinGameRow(interaction.user.id)
          ),
        });
        break;
      case "join_game":
        if (playerO || interaction.user.id === playerX.id) return; // Prevent the same user from joining or rejoining
        playerO = interaction.user; // Set the joining user as Player O
        currentPlayer = "X"; // Ensure game starts with Player X
        await interaction.update({
          content: `Player O has joined. Game starts now!`,
          components: createBoardComponents(playerX.id),
        });
        break;
      case "play_again":
        resetBoard();
        await interaction.update({
          content: "Starting a new game!",
          components: createBoardComponents(
            currentPlayer === "X" ? playerX.id : playerO.id
          ),
        });
        break;
      case "stop_playing":
        await interaction.update({ content: "Game ended.", components: [] });
        break;
      default:
        const [x, y] = interaction.customId.split(":").map(Number);
        if (board[x][y] !== "-") return; // Ignore if the cell is already taken
        board[x][y] = currentPlayer; // Place the player's mark
        if (checkWin(currentPlayer)) {
          const winner =
            currentPlayer === "X"
              ? playerX.username
              : playerO === "Computer"
              ? "Computer"
              : playerO.username;
          await interaction.update({
            content: `${winner} wins!`,
            components: endGameButtons(),
          });
          resetBoard();
        } else if (checkDraw()) {
          await interaction.update({
            content: "Draw!",
            components: endGameButtons(),
          });
          resetBoard();
        } else {
          currentPlayer = currentPlayer === "X" ? "O" : "X";
          if (gameMode === "com" && currentPlayer === "O") {
            makeComputerMove();
            if (checkWin("O")) {
              await interaction.update({
                content: `Computer wins!`,
                components: endGameButtons(),
              });
              resetBoard();
            } else if (checkDraw()) {
              await interaction.update({
                content: "Draw!",
                components: endGameButtons(),
              });
              resetBoard();
            } else {
              currentPlayer = "X"; // Switch back to X after computer move
              await interaction.update({
                content: "Next move:",
                components: createBoardComponents(playerX.id),
              });
            }
          } else {
            await interaction.update({
              content: "Next move:",
              components: createBoardComponents(
                currentPlayer === "X" ? playerX.id : playerO.id
              ),
            });
          }
        }
        break;
    }
  }
});

function resetBoard() {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      board[i][j] = "-";
    }
  }
  currentPlayer = "X";
}

function createBoardComponents(interactionUserId) {
  const rows = [];
  for (let i = 0; i < 3; i++) {
    const row = new ActionRowBuilder();
    for (let j = 0; j < 3; j++) {
      let isDisabled = true; // Default state is disabled
      if (board[i][j] === "-") {
        // Enable buttons only if the cell is empty
        if (gameMode === "com") {
          // For VS COM, enable buttons only for player X and when it's X's turn
          isDisabled = currentPlayer !== "X";
        } else if (gameMode === "player") {
          // For VS PLAYER, enable buttons for the current player whose turn it is
          isDisabled =
            interactionUserId !==
            (currentPlayer === "X" ? playerX.id : playerO.id);
        }
      }

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`${i}:${j}`)
          .setLabel(board[i][j])
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(isDisabled)
      );
    }
    rows.push(row);
  }
  return rows;
}

function makeComputerMove() {
  let available = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i][j] === "-") {
        available.push([i, j]);
      }
    }
  }
  if (available.length > 0) {
    let choice = available[Math.floor(Math.random() * available.length)];
    board[choice[0]][choice[1]] = "O";
  }
}

function checkWin(player) {
  for (let row = 0; row < 3; row++) {
    if (
      board[row][0] === player &&
      board[row][0] === board[row][1] &&
      board[row][1] === board[row][2]
    ) {
      return true;
    }
  }
  for (let col = 0; col < 3; col++) {
    if (
      board[0][col] === player &&
      board[0][col] === board[1][col] &&
      board[1][col] === board[2][col]
    ) {
      return true;
    }
  }
  if (
    board[0][0] === player &&
    board[0][0] === board[1][1] &&
    board[1][1] === board[2][2]
  ) {
    return true;
  }
  if (
    board[0][2] === player &&
    board[0][2] === board[1][1] &&
    board[1][1] === board[2][0]
  ) {
    return true;
  }
  return false;
}

function checkDraw() {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (board[row][col] === "-") {
        return false;
      }
    }
  }
  return !checkWin(currentPlayer);
}

function joinGameRow(excludeUserId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("join_game")
        .setLabel("Join as Player O")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(false) // Optionally add condition to disable after joining
    ),
  ];
}

function endGameButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("play_again")
        .setLabel("Play Again")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("stop_playing")
        .setLabel("Stop Playing")
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

client.login(process.env.TOKEN);
