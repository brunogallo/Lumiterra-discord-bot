import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { getItemsVerified } from "../api/combat/itemsVerified.js";
const isNotForSale = "Not for Sale";

// Function to generate an embed for the item details
function generateItemEmbed(items) {
  return items.map((item) => {
    // Handle craftRecipe when it's an object
    const craftRecipeMaterials = item.recipe?.craftRecipe?.materials
      ? item.recipe.craftRecipe.materials
          .map(
            (material) => `${material.name} - ${material.quantity}x` // Format material name and quantity
          )
          .join("\n")
      : "Not for Sale";

    const disenchantRecipe = Array.isArray(item.recipe?.DesenchantRecipe)
      ? item.recipe.DesenchantRecipe.map(
          (material) => `${material.name} - ${material.quantity}x`
        ).join("\n") // Format disenchant recipe
      : "Not for Sale";

    const energyRequired = item.recipe?.craftRecipe?.totalRequireEnergy
      ? item.recipe.craftRecipe.totalRequireEnergy
      : "Not for Sale";

    const energyCostRon =
      item.recipe?.craftRecipe?.totalEnergyCostRon &&
      item.recipe?.craftRecipe?.totalEnergyCostRon != "Not for Sale"
        ? `${item.recipe.craftRecipe.totalEnergyCostRon} RON`
        : "Not for Sale";

    const energyCostUsd =
      item.recipe?.craftRecipe?.totalEnergyCostUsd &&
      item.recipe?.craftRecipe?.totalEnergyCostUsd != "Not for Sale"
        ? `(~${item.recipe.craftRecipe.totalEnergyCostUsd} USD)`
        : "";

    const floorPriceRon =
      item.prices?.ron && item.prices?.ron != "Not for Sale"
        ? `${item.prices?.ron} RON (~${item.prices?.usd} USD)`
        : "Not for Sale";

    const totalPriceTotalRon =
      item.recipe?.craftRecipe?.minPriceTotalRon &&
      item.recipe?.craftRecipe?.minPriceTotalRon != "NaN"
        ? `${item.recipe?.craftRecipe?.minPriceTotalRon} RON (~${item.recipe?.craftRecipe?.minPriceTotalUsd} USD)`
        : "Not available";

    console.log(item.recipe?.craftRecipe?.minPriceTotalRon);

    return {
      color: 0x0099ff,
      title: item.name,
      url: `https://marketplace.skymavis.com/collections/lumiterra/${item.tokenId}`,
      thumbnail: {
        url: item.cdnImage,
      },
      fields: [
        {
          name: "",
          value:
            `**Level Required:** ${item.requiresLevel}\n` +
            `**Floor Price:** ${floorPriceRon}\n` +
            `[Buy Now!](https://marketplace.skymavis.com/collections/lumiterra/${item.tokenId})\n` +
            `-----------------------------------------\n`,
          inline: false,
        },
        {
          name: "**Craft Recipe:**",
          value:
            `${craftRecipeMaterials}\n` +
            `\n` +
            `**Energy Required:**\n ${energyRequired}\n` +
            `\n` +
            `**Energy Cost:**\n ${energyCostRon} ${energyCostUsd}\n` +
            `\n` +
            `**Total Price:**\n ${totalPriceTotalRon}\n` +
            `\n`,
          inline: false,
        } /*,
        {
          name: "**Desenchant Recipe:**",
          value:
            `${disenchantRecipe}\n` +
            `\n` +
            `-----------------------------------------\n` +
            `\n`,
          inline: false,
        },*/,
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: "Contact disc: 0xgallo",
      },
    };
  });
}

export default {
  data: new SlashCommandBuilder()
    .setName("combat")
    .setDescription(
      "Find out how to craft combat items and view their details."
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const items = await getItemsVerified();
    try {
      // Initial message with level buttons
      const initialMessage = "Select a level to view items:\n";

      // Split buttons into multiple rows (5 buttons per row)
      const levelButtons = [];
      for (let i = 1; i <= 9; i += 5) {
        const row = new ActionRowBuilder().addComponents(
          [...Array(5).keys()]
            .map((j) => {
              const level = i + j;
              if (level <= 9) {
                return new ButtonBuilder()
                  .setCustomId(`level_${level}`)
                  .setLabel(`Level ${level}`)
                  .setStyle(ButtonStyle.Primary);
              }
            })
            .filter(Boolean)
        );
        levelButtons.push(row);
      }

      // Send initial message with level buttons
      const message = await interaction.editReply({
        content: initialMessage,
        components: levelButtons,
      });

      // Filter for button interactions
      const filter = (i) => i.user.id === interaction.user.id;

      let collector; // Define collector outside to use it in multiple scopes

      const startLevelCollector = () => {
        collector = message.createMessageComponentCollector({
          filter,
          time: 60000,
        });

        collector.on("collect", async (i) => {
          const customId = i.customId;
          if (customId.startsWith("level_")) {
            const selectedLevel = parseInt(customId.split("_")[1]);

            // Send category selection buttons
            const categoryMessage = `Select a category for Level ${selectedLevel}:\n`;

            // Categories
            const categories = [
              "sword",
              "bow",
              "hammer",
              "shoes",
              "glove",
              "hat",
              "pants",
              "armor",
            ];

            const categoryButtons = [];
            for (let i = 0; i < categories.length; i += 5) {
              const row = new ActionRowBuilder().addComponents(
                categories.slice(i, i + 5).map((category) =>
                  new ButtonBuilder()
                    .setCustomId(`category_${category}`)
                    .setLabel(
                      category.charAt(0).toUpperCase() + category.slice(1)
                    )
                    .setStyle(ButtonStyle.Primary)
                )
              );
              categoryButtons.push(row);
            }

            await i.update({
              content: categoryMessage,
              components: categoryButtons,
            });

            // Remove previous collector
            collector.stop();

            // Create new collector for category selection
            const categoryCollector = message.createMessageComponentCollector({
              filter,
              time: 60000,
            });

            categoryCollector.on("collect", async (i) => {
              const selectedCategory = i.customId.split("_")[1];

              // Filter items by selected level and category
              const filteredItems = items.filter(
                (item) =>
                  item.requiresLevel === selectedLevel &&
                  item.category === selectedCategory
              );

              if (filteredItems.length === 0) {
                await i.update({
                  content: `No items found for level ${selectedLevel} and category ${selectedCategory}.`,
                  components: [],
                });
                return;
              }

              const itemEmbeds = generateItemEmbed(filteredItems);

              await i.update({
                content: `Items for Level ${selectedLevel} and Category ${selectedCategory}:`,
                embeds: itemEmbeds,
                components: [],
              });
            });

            categoryCollector.on("end", () => {
              // Disable buttons after timeout
              if (message.channel) {
                message.edit({ components: [] }).catch(console.error);
              }
            });
          }
        });

        collector.on("end", () => {
          // Disable buttons after timeout
          if (message.channel) {
            message.edit({ components: [] }).catch(console.error);
          }
        });
      };

      startLevelCollector(); // Start the initial level collector
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        "There was an error while executing this command!"
      );
    }
  },
};
