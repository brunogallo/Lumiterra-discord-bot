import { REST, Routes } from "discord.js";
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

const commands = [];

for (const file of commandsFiles) {
  const filePath = join(commandsPath, file);
  const fileUrl = `file://${filePath.replace(/\\/g, "/")}`; // Convert path to file URL
  const { default: command } = await import(fileUrl);
  if ("data" in command) {
    commands.push(command.data.toJSON());
  } else {
    console.log(`Invalid command file: ${filePath}`);
  }
}

const rest = new REST({ version: "10" }).setToken(config.TOKEN);

(async () => {
  try {
    const response = await rest.put(Routes.applicationCommands(config.APP_ID), {
      body: commands,
    });
    console.log(`Successfully registered ${response.length} commands.`);
  } catch (error) {
    console.error("Error registering commands:", error);
  }
})();
