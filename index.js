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

const GameState = {
  WAITING: "waiting",
  PLAYING: "playing",
  ENDED: "ended",
};

const PlayerType = {
  COMPUTER: "Computer",
  HUMAN: "Human",
};

let game = {
  state: GameState.WAITING,
  playerX: null,
  playerO: null,
  currentPlayer: "X",
  board: Array.from({ length: 3 }, () => Array(3).fill("-")),
};

client.once("ready", () => console.log("Ready!"));

client.on("interactionCreate", async (interaction) => {
  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "tictactoe"
  ) {
    await handleGameStart(interaction);
  } else if (interaction.isButton()) {
    await handleButtonClick(interaction);
  }
});

async function handleGameStart(interaction) {
  game.playerX = interaction.user;
  await interaction.reply({
    content: "Choose your game mode:",
    components: modeSelectionRow(),
  });
}

async function handleButtonClick(interaction) {
  if (interaction.customId === "com" || interaction.customId === "player") {
    handleModeSelection(interaction);
  } else if (interaction.customId.startsWith("join_game")) {
    await handleJoinGame(interaction);
  } else if (interaction.customId.startsWith("start_")) {
    await handleStartChoice(interaction);
  } else if (interaction.customId.startsWith("play_again")) {
    resetBoard();
    await interaction.update({
      content: "Starting a new game!",
      components: createBoardComponents(
        game.currentPlayer === "X" ? game.playerX.id : game.playerO.id
      ),
    });
  } else if (interaction.customId.startsWith("stop_playing")) {
    await interaction.update({ content: "Game ended.", components: [] });
  } else {
    await handleMove(interaction);
  }
}

async function handleJoinGame(interaction) {
  if (!game.playerO && interaction.user.id !== game.playerX.id) {
    game.playerO = interaction.user;
    game.state = GameState.START_CHOICE; // Update state to choosing who starts
    await interaction.update({
      content: `<@${game.playerO.id}> has joined the game as Player O.\nChoose who starts the game:`,
      components: startChoiceButtons(),
    });
  } else {
    await interaction.reply({
      content: "Sorry, you cannot join this game.",
      ephemeral: true,
    });
  }
}

async function handleStartChoice(interaction) {
  game.state = GameState.PLAYING; // Transition to playing state
  if (interaction.customId === "start_random") {
    game.currentPlayer = Math.random() < 0.5 ? "X" : "O"; // Randomly choose who starts
  } else {
    game.currentPlayer = interaction.customId === "start_x" ? "X" : "O";
  }
  // Prepare the content based on who is the current player
  const startingPlayer =
    game.currentPlayer === "X" ? game.playerX : game.playerO;

  await interaction.update({
    content: `Game starts now! <@${startingPlayer.id}> makes the first will move.`,
    components: createBoardComponents(startingPlayer.id),
  });
}

function startChoiceButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("start_x")
        .setLabel("X starts")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("start_o")
        .setLabel("O starts")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("start_random")
        .setLabel("Random")
        .setStyle(ButtonStyle.Primary)
    ),
  ];
}

async function handleModeSelection(interaction) {
  if (interaction.customId === "com") {
    game.playerO = PlayerType.COMPUTER;
    game.state = GameState.PLAYING;
    resetBoard();
    makeComputerMove(); // Computer makes the first move if selected
    const gameState = checkGameState(); // Check for an immediate win or draw
    await interaction.update({
      content: `Starting a new game of Tic-Tac-Toe VS COMPUTER.`,
      components: createBoardComponents(game.playerX.id),
    });
    if (gameState.reset) resetBoard();
  } else {
    game.playerO = null; // Prepare to set Player O when someone joins
    game.state = GameState.WAITING; // Set the game state to waiting
    await interaction.update({
      content: `Waiting for another player to join the game.\nPress 'Join Game' to play as Player O.`,
      components: joinGameButton(interaction.user.id), // Show join game button
    });
  }
}

