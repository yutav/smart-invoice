const { ethers, waffle } = require("hardhat");
const { expect } = require("chai");
const { execPath } = require("process");

const EMPTY_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

module.exports.awaitInvoiceAddress = async receipt => {
  if (!receipt || !receipt.logs) return "";
  const abi = new ethers.utils.Interface([
    "event LogNewInvoice(uint256 indexed id, address invoice, uint256 price)",
  ]);
  const eventFragment = abi.events[Object.keys(abi.events)[0]];
  const eventTopic = abi.getEventTopic(eventFragment);
  const event = receipt.logs.find(e => e.topics[0] === eventTopic);
  if (event) {
    const decodedLog = abi.decodeEventLog(
      eventFragment,
      event.data,
      event.topics,
    );
    return decodedLog.invoice;
  }
  return "";
};

module.exports.currentTimestamp = async () => {
  const block = await waffle.provider.getBlock();
  return +block.timestamp;
};

module.exports.getCanceledInvoice = async (
  TokenSeikyu,
  client,
  provider,
  mockToken,
  price,
  details,
  mockWrappedNativeToken,
  value = 0,
) => {
  const currentTime = await module.exports.currentTimestamp();
  const newInvoice = await TokenSeikyu.deploy();
  await newInvoice.deployed();
  await newInvoice.init(
    client.address,
    provider.address,
    mockToken.address,
    price,
    currentTime + 1000,
    details,
    mockWrappedNativeToken.address
  );
  expect(await newInvoice["canceled()"]()).to.equal(false);

  const invoiceWithProvider = await newInvoice.connect(provider);
  await mockToken.mock.balanceOf.withArgs(invoiceWithProvider.address).returns(10);
  const receipt = invoiceWithProvider["cancel()"]();

  await expect(receipt)
    .to.emit(invoiceWithProvider, "Cancel")
    .withArgs(provider.address);
  return invoiceWithProvider;
};

module.exports.getAcceptedInvoice = async (
  TokenSeikyu,
  client,
  provider,
  mockToken,
  price,
  details,
  mockWrappedNativeToken,
  value = 0,
) => {
  const currentTime = await module.exports.currentTimestamp();
  const newInvoice = await TokenSeikyu.deploy();
  await newInvoice.deployed();
  await newInvoice.init(
    client.address,
    provider.address,
    mockToken.address,
    price,
    currentTime + 1000,
    details,
    mockWrappedNativeToken.address
  );
  expect(await newInvoice["accepted()"]()).to.equal(false);

  const invoiceWithClient = await newInvoice.connect(client);
  await mockToken.mock.balanceOf.withArgs(invoiceWithClient.address).returns(10);
  const receipt = invoiceWithClient["accept()"]();

  await expect(receipt)
    .to.emit(invoiceWithClient, "Accept")
    .withArgs(client.address);
  return invoiceWithClient;
};
