import { itemsData } from "./itemsData.js";
import { fetchEnergy } from "../api.js";
import axios from "axios";
const apiUrl = "https://api-gateway.skymavis.com/graphql/mavis-marketplace";

const fetchData = async (query) => {
  const response = await axios.post(
    apiUrl,
    { query },
    {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "XQFRYUMOUKO3IVn91ERzP2rn1VkEhiud",
      },
    }
  );

  if (!response.data) {
    throw new Error(`Failed to fetch data from ${apiUrl}`);
  }

  return response.data;
};

export async function getItemsVerified() {
  try {
    const dataEnergy = await fetchEnergy();
    const itemsVerified = itemsData["combat"];

    const query = `
      query data {
        exchangeRate {
          ron {
            usd
          }
        }
        ${itemsVerified
          .map(
            ({ name, requiresLevel, alias, stats }) => `
          ${alias}: erc1155Tokens(
            tokenAddress: "0xcc451977a4be9adee892f7e610fe3e3b3927b5a1"
            name:"${name}"
            from: 0
            size: 1
            sort: PriceAsc
            auctionType: Sale
            rangeCriteria: [
              { name: "requires level", range: { from: ${requiresLevel}, to: ${requiresLevel} } }]
          ) {
            results {
              tokenId
              name
              minPrice
              attributes
            }
          }
        `
          )
          .join("\n")}
      }
    `;

    const response = await fetchData(query);
    const exchangeRate = response.data.exchangeRate.ron.usd;

    const combinedResults = Object.keys(response.data)
      .filter((key) => key !== "exchangeRate")
      .reduce((acc, key) => {
        return acc.concat(response.data[key].results);
      }, []);

    const finalResponse = combinedResults.map((result) => ({
      name: result.name,
      requiresLevel: result.attributes["requires level"],
      prices: {
        ron: result.minPrice
          ? (result.minPrice / 1e18).toFixed(2)
          : "Not for Sale",
        usd: result.minPrice
          ? ((result.minPrice / 1e18) * exchangeRate).toFixed(2)
          : "Not for Sale",
      },
      tokenId: result.tokenId,
    }));

    itemsVerified.forEach((item) => {
      const itemFinalResponse = finalResponse.find(
        (response) =>
          response.name === item.name &&
          Number(response.requiresLevel[0]) === item.requiresLevel
      );
      if (itemFinalResponse) {
        item.prices = itemFinalResponse.prices;
        item.tokenId = itemFinalResponse.tokenId;
      } else {
        item.prices = { ron: "Not for Sale", usd: "Not for Sale" };
      }
      item.recipe.craftRecipe.totalEnergyCostUsd = (
        item.recipe.craftRecipe.totalRequireEnergy * dataEnergy[0].costPerEnergy
      ).toFixed(2);
      item.recipe.craftRecipe.totalEnergyCostRon = (
        item.recipe.craftRecipe.totalRequireEnergy *
        (dataEnergy[0].costPerEnergy / exchangeRate)
      ).toFixed(2);
      item.recipe.craftRecipe.ImageEnergy = dataEnergy[0].cdnImage;
    });

    return itemsVerified;
  } catch (error) {
    return error;
  }
}
