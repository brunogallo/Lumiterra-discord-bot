import { SlashCommandBuilder } from "@discordjs/builders";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { fetchOnline } from "../api/api.js";

async function generateEmbed(response, limit = 13) {
  const appIdMapping = {
    "game-scene-world-10001-101": "AS - SG 1",
    "game-scene-world-10001-102": "AS - SG 2",
    "game-scene-world-10001-103": "AS - SG 3 Grand Opening",
    "game-scene-world-10001-401": "SA - BR 1",
    "game-scene-world-10001-402": "SA - BR 2",
    "game-scene-world-10001-403": "SA - BR 3 Grand Opening",
  };

  // Acessar o array de servidores
  const servers = response.list;

  if (!Array.isArray(servers)) {
    throw new Error("Expected 'servers' to be an array");
  }

  // Limitar os servidores exibidos
  const displayedServers = servers.slice(0, limit);

  // Construir os campos com o nome traduzido
  const fields = displayedServers.map((server, index) => {
    const serverName = appIdMapping[server.appId] || server.appId; // Nome mapeado ou padrão

    return {
      name: `${index + 1}. ${serverName}`,
      value:
        `**Cluster:** ${server.inCluster}\n` +
        `**Online Users:** ${server.online} / ${server.maxOnline}\n` +
        `**Agent URL:** [${server.agentUrl}](https://${server.agentUrl})\n` +
        `___\n`,
      inline: false,
    };
  });

  // Retornar o embed configurado
  return {
    color: 0x0099ff,
    title: "Server Status",
    description: "Here is the current status of the servers:",
    fields: fields,
    timestamp: new Date().toISOString(),
    footer: {
      text: "Contact disc: 0xgallo",
    },
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName("servers")
    .setDescription("Check the server status and online users."),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const servers = await fetchOnline(); // Função para obter os dados do servidor
      const embed = await generateEmbed(servers);

      const seeAllButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("see_all_servers")
          .setLabel("See All")
          .setStyle(ButtonStyle.Primary)
      );

      const message = await interaction.editReply({
        embeds: [embed],
        components: [seeAllButton],
      });

      const filter = (i) =>
        i.customId === "see_all_servers" && i.user.id === interaction.user.id;

      const collector = message.createMessageComponentCollector({
        filter,
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "see_all_servers") {
          const fullEmbed = await generateEmbed(servers, servers.length);

          await i.update({ embeds: [fullEmbed], components: [] });
        }
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        "There was an error while executing this command!"
      );
    }
  },
};
