// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract Optimized {
    uint test;

    uint128 a = 2;
    uint128 b = 3;
    uint256 c = 4; // 128 + 128 | 258

    bytes32 public hash = "hash"; // if you now hash, just insert

    mapping(address => uint) payments;
    function pay() external payable {
        require(msg.sender != address(0), "zero adress");
        payments[msg.sender] = msg.value;
    }
}

contract Unoptimized {
    uint test = 0;  // more gas

    uint128 b = 3;
    uint128 a = 2;
    uint256 c = 4;
    
    bytes32 public hash = keccak256(
        abi.encodePacked("test")
    );

    mapping(address => uint) payments;  // if can, use mapping, not arrays
    function pay() external payable {
        address _from = msg.sender;  // do not create unnecessary variables
        require(msg.sender != address(0), "zero adress");
        payments[_from] = msg.value;
    }
}
// 11.31