const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("🔥Fork Compound Test🔥", function () {
  async function deployCompound() {
    const [owner, user1, user2] = await ethers.getSigners();

    //deploy comptroller for risk control
    const comptrollerFactory = await ethers.getContractFactory("Comptroller");
    const comptroller = await comptrollerFactory.deploy();
    await comptroller.deployed();

    //deploy and set price oracle
    const priceOracleFactory = await ethers.getContractFactory(
      "SimplePriceOracle"
    );
    const priceOracle = await priceOracleFactory.deploy();
    await priceOracle.deployed();
    comptroller._setPriceOracle(priceOracle.address);

    //deploy interest rate model
    const interestRateModelFactory = await ethers.getContractFactory(
      "WhitePaperInterestRateModel"
    );
    const interestRateModel = await interestRateModelFactory.deploy(
      ethers.utils.parseUnits("0", 18),
      ethers.utils.parseUnits("0", 18)
    );
    await interestRateModel.deployed();

    //deploy token A
    const erc20Factory = await ethers.getContractFactory("MMC");
    const erc20 = await erc20Factory.deploy(
      ethers.utils.parseUnits("1000", 18)
    );
    await erc20.deployed();

    const CErc20Factory = await ethers.getContractFactory("CErc20Immutable");
    const CErc20 = await CErc20Factory.deploy(
      erc20.address,
      comptroller.address,
      interestRateModel.address,
      ethers.utils.parseUnits("1", 18),
      "compound MMC",
      "cMMC",
      18,
      owner.address
    );
    await CErc20.deployed();

    //deploy token B
    const erc20_2Factory = await ethers.getContractFactory("FDC");
    const erc20_2 = await erc20_2Factory.deploy(
      ethers.utils.parseUnits("1000", 18)
    );
    await erc20_2.deployed();

    const CErc20_2Factory = await ethers.getContractFactory("CErc20Immutable");
    const CErc20_2 = await CErc20_2Factory.deploy(
      erc20_2.address,
      comptroller.address,
      interestRateModel.address,
      ethers.utils.parseUnits("1", 18),
      "compound FDC",
      "cFDC",
      18,
      owner.address
    );
    await CErc20_2.deployed();

    return {
      owner,
      user1,
      user2,
      CErc20,
      erc20,
      comptroller,
      priceOracle,
      CErc20_2,
      erc20_2,
    };
  }

  describe("Deploy underlying token", function () {
    it("Deployer can get 1000 initial supply for token A", async function () {
      const { erc20, owner } = await loadFixture(deployCompound);

      expect(await erc20.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("1000", 18)
      );
      console.log("🐱underlying ERC20 token A(MMC):", erc20.address);
    });

    it("Deployer can get 1000 initial supply for token B", async function () {
      const { erc20_2, owner } = await loadFixture(deployCompound);

      expect(await erc20_2.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("1000", 18)
      );
      console.log("🐶underlying ERC20 token B(FDC):", erc20_2.address);
    });
  });

  describe("Compund mint/redeem function", function () {
    it("User can correctly supply Compound with 100 token A", async function () {
      const { CErc20, erc20, comptroller, owner } = await loadFixture(
        deployCompound
      );
      await comptroller._supportMarket(CErc20.address);
      await erc20.approve(CErc20.address, ethers.utils.parseUnits("10000", 18));
      await CErc20.mint(ethers.utils.parseUnits("100", 18));
      expect(await CErc20.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("100", 18)
      );
      expect(await erc20.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("900", 18)
      );
      console.log("🐱🐱CErc20 token A(cMMC):", CErc20.address);
    });

    it("User can correctly redeem all 100 token A with cToken A", async function () {
      const { CErc20, erc20, comptroller, owner } = await loadFixture(
        deployCompound
      );
      await comptroller._supportMarket(CErc20.address);
      await erc20.approve(CErc20.address, ethers.utils.parseUnits("10000", 18));
      await CErc20.mint(ethers.utils.parseUnits("100", 18));
      await CErc20.redeem(ethers.utils.parseUnits("100", 18));
      expect(await CErc20.balanceOf(owner.address)).to.equal(0);
      expect(await erc20.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("1000", 18)
      );
    });

    it("User can correctly supply Compound with 500 token B", async function () {
      const { CErc20_2, erc20_2, comptroller, owner } = await loadFixture(
        deployCompound
      );
      await comptroller._supportMarket(CErc20_2.address);
      await erc20_2.approve(
        CErc20_2.address,
        ethers.utils.parseUnits("10000", "18")
      );
      await CErc20_2.mint(ethers.utils.parseUnits("500", 18));
      expect(await CErc20_2.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("500", 18)
      );
      expect(await erc20_2.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("500", 18)
      );
      console.log("🐶🐶CErc20 token B(cFDC):", CErc20_2.address);
    });

    it("User can correctly redeem partial 300 token B with cToken B", async function () {
      const { CErc20_2, erc20_2, comptroller, owner } = await loadFixture(
        deployCompound
      );
      await comptroller._supportMarket(CErc20_2.address);
      await erc20_2.approve(
        CErc20_2.address,
        ethers.utils.parseUnits("10000", "18")
      );
      await CErc20_2.mint(ethers.utils.parseUnits("500", 18));
      await CErc20_2.redeem(ethers.utils.parseUnits("300", 18));
      expect(await CErc20_2.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("200", 18)
      );
      expect(await erc20_2.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("800", 18)
      );
    });
  });

  describe("Compound borrow/repay function", function () {
    it("User can borrow A token by collateralize B token", async function () {
      const {
        owner,
        user1,
        erc20,
        erc20_2,
        CErc20,
        CErc20_2,
        priceOracle,
        comptroller,
      } = await loadFixture(deployCompound);

      //List token A/B on compound
      await comptroller._supportMarket(CErc20.address);
      await comptroller._supportMarket(CErc20_2.address);

      //Set token A price
      await priceOracle.setUnderlyingPrice(
        CErc20.address,
        ethers.utils.parseUnits("1", 18)
      );
      //Set token B price
      await priceOracle.setUnderlyingPrice(
        CErc20_2.address,
        ethers.utils.parseUnits("100", 18)
      );
      //Set token B collateral factor
      await comptroller._setCollateralFactor(
        CErc20_2.address,
        ethers.utils.parseUnits("0.5", 18)
      );

      //Mint token A and supply token A into compound
      await erc20.connect(user1).mint(ethers.utils.parseUnits("100", 18));
      await erc20
        .connect(user1)
        .approve(CErc20.address, ethers.utils.parseUnits("1000", 18));
      await CErc20.connect(user1).mint(ethers.utils.parseUnits("100", 18));

      //Mint token B and supply token B into compound
      await erc20_2.connect(user1).mint(ethers.utils.parseUnits("10", 18));
      await erc20_2
        .connect(user1)
        .approve(CErc20_2.address, ethers.utils.parseUnits("1000", 18));
      await CErc20_2.connect(user1).mint(ethers.utils.parseUnits("1", 18));

      //Collateralize token B and borrow token A
      await comptroller.connect(user1).enterMarkets([CErc20_2.address]);
      await CErc20.connect(user1).borrow(ethers.utils.parseUnits("50", 18));
    });
  });

  describe("Compound liquidation function", function () {
    it("Execute liquidation by modify token B collateral factor", async function () {
      const {
        owner,
        user1,
        user2,
        erc20,
        erc20_2,
        CErc20,
        CErc20_2,
        priceOracle,
        comptroller,
      } = await loadFixture(deployCompound);

      //List token A/B on compound
      await comptroller._supportMarket(CErc20.address);
      await comptroller._supportMarket(CErc20_2.address);

      //Set token A price
      await priceOracle.setUnderlyingPrice(
        CErc20.address,
        ethers.utils.parseUnits("1", 18)
      );
      //Set token B price
      await priceOracle.setUnderlyingPrice(
        CErc20_2.address,
        ethers.utils.parseUnits("100", 18)
      );
      //Set token B collateral factor
      await comptroller._setCollateralFactor(
        CErc20_2.address,
        ethers.utils.parseUnits("0.5", 18)
      );

      //Set close factor
      await comptroller._setCloseFactor(ethers.utils.parseUnits("0.5", 18));

      //Set liquidation incentive
      await comptroller._setLiquidationIncentive(
        ethers.utils.parseUnits("1.2", 18)
      );

      //Mint token A and supply token A into compound
      await erc20.connect(user1).mint(ethers.utils.parseUnits("100", 18));
      await erc20
        .connect(user1)
        .approve(CErc20.address, ethers.utils.parseUnits("1000", 18));
      await CErc20.connect(user1).mint(ethers.utils.parseUnits("100", 18));

      //Mint token B and supply token B into compound
      await erc20_2.connect(user1).mint(ethers.utils.parseUnits("10", 18));
      await erc20_2
        .connect(user1)
        .approve(CErc20_2.address, ethers.utils.parseUnits("1000", 18));
      await CErc20_2.connect(user1).mint(ethers.utils.parseUnits("1", 18));

      //Collateralize token B and borrow token A
      await comptroller.connect(user1).enterMarkets([CErc20_2.address]);
      await CErc20.connect(user1).borrow(ethers.utils.parseUnits("50", 18));

      //Modify token B collateral factor
      await comptroller._setCollateralFactor(
        CErc20_2.address,
        ethers.utils.parseUnits("0.3", 18)
      );

      //user2 liquidate user1
      await erc20.connect(user2).mint(ethers.utils.parseUnits("50", 18));
      await erc20
        .connect(user2)
        .approve(CErc20.address, ethers.utils.parseUnits("1000", 18));
      await CErc20.connect(user2).liquidateBorrow(
        user1.address,
        ethers.utils.parseUnits("25", 18),
        CErc20_2.address
      );

      expect(await erc20.balanceOf(user2.address)).to.equal(
        ethers.utils.parseUnits("25", 18)
      );
      //protocolSeizeShareMantissa = 2.8%
      //25*1*1.2*(1-0.028)/100
      expect(await CErc20_2.balanceOf(user2.address)).to.equal(
        ethers.utils.parseUnits("0.2916", 18)
      );
    });
  });
});
