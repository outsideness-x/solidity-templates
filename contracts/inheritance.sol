// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract Ownable {
    address public owner;

    constructor(address ownerOverride) {
        owner = ownerOverride == address(0) ? msg.sender : ownerOverride;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "not an owner!!");
        _;
    }

    // send funds to owner
    function withdraw(address payable _to) public virtual onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}

abstract contract Balances is Ownable {
    function getBalance() public view onlyOwner returns(uint) {
        return address(this).balance;
    }

    function withdraw(address payable _to) public virtual override onlyOwner {
        require(_to != address(0), "Invalid address");
        _to.transfer(getBalance());
    }
}

contract myContract is Balances {
    constructor(address _owner) Ownable(_owner) {
        
    }

    function withdraw(address payable _to) public override onlyOwner {
        super.withdraw(_to);
    }
    
    receive() external payable {}
}
