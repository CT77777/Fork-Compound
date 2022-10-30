const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("CERC20", function () {
  async function deployCompound() {
    const [owner] = await ethers.getSigners();

    const comptrollerFactory = await ethers.getContractFactory("Comptroller");
    const comptroller = await comptrollerFactory.deploy();
    await comptroller.deployed();

    const erc20Factory = await ethers.getContractFactory("MMC");
    const erc20 = await erc20Factory.deploy(
      ethers.utils.parseUnits("100000", 18)
    );
    await erc20.deployed();

    const interestRateModelFactory = await ethers.getContractFactory(
      "WhitePaperInterestRateModel"
    );
    const interestRateModel = await interestRateModelFactory.deploy(
      ethers.utils.parseUnits("0", 18),
      ethers.utils.parseUnits("0", 18)
    );
    await interestRateModel.deployed();

    const CErc20Factory = await ethers.getContractFactory("CErc20Immutable");
    const CErc20 = await CErc20Factory.deploy(
      erc20.address,
      comptroller.address,
      interestRateModel.address,
      ethers.utils.parseUnits("1", 18),
      "staked MMC",
      "sMMC",
      18,
      owner.address
    );
    await CErc20.deployed();

    return { CErc20, erc20, comptroller, owner };
  }

  it("Deploy basic compound", async function deployCompound() {
    const [owner] = await ethers.getSigners();

    const comptrollerFactory = await ethers.getContractFactory("Comptroller");
    const comptroller = await comptrollerFactory.deploy();
    await comptroller.deployed();

    const erc20Factory = await ethers.getContractFactory("MMC");
    const erc20 = await erc20Factory.deploy(
      ethers.utils.parseUnits("100000", 18)
    );
    await erc20.deployed();

    const interestRateModelFactory = await ethers.getContractFactory(
      "WhitePaperInterestRateModel"
    );
    const interestRateModel = await interestRateModelFactory.deploy(
      ethers.utils.parseUnits("0", 18),
      ethers.utils.parseUnits("0", 18)
    );
    await interestRateModel.deployed();

    const CErc20Factory = await ethers.getContractFactory("CErc20Immutable");
    const CErc20 = await CErc20Factory.deploy(
      erc20.address,
      comptroller.address,
      interestRateModel.address,
      ethers.utils.parseUnits("1", 18),
      "staked MMC",
      "sMMC",
      18,
      owner.address
    );
    await CErc20.deployed();
    console.log("underlying ERC20 token:", erc20.address);
    console.log("CErc20 token:", CErc20.address);
  });

  it("Get 100000 MMC", async function () {
    const { erc20, owner } = await loadFixture(deployCompound);
    // const [owner] = await ethers.getSigners();

    // const erc20Factory = await ethers.getContractFactory("MMC");
    // const erc20 = await erc20Factory.deploy(
    //   ethers.utils.parseUnits("100000", 18)
    // );
    // await erc20.deployed();

    expect(await erc20.balanceOf(owner.address)).to.equal(
      ethers.utils.parseUnits("100000", 18)
    );
  });

  it("enter market", async function () {
    const { comptroller, erc20 } = await loadFixture(deployCompound);
    await comptroller.enterMarkets([erc20.address]);
  });

  it("Check mint function", async function () {
    const { CErc20, erc20, comptroller, owner } = await loadFixture(
      deployCompound
    );
    await comptroller._supportMarket(CErc20.address);
    await erc20.approve(CErc20.address, ethers.utils.parseUnits("1000000", 18));
    await CErc20.mint(ethers.utils.parseUnits("100", 18));
    expect(await CErc20.balanceOf(owner.address)).to.equal(
      ethers.utils.parseUnits("100", 18)
    );
  });

  it("Check redeem function", async function () {
    const { CErc20, erc20, comptroller, owner } = await loadFixture(
      deployCompound
    );
    await comptroller._supportMarket(CErc20.address);
    await erc20.approve(CErc20.address, ethers.utils.parseUnits("1000000", 18));
    await CErc20.mint(ethers.utils.parseUnits("100", 18));
    await CErc20.redeem(ethers.utils.parseUnits("100", 18));
    expect(await CErc20.balanceOf(owner.address)).to.equal(0);
    expect(await erc20.balanceOf(owner.address)).to.equal(
      ethers.utils.parseUnits("100000", 18)
    );
  });
});
