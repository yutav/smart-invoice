/* eslint-disable */
const { ethers, run, network } = require("hardhat");
const fs = require("fs");

const wrappedTokenAddress = {
  1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  4: "0xc778417e063141139fce010982780140aa0cd5ab",
  5: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
  42: "0xd0a1e359811322d97991e03f863a0c30c2cf029c",
  77: "0xc655c6D80ac92d75fBF4F40e95280aEb855B1E87",
  100: "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d",
  1338: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  31337: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
};

const networkName = {
  1: "Mainnet",
  4: "Rinkeby",
  5: "Goerli",
  42: "Kovan",
  77: "Sokol",
  100: "xDai",
  1338: "Hardhat",
  31337: "locallhost"
};

const networkCurrency = {
  1: "ETH",
  4: "ETH",
  5: "ETH",
  42: "ETH",
  77: "SPOA",
  100: "xDai",
  1338: "ETH",
  31337: "ETH"
};

const BLOCKSCOUT_CHAIN_IDS = [77, 100];

async function main() {
  const [deployer] = await ethers.getSigners();
  const address = await deployer.getAddress();
  const { chainId } = await deployer.provider.getNetwork();

  console.log(
    "Deploying TokenSeikyuFactory on network:",
    networkName[chainId],
  );
  console.log("Account address:", address);
  console.log(
    "Account balance:",
    ethers.utils.formatEther(await deployer.provider.getBalance(address)),
    networkCurrency[chainId],
  );

  const TokenSeikyu = await ethers.getContractFactory("TokenSeikyu");
  const tokenSeikyu = await TokenSeikyu.deploy();
  await tokenSeikyu.deployed();
  console.log("Implementation Address:", tokenSeikyu.address);

  const TokenSeikyuFactory = await ethers.getContractFactory(
    "TokenSeikyuFactory",
  );

  const tokenSeikyuFactory = await TokenSeikyuFactory.deploy(
    tokenSeikyu.address,
    wrappedTokenAddress[chainId],
  );
  await tokenSeikyuFactory.deployed();
  console.log("Factory Address:", tokenSeikyuFactory.address);

  await tokenSeikyu.initLock();

  const txHash = tokenSeikyuFactory.deployTransaction.hash;

  console.log("Transaction Hash:", txHash);

  const receipt = await deployer.provider.getTransactionReceipt(txHash);
  console.log("Block Number:", receipt.blockNumber);

  //  await tokenSeikyuFactory.deployTransaction.wait(5);

  const TASK_VERIFY = BLOCKSCOUT_CHAIN_IDS.includes(chainId)
    ? "verify:verify-blockscout"
    : "verify:verify";

  await run(TASK_VERIFY, {
    address: tokenSeikyu.address,
    constructorArguments: [],
  });
  console.log("Verified Implementation");

  await run(TASK_VERIFY, {
    address: tokenSeikyuFactory.address,
    constructorArguments: [tokenSeikyu.address, wrappedTokenAddress[chainId]],
  });
  console.log("Verified Factory");

  const deploymentInfo = {
    network: network.name,
    factory: tokenSeikyuFactory.address,
    txHash,
    blockNumber: receipt.blockNumber.toString(),
  };

  fs.writeFileSync(
    `deployments/${network.name}.json`,
    JSON.stringify(deploymentInfo, undefined, 2),
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
