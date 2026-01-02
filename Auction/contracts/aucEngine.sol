// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;


contract AucEngine {
    address public owner;
    uint constant DURATION = 2 days; // in seconds -- 2 * 24 * 60 * 60
    uint constant FEE = 10; // percents fee

    struct Auction {
        address payable seller;
        uint startingPrice;
        uint finalPrice;
        uint startAt;
        uint endsAt;
        uint discountRate; // how much we will discount from the price every second
        string item; // subject of sale
        bool stopped;
    }

    Auction[] public auctions;

    // events
    event AuctionCreated(uint index, string itemName, uint startingPrice, uint duration);
    event AuctionEnded(uint index, uint finalPrice, address winner);



    constructor() {
        owner = msg.sender;
    }

    function createAuction(uint _startingPrice, uint _discountRate, string calldata _item, uint _duration) external {
        uint duration = _duration == 0 ? DURATION : _duration;
        // or
        // if (_duration == 0) {
        //     DURATION
        // } else {
        //     _duration
        // }
        // }

        require(_startingPrice > _discountRate * duration, "incorrect starting price");

        Auction memory newAuction = Auction({
            seller: payable(msg.sender),
            startingPrice: _startingPrice,
            finalPrice: _startingPrice,
            discountRate: _discountRate,
            startAt: block.timestamp, // or 'now'
            endsAt: block.timestamp + duration,
            item: _item,
            stopped: false
        });

        auctions.push(newAuction);

        emit AuctionCreated(auctions.length - 1, _item, _startingPrice, duration);
    }

    function getPriceFor(uint index) public view returns(uint) {
        Auction storage cAuction = auctions[index]; // current auction -> in storage
        require(!cAuction.stopped, "auction is stopped!");
        uint elapsed = block.timestamp - cAuction.startAt;
        uint discount = cAuction.discountRate * elapsed;
        return cAuction.startingPrice - discount;
    }

    function buy(uint index) external payable {
        Auction storage cAuction = auctions[index];
        require(!cAuction.stopped, "auction is stopped!");
        require(block.timestamp < cAuction.endsAt, "auction is ended!");
        uint cPrice = getPriceFor(index);
        require(msg.value >= cPrice, "not enough funds!!!");
        cAuction.stopped = true;
        cAuction.finalPrice = cPrice;

        // refund of excess funds
        uint refund = msg.value - cPrice; 
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }

        // transfer funds to seller (+ fee)
        cAuction.seller.transfer(
            cPrice - ((cPrice * FEE) / 100)
        );

        emit AuctionEnded(index, cPrice, msg.sender);
    }
}