async function handleMove(interaction) {
  const [x, y] = interaction.customId.split(":").map(Number);
  if (game.playerO === PlayerType.COMPUTER) {
    if (game.board[x][y] !== "-") return; // Ignore if spot is already taken
    game.board[x][y] = game.currentPlayer; // Mark the spot with current player's mark ('X')

    // Check game state after player's move
    let gameState = checkGameState();
    if (gameState.reset) {
      await interaction.update(gameState.update);
      resetBoard();
      return;
    }

    // If it's now the computer's turn, make a move
    if (game.playerO === PlayerType.COMPUTER) {
      makeComputerMove();
      gameState = checkGameState(); // Check state after computer's move
      await interaction.update(gameState.update);
      if (gameState.reset) resetBoard();
    } else {
      // Update the board for the next player's turn
      await interaction.update({
        content: "Your move!",
        components: createBoardComponents(game.playerX.id),
      });
    }
  } else {
    if (
      game.board[x][y] !== "-" ||
      interaction.user.id !==
        (game.currentPlayer === "X" ? game.playerX.id : game.playerO.id)
    )
      return; // Ignore if spot is taken or it's not their turn

    game.board[x][y] = game.currentPlayer; // Mark the spot
    let gameState = checkGameState();
    if (gameState.reset) {
      await interaction.update(gameState.update);
      resetBoard();
      return;
    }

    // Switch players
    game.currentPlayer = game.currentPlayer === "X" ? "O" : "X";
    await interaction.update({
      content: `It's now <@${
        game.currentPlayer === "X"
          ? game.playerX.id
          : game.playerO.id
      }>'s turn!`,
      components: createBoardComponents(
        game.currentPlayer === "X" ? game.playerX.id : game.playerO.id
      ),
    });
  }
}

function joinGameButton(excludeUserId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("join_game")
        .setLabel("Join as Player O")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(false)
    ),
  ];
}

function makeComputerMove() {
  let available = [];
  // Collect all empty spots on the board
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (game.board[i][j] === "-") {
        available.push([i, j]);
      }
    }
  }
  // Choose a random empty spot for the computer's move
  if (available.length > 0) {
    let choice = available[Math.floor(Math.random() * available.length)];
    game.board[choice[0]][choice[1]] = "O";
    game.currentPlayer = "X"; // Switch turn back to player
  }
}

function resetBoard() {
  game.board = Array.from({ length: 3 }, () => Array(3).fill("-"));
  game.currentPlayer = "X";
}

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

function createBoardComponents(interactionUserId) {
  const rows = [];
  for (let i = 0; i < 3; i++) {
    const row = new ActionRowBuilder();
    for (let j = 0; j < 3; j++) {
      // Determine if the button should be disabled
      const isDisabled =
        game.board[i][j] !== "-" ||
        (game.playerO === PlayerType.COMPUTER && game.currentPlayer !== "X") ||
        (game.playerO !== PlayerType.COMPUTER &&
          interactionUserId !==
            (game.currentPlayer === "X" ? game.playerX.id : game.playerO.id));

      // Ensure that each button has a valid label, never an empty string
      const label = game.board[i][j] === "-" ? "⬜" : game.board[i][j]; // Use a white square emoji as a placeholder for empty cells

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`${i}:${j}`)
          .setLabel(label) // Use label which ensures it is never an empty string
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(isDisabled)
      );
    }
    rows.push(row);
  }
  return rows;
}

function endGameButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("play_again")
        .setLabel("Play Again")
        .setStyle(ButtonStyle.Success), // Correct method to set button style
      new ButtonBuilder()
        .setCustomId("stop_playing")
        .setLabel("Stop Playing")
        .setStyle(ButtonStyle.Danger) // Correct method to set button style
    ),
  ];
}

function checkGameState() {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // Rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // Columns
    [0, 4, 8],
    [2, 4, 6], // Diagonals
  ];
  for (let line of lines) {
    const [a, b, c] = line.map(
      (index) => game.board[Math.floor(index / 3)][index % 3]
    );
    if (a !== "-" && a === b && b === c) {
      return {
        update: {
          content: `<@${
            game.currentPlayer === "X"
              ? game.playerX.id
              : game.playerO.id
          }> wins!`,
          components: endGameButtons(),
        },
        reset: true,
      };
    }
  }

  // Check for a draw
  if (!game.board.some((row) => row.includes("-"))) {
    return {
      update: {
        content: "Draw!",
        components: endGameButtons(),
      },
      reset: true,
    };
  }

  // Game continues
  return {
    update: {
      content: `Next move: <@${
        game.currentPlayer === "X"
          ? game.playerX.id
          : game.playerO.id
      }>`,
      components: createBoardComponents(
        game.currentPlayer === "X" ? game.playerX.id : game.playerO.id
      ),
    },
    reset: false,
  };
}

client.login(process.env.TOKEN);
