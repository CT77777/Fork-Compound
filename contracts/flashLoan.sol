//SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./contracts_aaveV2/flashloan/base/FlashLoanReceiverBase.sol";
import "./contracts_compound/CTokenInterfaces.sol";
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';

// interface CErc20Interface {
//     function liquidateBorrow(address borrower, uint repayAmount, CTokenInterface cTokenCollateral) virtual external returns (uint);
//     function redeem(uint redeemTokens) virtual external returns (uint);
// }

// interface ISwapRouter {
//     struct ExactInputSingleParams {
//         address tokenIn;
//         address tokenOut;
//         uint24 fee;
//         address recipient;
//         uint256 deadline;
//         uint256 amountIn;
//         uint256 amountOutMinimum;
//         uint160 sqrtPriceLimitX96;
//     }

//     function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
// }

contract falshLoan is FlashLoanReceiverBase {
    constructor(ILendingPoolAddressesProvider _providerAddress) FlashLoanReceiverBase(_providerAddress) public {}
    
    address public userBeLiquidated; //user1
    CErc20Interface public cTokenBeLiquidated; //cUSDC
    CErc20Interface public cTokenIncentive; //cUNI
    ISwapRouter swapRouter = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address USDC_ADDRESS = 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48;
    address UNI_ADDRESS = 0x1f9840a85d5af5bf1d1762f925bdaddc4201f984;
    
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

    uint256 amountOut = swapRouter.exactInputSingle(swapParams);

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

    LENDING_POOL.flashloan(receiverAddress, assets, amounts, modes, onBehalfOf, params, referralCode);
  }

  function ADDRESSES_PROVIDER() external view override returns (ILendingPoolAddressesProvider) {
    return ADDRESSES_PROVIDER;
  }

  function LENDING_POOL() external view override returns (ILendingPool) {
    return LENDING_POOL;
  }
}