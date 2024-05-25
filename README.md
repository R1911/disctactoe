# DiscTacToe

Very simple TicTacToe bot for Discord built on [Discord.JS](https://github.com/discordjs/discord.js) for a school dev project

## Features:
- Gamemodes: VS COM and VS Player
  - VS COM
    - When playing against computer, bot makes its own randomized choices
  - VS Player
    - When playing against another player it first waits for another player to join in and then starts the game
    - Still need to implement a proper turn management
    - Still need to lock the game for only the two players who have joined as player X and player O, so that random users can't make turns for either player
