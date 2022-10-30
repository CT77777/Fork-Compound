// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MMC is ERC20 {
    constructor (uint256 _amount) ERC20("MurMurCats", "MMC") {
        _mint(msg.sender, _amount);
    }
}