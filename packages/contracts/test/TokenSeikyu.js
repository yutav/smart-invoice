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
const requireVerification = true;


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
      mockWrappedNativeToken.address,
      requireVerification,
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
      mockWrappedNativeToken.address,
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
      mockWrappedNativeToken.address,
      requireVerification,
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
      mockWrappedNativeToken.address,
      requireVerification,
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
      mockWrappedNativeToken.address,
      requireVerification,
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
      mockWrappedNativeToken.address,
      requireVerification,
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
      requireVerification,
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
      mockWrappedNativeToken.address,
      requireVerification,
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
      mockWrappedNativeToken.address,
      requireVerification,
    );
    await expect(receipt).to.revertedWith("duration too long");
  });

  /*
  it("Should revert release by non client", async function () {
    invoice = await invoice.connect(provider);
    await expect(invoice["release()"]()).to.be.revertedWith("!client");
  });

  it("Should revert release with low balance", async function () {
    await mockToken.mock.balanceOf.withArgs(invoice.address).returns(5);
    await expect(invoice["release()"]()).to.be.revertedWith(
      "insufficient balance",
    );
  });

  it("Should release", async function () {
    await mockToken.mock.balanceOf.withArgs(invoice.address).returns(10);
    await mockToken.mock.transfer.withArgs(provider.address, 10).returns(true);
    const receipt = await invoice["release()"]();
    expect(await invoice["released()"]()).to.equal(10);
    await expect(receipt).to.emit(invoice, "Release").withArgs(10);
  });


  it("Should revert release if insufficient balance", async function () {
    await mockToken.mock.balanceOf.withArgs(invoice.address).returns(0);
    await expect(invoice["release()"]()).to.be.revertedWith("insufficient balance");
  });
  
  it("Should revert release if canceled", async function () {
    const canceledInvoice = await getLockedInvoice(
      TokenSeikyu,
      client,
      provider,
      mockToken,
      price,
      mockWrappedNativeToken,
    );
    expect(canceledInvoice["release()"]()).to.be.revertedWith("canceled");
  });

  it("Should releaseTokens with passed token", async function () {
    await otherMockToken.mock.balanceOf.withArgs(invoice.address).returns(10);
    await otherMockToken.mock.transfer
      .withArgs(provider.address, 10)
      .returns(true);
    await invoice["releaseTokens(address)"](otherMockToken.address);
  });

  it("Should call release if releaseTokens with invoice token", async function () {
    await mockToken.mock.balanceOf.withArgs(invoice.address).returns(10);
    await mockToken.mock.transfer.withArgs(provider.address, 10).returns(true);
    const receipt = await invoice["releaseTokens(address)"](mockToken.address);
    await expect(receipt).to.emit(invoice, "Release").withArgs(10);
  });

  it("Should revert releaseTokens if not client", async function () {
    invoice = await invoice.connect(provider);
    const receipt = invoice["releaseTokens(address)"](otherMockToken.address);
    await expect(receipt).to.revertedWith("!client");
  });


  it("Should revert withdraw before terminationTime", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    await invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      currentTime + 3600,
      mockWrappedNativeToken.address,
      requireVerification,
    );

    const receipt = invoice["withdraw()"]();
    await expect(receipt).to.revertedWith("!terminated");
  });

  it("Should revert withdraw if canceled", async function () {
    const canceledInvoice = await getLockedInvoice(
      TokenSeikyu,
      client,
      provider,
      mockToken,
      price,
      mockWrappedNativeToken,
    );
    await expect(canceledInvoice["withdraw()"]()).to.be.revertedWith("canceled");
  });

  it("Should withdraw after terminationTime", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    await invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      currentTime + 1000,
      mockWrappedNativeToken.address,
      requireVerification,
    );
    await waffleProvider.send("evm_setNextBlockTimestamp", [
      currentTime + 1000,
    ]);
    await mockToken.mock.balanceOf.withArgs(invoice.address).returns(10);
    await mockToken.mock.transfer.withArgs(client.address, 10).returns(true);

    const receipt = await invoice["withdraw()"]();
    await expect(receipt).to.emit(invoice, "Withdraw").withArgs(10);
  });

  it("Should revert withdraw after terminationTime if balance is 0", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    await invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      currentTime + 1000,
      mockWrappedNativeToken.address,
      requireVerification,
    );
    await waffleProvider.send("evm_setNextBlockTimestamp", [
      currentTime + 1000,
    ]);
    await mockToken.mock.balanceOf.withArgs(invoice.address).returns(0);

    const receipt = invoice["withdraw()"]();
    await expect(receipt).to.be.revertedWith("balance is 0");
  });

  it("Should call withdraw from withdrawTokens", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    await invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      currentTime + 1000,
      mockWrappedNativeToken.address,
      requireVerification,
    );
    await waffleProvider.send("evm_setNextBlockTimestamp", [
      currentTime + 1000,
    ]);
    await mockToken.mock.balanceOf.withArgs(invoice.address).returns(10);
    await mockToken.mock.transfer.withArgs(client.address, 10).returns(true);

    const receipt = await invoice["withdrawTokens(address)"](mockToken.address);
    await expect(receipt).to.emit(invoice, "Withdraw").withArgs(10);
  });

  it("Should withdrawTokens for otherToken", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    await invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      currentTime + 1000,
      mockWrappedNativeToken.address,
      requireVerification,
    );
    await waffleProvider.send("evm_setNextBlockTimestamp", [
      currentTime + 1000,
    ]);
    await otherMockToken.mock.balanceOf.withArgs(invoice.address).returns(10);
    await otherMockToken.mock.transfer
      .withArgs(client.address, 10)
      .returns(true);

    await invoice["withdrawTokens(address)"](otherMockToken.address);
  });

  it("Should revert withdrawTokens for otherToken if not terminated", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    await invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      currentTime + 1000,
      mockWrappedNativeToken.address,
      requireVerification,
    );

    const receipt = invoice["withdrawTokens(address)"](otherMockToken.address);
    await expect(receipt).to.be.revertedWith("!terminated");
  });

  it("Should revert withdrawTokens for otherToken if balance is 0", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    await invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      currentTime + 1000,
      mockWrappedNativeToken.address,
      requireVerification,
    );
    await waffleProvider.send("evm_setNextBlockTimestamp", [
      currentTime + 1000,
    ]);

    await otherMockToken.mock.balanceOf.withArgs(invoice.address).returns(0);
    const receipt = invoice["withdrawTokens(address)"](otherMockToken.address);
    await expect(receipt).to.be.revertedWith("balance is 0");
  });

  it("Should revert lock if terminated", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    await invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      currentTime + 1000,
      mockWrappedNativeToken.address,
      requireVerification,
    );
    await waffleProvider.send("evm_setNextBlockTimestamp", [
      currentTime + 1000,
    ]);

    await mockToken.mock.balanceOf.withArgs(invoice.address).returns(10);
    const receipt = invoice["lock()"]();
    await expect(receipt).to.be.revertedWith("terminated");
  });
  */

  /*
  MEMO: キャンセル時には残高不足でもrevertしない。

  it("Should revert cancel if balance is 0", async function () {
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    await invoice.init(
      client.address,
      provider.address,
      mockToken.address,
      price,
      currentTime + 1000,
      mockWrappedNativeToken.address,
      requireVerification,
    );
    await mockToken.mock.balanceOf.withArgs(invoice.address).returns(0);
    const receipt = invoice["cancel()"]();
    await expect(receipt).to.be.revertedWith("balance is 0");
  });
  */
  it("Should revert cancel if not client", async function () {
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
      mockWrappedNativeToken.address,
      requireVerification,
    );
    await mockToken.mock.balanceOf.withArgs(invoice.address).returns(10);
    // connect with other account (nor client or provider)
    const invoiceWithProvider = await invoice.connect(provider);
    const receipt = invoiceWithProvider["cancel()"]();
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
      mockWrappedNativeToken.address,
      requireVerification,
    );
    await mockToken.mock.balanceOf.withArgs(invoice.address).returns(0);
    const receipt = invoice["deny()"]();
    await expect(receipt).to.be.revertedWith("balance is 0");
  });
  */
  it("Should revert deny if not provider", async function () {
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
      mockWrappedNativeToken.address,
      requireVerification,
    );
    await mockToken.mock.balanceOf.withArgs(invoice.address).returns(10);
    const invoiceWithClient = await invoice.connect(client);
    const receipt = invoiceWithClient["deny()"]();
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
  it("Should revert payByClient if not canceled", async function () {
    await expect(
      invoice["payByClient(uint256)"](10),
    ).to.be.revertedWith("!canceled");
  });

  /*
  it("Should revert payByClient if not client", async function () {
    let canceledInvoice = await getLockedInvoice(
      TokenSeikyu,
      client,
      provider,
      mockToken,
      price,
      mockWrappedNativeToken,
    );
    await mockToken.mock.balanceOf.withArgs(canceledInvoice.address).returns(10);
    await mockToken.mock.transfer.withArgs(client.address, 10).returns(true);
    canceledInvoice = await canceledInvoice.connect(resolver); // connect with not client user
    await expect(
      canceledInvoice["payByClient(uint256)"](10),
    ).to.be.revertedWith("!client");
  });

  /*
  it("Should payByClient with correct rewards", async function () {
    let canceledInvoice = await getLockedInvoice(
      TokenSeikyu,
      client,
      provider,
      mockToken,
      price,
      mockWrappedNativeToken,
    );
    await mockToken.mock.balanceOf.withArgs(canceledInvoice.address).returns(10);
    await mockToken.mock.transfer.withArgs(client.address, 10).returns(true);
    canceledInvoice = await canceledInvoice.connect(client);
    await expect(
      canceledInvoice["payByClient(uint256)"](10),
    )
      .to.emit(canceledInvoice, "PayByClient")
      .withArgs(10);
    expect(await canceledInvoice["released()"]()).to.be.equal(0);
    expect(await canceledInvoice["canceled()"]()).to.be.equal(false);
  });
  */
  it("Should revert receive if not wrappedNativeToken", async function () {
    const receipt = client.sendTransaction({
      to: invoice.address,
      value: 10,
    });
    await expect(receipt).to.be.revertedWith("!wrappedNativeToken");
  });

  /*
  it("Should revert receive if canceled", async function () {
    const canceledInvoice = await getLockedInvoice(
      TokenSeikyu,
      client,
      provider,
      mockToken,
      price,
      mockWrappedNativeToken,
    );
    const receipt = client.sendTransaction({
      to: canceledInvoice.address,
      value: 10,
    });
    await expect(receipt).to.be.revertedWith("canceled");
  });
  */
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
      mockWrappedNativeToken.address,
      requireVerification,
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

  it("Should emit Verified when client calls verify()", async function () {
    await expect(invoice.connect(client).verify())
      .to.emit(invoice, "Verified")
      .withArgs(client.address, invoice.address);
  });

  it("Should not emit Verified if caller !client", async function () {
    await expect(invoice.connect(randomSigner).verify()).to.be.reverted;
  });

  it("Should emit Verified if client verification requirement waived on invoice creation", async function () {
    const noVerification = false;
    const currentTime = await currentTimestamp();
    invoice = await TokenSeikyu.deploy();
    await invoice.deployed();
    await expect(
      await invoice.init(
        client.address,
        provider.address,
        mockToken.address,
        price,
        currentTime + 1000,
        EMPTY_BYTES32,
        mockWrappedNativeToken.address,
        noVerification,
      ),
    )
      .to.emit(invoice, "Verified")
      .withArgs(client.address, invoice.address);
  });


});