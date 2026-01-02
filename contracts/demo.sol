// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "logger.sol";

contract Demo {
    Logger logger;

    constructor(address _logger) {
        logger = Logger(_logger);
    }

    function payment(address _from, uint _number) public view returns(uint) {
        return logger.getEntry(_from, _number);
    }

    receive() external payable {
        logger.log(msg.sender, msg.value);
    }
}