import axios from "axios";

async function fetchData(apiUrl, query) {
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
}

export async function fetchEssence() {
  try {
    const apiUrl = "https://api-gateway.skymavis.com/graphql/mavis-marketplace";
    const result = "minPrice name attributes cdnImage tokenId";
    const query = `
      query CombinedQuery {
        gatherEssenceTokens: erc1155Tokens(
          from: 0
          size: 50
          tokenAddress: "0xcc451977a4be9adee892f7e610fe3e3b3927b5a1"
          auctionType: Sale
          name: "Gather Essence"
          sort: PriceAsc
        ) {
          results {
            ${result}
          }
          total
        }

        combatEssenceTokens: erc1155Tokens(
          from: 0
          size: 50
          tokenAddress: "0xcc451977a4be9adee892f7e610fe3e3b3927b5a1"
          auctionType: Sale
          name: "Combat Essence"
          sort: PriceAsc
        ) {
          results {
            ${result}
          }
          total
        }

        agriculturalPlantingEssenceTokens: erc1155Tokens(
          from: 0
          size: 50
          tokenAddress: "0xcc451977a4be9adee892f7e610fe3e3b3927b5a1"
          auctionType: Sale
          name: "Agricultural Planting Essence"
          sort: PriceAsc
        ) {
          results {
            ${result}
          }
          total
        }

        agriculturalLivestockEssenceTokens: erc1155Tokens(
          from: 0
          size: 50
          tokenAddress: "0xcc451977a4be9adee892f7e610fe3e3b3927b5a1"
          auctionType: Sale
          name: "Agricultural Livestock Essence"
          sort: PriceAsc
        ) {
          results {
            ${result}
          }
          total
        }
        exchangeRate {
          ron {
            usd
          }
        }
      }
    `;
    const dataEssence = await fetchData(apiUrl, query);
    const exchangeRate = dataEssence.data.exchangeRate.ron.usd;

    const processResults = (results) =>
      results.map((result) => ({
        name: result.name,
        minPriceRon: Number(result.minPrice / 1000000000000000000).toFixed(2),
        minPriceUsd: result.minPrice
          ? Number(
              (result.minPrice / 1000000000000000000) * exchangeRate
            ).toFixed(2)
          : "Not for Sale",
        cdnImage: result.cdnImage,
        tokenId: result.tokenId,
        type: result.attributes["type"] && result.attributes["type"][0],
        // Flatten attributes
        attributes: Object.entries(result.attributes).reduce(
          (acc, [key, value]) => {
            acc[key] = value[0];
            return acc;
          },
          {}
        ),
      }));

    const resultsdatagatherEssence = processResults(
      dataEssence.data.gatherEssenceTokens.results
    );
    const resultsdatacombatEssence = processResults(
      dataEssence.data.combatEssenceTokens.results
    );
    const resultsdataagriculturalPlantingEssence = processResults(
      dataEssence.data.agriculturalPlantingEssenceTokens.results
    );
    const resultsdataagriculturalLivestockEssence = processResults(
      dataEssence.data.agriculturalLivestockEssenceTokens.results
    );

    const allResults = [
      ...resultsdatagatherEssence,
      ...resultsdatacombatEssence,
      ...resultsdataagriculturalPlantingEssence,
      ...resultsdataagriculturalLivestockEssence,
    ];

    return allResults;
  } catch (error) {
    console.error("Error fetching essence:", error);
    return [];
  }
}
