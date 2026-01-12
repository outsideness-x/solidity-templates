pragma solidity ^0.8.19;

contract ReentrancyAuc {
    mapping(address => uint256) public bidders;

    function bid() public payable {
        bidders[msg.sender] += msg.value;
    }

    function refund() external {
        uint refundAmount = bidders[msg.sender];

        if (refundAmount > 0) {
            (bool success,) = msg.sender.call{value: refundAmount}("");

            require(success, "refund failed");

            bidders[msg.sender] = 0;
        }
    }

    function currentBalance() external view returns(uint) {
        return address(this).balance;
    }
}