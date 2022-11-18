//SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@aave/protocol-v2/contracts/flashloan/base/FlashLoanReceiverBase.sol";
import "hardhat/console.sol";
// import "@aave/protocol-v2/contracts/dependencies/openzeppelin/contracts/IERC20.sol";
// import "./interface/Compound/CTokenInterfaces.sol";
// import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";


interface CTokenInterface {
    function transfer(address dst, uint amount) virtual external returns (bool);
    function transferFrom(address src, address dst, uint amount) virtual external returns (bool);
    function approve(address spender, uint amount) virtual external returns (bool);
    function allowance(address owner, address spender) virtual external view returns (uint);
    function balanceOf(address owner) virtual external view returns (uint);
    function balanceOfUnderlying(address owner) virtual external returns (uint);
    function getAccountSnapshot(address account) virtual external view returns (uint, uint, uint, uint);
    function borrowRatePerBlock() virtual external view returns (uint);
    function supplyRatePerBlock() virtual external view returns (uint);
    function totalBorrowsCurrent() virtual external returns (uint);
    function borrowBalanceCurrent(address account) virtual external returns (uint);
    function borrowBalanceStored(address account) virtual external view returns (uint);
    function exchangeRateCurrent() virtual external returns (uint);
    function exchangeRateStored() virtual external view returns (uint);
    function getCash() virtual external view returns (uint);
    function accrueInterest() virtual external returns (uint);
    function seize(address liquidator, address borrower, uint seizeTokens) virtual external returns (uint);
}
interface CErc20Interface  is CTokenInterface {
    function liquidateBorrow(address borrower, uint repayAmount, CTokenInterface cTokenCollateral) virtual external returns (uint);
    function redeem(uint redeemTokens) virtual external returns (uint);
}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}


contract flashLoan is FlashLoanReceiverBase {
   
    constructor(ILendingPoolAddressesProvider _providerAddress) FlashLoanReceiverBase(_providerAddress) public {}
    
    address public userBeLiquidated; //user1
    CErc20Interface public cTokenBeLiquidated; //cUSDC
    CErc20Interface public cTokenIncentive; //cUNI
    ISwapRouter public swapRouter = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    address public USDC_ADDRESS = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public UNI_ADDRESS = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;
    
    function setTarget(address _userBeliquidated, CErc20Interface _cTokenBeLiquidated, CErc20Interface _cTokenIncentive) external {
        userBeLiquidated = _userBeliquidated;
        cTokenBeLiquidated = _cTokenBeLiquidated;
        cTokenIncentive = _cTokenIncentive;
    }

    //premium 0.09%, call FLASHLOAN_PREMIUM_TOTAL() on the LendingPool contract
    function executeOperation(
    address[] calldata assets,
    uint256[] calldata amounts,
    uint256[] calldata premiums,
    address initiator,
    bytes calldata params
  ) external override returns (bool) {

    //approve flashLoan USDC allowance to cToken_USDC
    IERC20(USDC_ADDRESS).approve(address(cTokenBeLiquidated), 10000*10**6);

    //liquidate USDC of user1
    cTokenBeLiquidated.liquidateBorrow(userBeLiquidated, amounts[0], cTokenIncentive);
   
    //redeem UNI 
    uint256 redeemAmount = cTokenIncentive.balanceOf(address(this));
    cTokenIncentive.redeem(redeemAmount);

    //exchange UNI for USDC by uniSwap
    ISwapRouter.ExactInputSingleParams memory swapParams =
    ISwapRouter.ExactInputSingleParams({
        tokenIn: UNI_ADDRESS,
        tokenOut: USDC_ADDRESS,
        fee: 3000, // 0.3%
        recipient: address(this),
        deadline: block.timestamp,
        amountIn: redeemAmount,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
    });

    //approve flashLoan UNI allowane to uniSwap_swapRouter
    IERC20(UNI_ADDRESS).approve(address(swapRouter), 10000*10**18);

    uint256 amountOut = swapRouter.exactInputSingle(swapParams);
    console.log("USDC swapped from liquidated UNI:", amountOut, "USDC");
    
    //approve flashLoan USDC allowance to LendingPool
    for (uint i = 0; i < assets.length; i++) {
            uint amountOwing = amounts[i].add(premiums[i]);
            IERC20(assets[i]).approve(address(LENDING_POOL), amountOwing);
        }
    
    return true;
  }

  function myFlashLoanCall() external returns (bool) {
    address receiverAddress = address(this);

    //USDC address
    address[] memory assets = new address[](1);
    assets[0] = address(USDC_ADDRESS); //USDC

    //borrow 2500 USDC
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = 2500*10**6;

    //no debt
    uint256[] memory modes = new uint256[](1);
    modes[0] = 0;

    address onBehalfOf = address(this);
    bytes memory params = "";
    uint16 referralCode = 0;
   
    LENDING_POOL.flashLoan(receiverAddress, assets, amounts, modes, onBehalfOf, params, referralCode);
    
  }

  function withdrawProfit() external {
    IERC20(USDC_ADDRESS).transfer(msg.sender, IERC20(USDC_ADDRESS).balanceOf(address(this)));
  }

  // function ADDRESSES_PROVIDER() external view override returns (ILendingPoolAddressesProvider) {
  //   return ADDRESSES_PROVIDER;
  // }

  // function LENDING_POOL() external view override returns (ILendingPool) {
  //   return LENDING_POOL;
  // }
}