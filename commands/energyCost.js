import { SlashCommandBuilder } from "@discordjs/builders";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { fetchEnergy } from "../api/api.js";

async function generateEmbed(nfts, limit = 3) {
  const displayedNFTs = nfts.slice(0, limit);
  console.log(nfts);

  const fields = displayedNFTs.map((nft, index) => ({
    name: `${index < 3 ? "🔋 " : "🪫 "} ${nft.name}`,
    value:
      `**Cost per Energy:** ${nft.costPerEnergy} USD\n` +
      `**Restore Energy:** ${nft.restoreEnergy}\n` +
      `**Min Price:** ${nft.minPrice} USD\n` +
      `[Buy](https://marketplace.skymavis.com/collections/lumiterra/${nft.tokenId})` +
      `\n___\n`,
    inline: false,
  }));

  return {
    color: 0x0099ff,
    title: "Cheap Energy",
    url: "https://marketplace.skymavis.com/collections/lumiterra?search=energy",
    description: "Find the cheapest energy on the market:",
    thumbnail: {
      url: "https://cdn.skymavis.com/mm-cache/6/f/b8434edff91f8dbd14faa3486c9d8d.png",
    },
    fields: fields,
    timestamp: new Date().toISOString(),
    footer: {
      text: "Contact disc: 0xgallo",
    },
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName("energy")
    .setDescription("Find the cheapest energy on the market."),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const nfts = await fetchEnergy();
      const embed = await generateEmbed(nfts);

      const seeAllButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("see_all")
          .setLabel("See All")
          .setStyle(ButtonStyle.Primary)
      );

      const message = await interaction.editReply({
        embeds: [embed],
        components: [seeAllButton],
      });

      const filter = (i) =>
        i.customId === "see_all" && i.user.id === interaction.user.id;

      const collector = message.createMessageComponentCollector({
        filter,
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "see_all") {
          const fullEmbed = await generateEmbed(nfts, nfts.length);

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
