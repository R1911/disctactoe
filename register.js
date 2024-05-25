const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
require("dotenv").config();

const clientId = process.env.CLIENTID;
const guildId = process.env.GUILDID;
const token = process.env.TOKEN;

const commands = [
  {
    name: "tictactoe",
    description: "Starts a new game of Tic-Tac-Toe!",
  },
];

const rest = new REST({ version: "9" }).setToken(token);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    // Register commands for a specific guild
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });

    // Alternatively, register commands globally (may take up to an hour to propagate)
    // await rest.put(
    //     Routes.applicationCommands(clientId),
    //     { body: commands }
    // );

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();
