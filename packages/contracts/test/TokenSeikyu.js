const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

const { deployMockContract, provider: waffleProvider } = waffle;
const { currentTimestamp, getCanceledInvoice, awaitInvoiceAddress } = require("./utils");
const IERC20 = require("../build/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json");

const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
const EMPTY_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const price = 10;
const terminationTime =
  parseInt(new Date().getTime() / 1000, 10) + 30 * 24 * 60 * 60;

describe("TokenSeikyu", function () {
  let TokenSeikyu;
  let invoice;
  let mockToken;
  let otherMockToken;
  let mockWrappedNativeToken;
  let client;
  let provider;
  let randomSigner;

  beforeEach(async function () {
    [client, provider, resolver, randomSigner] = await ethers.getSigners();

    mockToken = await deployMockContract(client, IERC20.abi);
    otherMockToken = await deployMockContract(client, IERC20.abi);

    const MockWrappedTokenFactory = await ethers.getContractFactory("MockWETH");
    mockWrappedNativeToken = await MockWrappedTokenFactory.deploy();

    TokenSeikyu = await ethers.getContractFactory("TokenSeikyu");
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    await invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      terminationTime,
      EMPTY_BYTES32,
      mockWrappedNativeToken.address
    );
  });

  it("Should deploy a TokenSeikyu", async function () {
    expect(await invoice.client()).to.equal(client.address);
    expect(await invoice["provider()"]()).to.equal(provider.address);
    expect(await invoice.token()).to.equal(mockToken.address);
    expect(await invoice.price()).to.equal(price);
    expect(await invoice.terminationTime()).to.equal(terminationTime);
    expect(await invoice.details()).to.equal(EMPTY_BYTES32);
    expect(await invoice.canceled()).to.equal(false);
    expect(await invoice.wrappedNativeToken()).to.equal(
      mockWrappedNativeToken.address
    );
  });

  it("Should revert initLock if already init", async function () {
    const receipt = invoice.initLock();
    await expect(receipt).to.revertedWith(
      "Initializable: contract is already initialized",
    );
  });

  it("Should revert init if initLocked", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    await invoice.initLock();
    const receipt = invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      currentTime - 3600,
      EMPTY_BYTES32,
      mockWrappedNativeToken.address
    );
    await expect(receipt).to.revertedWith(
      "Initializable: contract is already initialized",
    );
  });

  it("Should revert init if invalid client", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    const receipt = invoice.init(
      ADDRESS_ZERO,
      provider.address,
      mockToken.address,
      price,
      currentTime - 3600,
      EMPTY_BYTES32,
      mockWrappedNativeToken.address
    );
    await expect(receipt).to.revertedWith("invalid client")
  });

  it("Should revert init if invalid provider", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    const receipt = invoice.init(
      client.address,
      ADDRESS_ZERO,
      mockToken.address,
      price,
      currentTime - 3600,
      EMPTY_BYTES32,
      mockWrappedNativeToken.address
    );
    await expect(receipt).to.revertedWith("invalid provider");
  });


  it("Should revert init if invalid token", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    const receipt = invoice.init(
      client.address,
      provider.address,
      ADDRESS_ZERO,
      price,
      currentTime - 3600,
      EMPTY_BYTES32,
      mockWrappedNativeToken.address
    );
    await expect(receipt).to.revertedWith("invalid token");
  });

  it("Should revert init if invalid wrappedNativeToken", async function () {
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    const receipt = invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      terminationTime,
      EMPTY_BYTES32,
      ADDRESS_ZERO,
    );
    await expect(receipt).to.revertedWith("invalid wrappedNativeToken");
  });

  it("Should revert init if terminationTime has ended", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    const receipt = invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      currentTime - 3600,
      EMPTY_BYTES32,
      mockWrappedNativeToken.address
    );
    await expect(receipt).to.revertedWith("duration ended");
  });

  it("Should revert init if terminationTime too long", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    const receipt = invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      currentTime + 5 * 365 * 24 * 3600,
      EMPTY_BYTES32,
      mockWrappedNativeToken.address
    );
    await expect(receipt).to.revertedWith("duration too long");
  });

  it("Should revert cancel if not provider", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    await invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      currentTime + 1000,
      EMPTY_BYTES32,
      mockWrappedNativeToken.address
    );
    await mockToken.mock.balanceOf.withArgs(invoice.address).returns(10);
    // connect with other account (nor client or provider)
    const invoiceWithClient = await invoice.connect(client);
    const receipt = invoiceWithClient["cancel()"]();
    await expect(receipt).to.be.revertedWith("!party");
  });
  it("Should revert cancel if canceled", async function () {
    const canceledInvoice = await getCanceledInvoice(
      TokenSeikyu,
      client,
      provider,
      mockToken,
      price,
      EMPTY_BYTES32,
      mockWrappedNativeToken,
    );
    const receipt = canceledInvoice["cancel()"]();
    await expect(receipt).to.be.revertedWith("canceled");
  });
  it("Should cancel if balance is greater than 0", async function () {
    const canceledInvoice = await getCanceledInvoice(
      TokenSeikyu,
      client,
      provider,
      mockToken,
      price,
      EMPTY_BYTES32,
      mockWrappedNativeToken,
    );
    expect(await canceledInvoice["canceled()"]()).to.equal(true);
  });
  /*
  it("Should revert deny if balance is 0", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    await invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      currentTime + 1000,
      mockWrappedNativeToken.address
    );
    await mockToken.mock.balanceOf.withArgs(invoice.address).returns(0);
    const receipt = invoice["deny()"]();
    await expect(receipt).to.be.revertedWith("balance is 0");
  });
  */
  it("Should revert deny if not client", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    await invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      currentTime + 1000,
      EMPTY_BYTES32,
      mockWrappedNativeToken.address
    );
    await mockToken.mock.balanceOf.withArgs(invoice.address).returns(10);
    const invoiceWithProvider = await invoice.connect(provider);
    const receipt = invoiceWithProvider["deny()"]();
    await expect(receipt).to.be.revertedWith("!party");
  });
  it("Should revert deny if canceled", async function () {
    const canceledInvoice = await getCanceledInvoice(
      TokenSeikyu,
      client,
      provider,
      mockToken,
      price,
      EMPTY_BYTES32,
      mockWrappedNativeToken,
    );
    const receipt = canceledInvoice["deny()"]();
    await expect(receipt).to.be.revertedWith("canceled");
  });

  it("Should revert receive if not wrappedNativeToken", async function () {
    const receipt = client.sendTransaction({
      to: invoice.address,
      value: 10,
    });
    await expect(receipt).to.be.revertedWith("!wrappedNativeToken");
  });

  it("Should accept receive and convert to wrapped token", async function () {
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    await invoice.init(
      client.address,
      provider.address,
      mockWrappedNativeToken.address,
      price,
      terminationTime,
      EMPTY_BYTES32,
      mockWrappedNativeToken.address
    );
    const receipt = await client.sendTransaction({
      to: invoice.address,
      value: 10,
    });
    await expect(receipt)
      .to.emit(invoice, "Deposit")
      .withArgs(client.address, 10);
    expect(await mockWrappedNativeToken.balanceOf(invoice.address)).to.equal(
      10,
    );
  });

});