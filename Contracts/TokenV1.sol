// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./ERC20/ERC20.sol";

contract LooserBracket is ERC20 {
    constructor(uint256 initialSupply) ERC20("LooserBracket", "LBR") {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }
}
