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

    //deploy cToken A
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

    //deploy cToken B
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
      interestRateModel,
    };
  }

  describe("Compound liquidation function", function () {
    it("Execute liquidation by modifying token B collateral factor", async function () {
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

    it("Execute liquidation by modifying token B price", async function () {
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

      //Modify token B price
      await priceOracle.setUnderlyingPrice(
        CErc20_2.address,
        ethers.utils.parseUnits("80", 18)
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

      //check user2 remained token A after repay user1 borrow
      expect(await erc20.balanceOf(user2.address)).to.equal(
        ethers.utils.parseUnits("25", 18)
      );
      //protocolSeizeShareMantissa = 2.8%
      //25*1*1.2*(1-0.028)/80
      expect(await CErc20_2.balanceOf(user2.address)).to.equal(
        ethers.utils.parseUnits("0.3645", 18)
      );
    });
  });
  describe("Flash loan liquiate", function () {
    //fork Ethereum mainnet ✅
    //get UNI/ USDC contract address ✅
    //check AAVE flash loan contract
    //build smart contract for receiverAddress of flash loan
    it("Deploy compound and set basic factor", async function () {
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
        interestRateModel,
      } = await loadFixture(deployCompound);

      let uniAddress = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
      let usdcAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

      //deploy cToken UNI on Compound
      const CErc20UNIFactory = await ethers.getContractFactory(
        "CErc20Immutable"
      );
      const CErc20UNI = await CErc20UNIFactory.deploy(
        uniAddress,
        comptroller.address,
        interestRateModel.address,
        ethers.utils.parseUnits("1", 18),
        "compound UNI",
        "cUNI",
        18,
        owner.address
      );
      await CErc20UNI.deployed();

      //deploy cToken USDC on Compound
      const CErc20USDCFactory = await ethers.getContractFactory(
        "CErc20Immutable"
      );
      const CErc20USDC = await CErc20USDCFactory.deploy(
        usdcAddress,
        comptroller.address,
        interestRateModel.address,
        ethers.utils.parseUnits("1", 18),
        "compound UNI",
        "cUNI",
        18,
        owner.address
      );
      await CErc20USDC.deployed();

      //List UNI/USDC on Compound
      await comptroller._supportMarket(CErc20UNI.address);
      await comptroller._supportMarket(CErc20USDC.address);

      //Set UNI/USDC price
      await priceOracle.setUnderlyingPrice(
        CErc20UNI.address,
        ethers.utils.parseUnits("10", 18)
      );
      await priceOracle.setUnderlyingPrice(
        CErc20USDC.address,
        ethers.utils.parseUnits("1", 18)
      );

      //Set close factor
      await comptroller._setCloseFactor(ethers.utils.parseUnits("0.5", 18));

      //Set liquidation incentive
      await comptroller._setLiquidationIncentive(
        ethers.utils.parseUnits("1.08", 18)
      );

      //Set UNI collateral factor
      await comptroller._setCollateralFactor(
        CErc20UNI.address,
        ethers.utils.parseUnits("0.5", 18)
      );
    });
  });
});
