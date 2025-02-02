import axios from "axios";

export async function fetchOnline() {
  try {
    const response = await axios.get(
      "https://manager1-release-game.layerlumi.com/getWorldSceneList",
      {
        headers: {
          "Content-Type": "application/json",
          "X-Unity-Version": "2021.3.8f1"
        },
      }
    );

    if (!response.data) {
      throw new Error(`No data in API response from getWorldSceneList`);
    }
    return response.data;
  } catch (error) {
    console.error("FetchData Error:", error.message);
    throw error;
  }
}


async function fetchData(apiUrl, query) {
  try {
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
      throw new Error(`No data in API response from ${apiUrl}`);
    }
    return response.data;
  } catch (error) {
    console.error("FetchData Error:", error.message);
    throw error;
  }
}

export async function fetchEnergy() {
  const apiUrl = "https://api-gateway.skymavis.com/graphql/mavis-marketplace";

  try {
    const dataEnergyBuy = await fetchData(
      apiUrl,
      `
      query MyQuery {
        erc1155Tokens(
          from: 0
          size: 50
          tokenAddress: "0xcc451977a4be9adee892f7e610fe3e3b3927b5a1"
          rangeCriteria: {name: "restore energy", range: {to: "1.157920892373162e+77", from: "1"}}
          auctionType: Sale
          sort: PriceAsc
        ) {
          results {
            name
            minPrice
            cdnImage
            attributes
            tokenId
          }
          total
        }
      }
    `
    );

    const dataSlimes = await fetchData(
      apiUrl,
      `query MyQuery {
  erc1155Tokens(
    from: 0
    size: 50
    tokenAddress: "0xcc451977a4be9adee892f7e610fe3e3b3927b5a1"
    name: "Energy Slime"
    auctionType: Sale
    sort: PriceAsc
  ) {
    results {
      name
      minPrice
      cdnImage
      tokenId
    }
  }
}`
    );
    const dataBottle = await fetchData(
      apiUrl,
      `query MyQuery {
  erc1155Token(
    tokenAddress: "0xcc451977a4be9adee892f7e610fe3e3b3927b5a1"
    tokenId: "268558096"
  ) {
      name
      minPrice
      cdnImage
      tokenId
  }
}
`
    );

    const dataExchangeRate = await fetchData(
      apiUrl,
      `
      query MyQuery {
        exchangeRate {
          ron {
            usd
      }
  }
}
    `
    );

    const resultsDataEnergyBuy = (
      dataEnergyBuy.data?.erc1155Tokens?.results || []
    ).map((result) => {
      const restoreEnergy =
        Number(result.attributes?.["restore energy"]?.[0]) || 0;
      const minPriceInUSD = Number(
        (result.minPrice / 1e18) * dataExchangeRate.data.exchangeRate.ron.usd
      ).toFixed(2);
      return {
        ...result,
        minPrice: minPriceInUSD,
        restoreEnergy,
        costPerEnergy: restoreEnergy
          ? (minPriceInUSD / restoreEnergy).toFixed(2)
          : "N/A",
      };
    });

    const resultsDataEnergyCraft = (
      dataSlimes.data?.erc1155Tokens?.results || []
    ).map((result) => {
      const bottlePrice = dataBottle.data?.erc1155Token?.minPrice || 0;
      const minPriceTotal = (
        (result.minPrice / 1e18 + bottlePrice / 1e18) *
        dataExchangeRate.data.exchangeRate.ron.usd
      ).toFixed(2);

      const matchingItem = resultsDataEnergyBuy.find(
        (item) => item.name?.substring(0, 5) === result.name?.substring(0, 5)
      );

      return {
        ...result,
        name: `${result.name} + Bottle`,
        minPrice: minPriceTotal,
        restoreEnergy: (matchingItem?.restoreEnergy || 0) * 3,
        costPerEnergy: matchingItem?.restoreEnergy
          ? (minPriceTotal / (matchingItem.restoreEnergy * 3)).toFixed(2)
          : "N/A",
      };
    });

    const allResults = [
      ...resultsDataEnergyBuy,
      ...resultsDataEnergyCraft,
    ].sort((a, b) => {
      if (a.minPrice === "0.00" && b.minPrice !== "0.00") return 1;
      if (a.minPrice !== "0.00" && b.minPrice === "0.00") return -1;
      return a.costPerEnergy - b.costPerEnergy;
    });

    return allResults;
  } catch (error) {
    return error;
  }
}
