import { Client, Events, GatewayIntentBits, Collection } from "discord.js";
import config from "./config.json" assert { type: "json" };
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const commandsPath = join(__dirname, "commands");
const commandsFiles = (await fs.readdir(commandsPath)).filter((file) =>
  file.endsWith(".js")
);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.config = config;
client.cooldowns = new Map();
client.cache = new Map();
client.commands = new Collection();

for (const file of commandsFiles) {
  const filePath = join(commandsPath, file);
  const fileUrl = `file://${filePath.replace(/\\/g, "/")}`;
  const { default: command } = await import(fileUrl);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`Invalid command file: ${filePath}`);
  }
}

console.log("Logging in...");
client.login(client.config.TOKEN);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.log(`Invalid command: ${interaction.commandName}`);
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error("Error executing command:", error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});
