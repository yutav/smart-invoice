const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

const { deployMockContract } = waffle;
const { awaitInvoiceAddress } = require("./utils");
const IERC20 = require("../build/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json");

const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
const EMPTY_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const resolverType = 0;
const price = 10
const total = 10
const terminationTime =
  parseInt(new Date().getTime() / 1000, 10) + 30 * 24 * 60 * 60;

const requireVerification = true;

describe("TokenSeikyuFactory", function () {
  let TokenSeikyu;
  let tokenSeikyu;
  let TokenSeikyuFactory;
  let invoiceFactory;
  let owner;
  let addr1;
  let addr2;
  let token;
  let wrappedNativeToken;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const mockToken = await deployMockContract(owner, IERC20.abi);
    token = mockToken.address;

    const MockWrappedTokenFactory = await ethers.getContractFactory("MockWETH");
    const mockWrappedNativeToken = await MockWrappedTokenFactory.deploy();

    TokenSeikyu = await ethers.getContractFactory("TokenSeikyu");

    tokenSeikyu = await TokenSeikyu.deploy();

    wrappedNativeToken = mockWrappedNativeToken.address;

    TokenSeikyuFactory = await ethers.getContractFactory(
      "TokenSeikyuFactory",
    );

    invoiceFactory = await TokenSeikyuFactory.deploy(
      tokenSeikyu.address,
      wrappedNativeToken,
    );

    await invoiceFactory.deployed();
  });

  it("Should deploy with 0 invoiceCount", async function () {
    const invoiceCount = await invoiceFactory.invoiceCount();
    expect(invoiceCount).to.equal(0);
  });

  it("Should revert deploy if zero implementation", async function () {
    const receipt = TokenSeikyuFactory.deploy(ADDRESS_ZERO, ADDRESS_ZERO);
    await expect(receipt).to.revertedWith("invalid implementation");
  });

  it("Should revert deploy if zero wrappedNativeToken", async function () {
    const receipt = TokenSeikyuFactory.deploy(
      tokenSeikyu.address,
      ADDRESS_ZERO,
    );
    await expect(receipt).to.revertedWith("invalid wrappedNativeToken");
  });

  let invoiceAddress;
  let client;
  let provider;
  let resolver;

  it("Should deploy a TokenSeikyu", async function () {
    client = owner.address;
    provider = addr1.address;

    const receipt = await invoiceFactory.create(
      client,
      provider,
      token,
      price,
      terminationTime,
      EMPTY_BYTES32
    );
    invoiceAddress = await awaitInvoiceAddress(await receipt.wait());
    await expect(receipt)
      .to.emit(invoiceFactory, "LogNewInvoice")
      .withArgs(0, invoiceAddress, price);

    const invoice = await TokenSeikyu.attach(invoiceAddress);

    expect(await invoice.client()).to.equal(client);
    expect((await invoice.functions.provider())[0]).to.equal(provider);
    expect(await invoice.token()).to.equal(token);
    expect(await invoice.price()).to.equal(price)
    expect(await invoice.terminationTime()).to.equal(terminationTime);
    expect(await invoice.canceled()).to.equal(false);
    expect(await invoice.wrappedNativeToken()).to.equal(wrappedNativeToken);

    expect(await invoiceFactory.getInvoiceAddress(0)).to.equal(invoiceAddress);
  });

  it("Should deploy small abount TokenSeikyu", async function () {

    const smallPrice = "0.002"
    const decimals = 18 // theres a difference from token
    const smallPriceEther = ethers.utils.parseUnits(smallPrice, decimals)
    const smallPriceStr = ethers.utils.formatUnits(smallPriceEther, decimals)

    client = owner.address;
    provider = addr1.address;

    const receipt = await invoiceFactory.create(
      client,
      provider,
      token,
      smallPriceEther, // small amount price
      terminationTime,
      EMPTY_BYTES32
    );
    invoiceAddress = await awaitInvoiceAddress(await receipt.wait());
    await expect(receipt)
      .to.emit(invoiceFactory, "LogNewInvoice")
      .withArgs(0, invoiceAddress, smallPriceEther);

    const invoice = await TokenSeikyu.attach(invoiceAddress);

    expect(await invoice.client()).to.equal(client);
    expect((await invoice.functions.provider())[0]).to.equal(provider);
    expect(await invoice.token()).to.equal(token);
    expect(await invoice.price()).to.equal(smallPriceEther)
    expect(await invoice.terminationTime()).to.equal(terminationTime);
    expect(await invoice.canceled()).to.equal(false);
    expect(await invoice.wrappedNativeToken()).to.equal(wrappedNativeToken);

    expect(await invoiceFactory.getInvoiceAddress(0)).to.equal(invoiceAddress);
  });

  it("Should predict TokenSeikyu address", async function () {
    client = owner.address;
    provider = addr1.address;

    const predictedAddress = await invoiceFactory.predictDeterministicAddress(
      EMPTY_BYTES32
    );

    const receipt = await invoiceFactory.createDeterministic(
      client,
      provider,
      token,
      price,
      terminationTime,
      EMPTY_BYTES32,
      EMPTY_BYTES32 // salt
    );

    invoiceAddress = await awaitInvoiceAddress(await receipt.wait());
    await expect(receipt)
      .to.emit(invoiceFactory, "LogNewInvoice")
      .withArgs(0, invoiceAddress, price);

    expect(invoiceAddress).to.equal(predictedAddress);
    expect(await invoiceFactory.getInvoiceAddress(0)).to.equal(invoiceAddress);
  });

  it("Should update invoiceCount", async function () {
    expect(await invoiceFactory.invoiceCount()).to.equal(0);
    let receipt = await invoiceFactory.create(
      client,
      provider,
      token,
      price,
      terminationTime,
      EMPTY_BYTES32
    );
    const invoice0 = await awaitInvoiceAddress(await receipt.wait());
    expect(await invoiceFactory.invoiceCount()).to.equal(1);
    receipt = await invoiceFactory.create(
      client,
      provider,
      token,
      price,
      terminationTime,
      EMPTY_BYTES32
    );
    const invoice1 = await awaitInvoiceAddress(await receipt.wait());
    expect(await invoiceFactory.invoiceCount()).to.equal(2);

    expect(await invoiceFactory.getInvoiceAddress(0)).to.equal(invoice0);
    expect(await invoiceFactory.getInvoiceAddress(1)).to.equal(invoice1);
  });
});
