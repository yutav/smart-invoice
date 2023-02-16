require("hardhat/config");
require("dotenv").config();
require("@nomiclabs/hardhat-ganache");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("./tasks/verify-blockscout");

const {
  ALCHEMY_PROJECT_ID,
  PRIVATE_KEY,
  ETHERSCAN_API_KEY,
  COINMARKETCAP_API_KEY,
  CURRENCY,
} = process.env;

module.exports = {
  solidity: {
    version: "0.8.3",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    artifacts: "./build",
  },
  networks: {
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    ganache: {
      url: "http://127.0.0.1:8555",
      defaultBalanceEther: 1000,
    },
    mainnet: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`],
      gasPrice: 22000000000,
    },
    mumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`]
    },
    hardhat: {
    },
  },
  etherscan: {
    apiKey: {
      goerli: ETHERSCAN_API_KEY,
      hardhat: ETHERSCAN_API_KEY
    },
    customChains: [
      {
        network: "hardhat",
        chainId: 31337,
        urls: {
          apiURL: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_PROJECT_ID}`,
        }
      }
    ]
  },
  gasReporter: {
    coinmarketcap: COINMARKETCAP_API_KEY,
    currency: CURRENCY,
  },
};
