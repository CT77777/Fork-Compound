const {
  time,
  loadFixture,
  impersonateAccount,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Transfer USDC", function () {
  let usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  let binanceHotWalletAddress = "0xF977814e90dA44bFA03b6295A0616a897441aceC";

  it("BinanceWallet should contain USDC", async function () {
    // accounts = await ethers.getSigners();
    usdc = await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      usdcAddress
    );
    let balance = await usdc.balanceOf(binanceHotWalletAddress);
    expect(balance).to.gt(0);
    console.log(`Binance wallet USDC balance:${balance}`);
  });

  it("Ask Binance to give me USDC", async function () {
    accounts = await ethers.getSigners();
    let transferAmount = 17523000000;
    await impersonateAccount(binanceHotWalletAddress);
    // await hre.network.provider.request({
    //   method: "hardhat_impersonateAccount",
    //   params: [binanceHotWalletAddress],
    // });
    const binanceWallet = await ethers.getSigner(binanceHotWalletAddress);
    await usdc
      .connect(binanceWallet)
      .transfer(accounts[0].address, transferAmount);
    let balance = await usdc.balanceOf(accounts[0].address);
    let balance2 = await usdc.balanceOf(binanceHotWalletAddress);
    console.log(`Our wallet USDC balance: ${balance}`);
    console.log(`Binance wallet USDC balance:${balance2}`);
    console.log(accounts[0].address);
    expect(balance).to.equal(transferAmount);
  });
});
