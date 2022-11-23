const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("CERC20", function () {
  let owner;
  let user1;
  let comptroller;
  let erc20;
  let CErc20;

  async function deployCompound() {
    const [owner, user1] = await ethers.getSigners();

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

    return { owner, user1, comptroller, erc20, CErc20 };
  }

  before(async function () {
    fixture = await loadFixture(deployCompound);
    owner = fixture.owner;
    user1 = fixture.user1;
    comptroller = fixture.comptroller;
    erc20 = fixture.erc20;
    CErc20 = fixture.CErc20;
    // const { ownerc, user1c, comptrollerc, erc20c, CErc20c } = await loadFixture(
    //   deployCompound
    // );
    // owner = ownerc;
    // user1 = user1c;
    // comptroller = comptrollerc;
    // erc20 = erc20c;
    // CErc20 = CErc20c;
  });

  describe("Deploy basic compound", function () {
    it("Get erc20 / CErc20 address", async function deployCompound() {
      console.log("underlying ERC20 token:", erc20.address);
      console.log("CErc20 token:", CErc20.address);
    });
  });

  describe("Check ERC20 deploying", function () {
    it("Get 100000 MMC", async function () {
      // const { erc20, owner } = await loadFixture(deployCompound);
      expect(await erc20.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("100000", 18)
      );
    });
  });

  describe("Check CErc20 function", function () {
    it("Mint function, user1 can get 100 CErc20 token", async function () {
      // const { CErc20, erc20, comptroller, owner } = await loadFixture(
      //   deployCompound
      // );
      await comptroller._supportMarket(CErc20.address);
      await erc20.connect(user1).mint(ethers.utils.parseUnits("100", 18));
      await erc20
        .connect(user1)
        .approve(CErc20.address, ethers.utils.parseUnits("1000000", 18));
      await CErc20.connect(user1).mint(ethers.utils.parseUnits("100", 18));
      expect(await CErc20.balanceOf(user1.address)).to.equal(
        ethers.utils.parseUnits("100", 18)
      );
      expect(await erc20.balanceOf(user1.address)).to.equal(0);
      expect(await CErc20.totalSupply()).to.equal(
        ethers.utils.parseUnits("100", 18)
      );
    });

    it("Redeem function, user1 can redeem 100 erc20 token by repaying CErc20 token", async function () {
      // const { CErc20, erc20, comptroller, owner } = await loadFixture(
      //   deployCompound
      // );
      // await comptroller._supportMarket(CErc20.address);
      // await erc20.approve(
      //   CErc20.address,
      //   ethers.utils.parseUnits("1000000", 18)
      // );
      // await CErc20.mint(ethers.utils.parseUnits("100", 18));
      await CErc20.connect(user1).redeem(ethers.utils.parseUnits("100", 18));
      expect(await CErc20.balanceOf(user1.address)).to.equal(0);
      expect(await erc20.balanceOf(user1.address)).to.equal(
        ethers.utils.parseUnits("100", 18)
      );
      expect(await CErc20.totalSupply()).to.equal(0);
    });
  });
});
