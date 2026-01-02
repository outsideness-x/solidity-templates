import { expect } from "chai";
import { ethers } from "hardhat";
import { AucEngine } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("AucEngine", function () {
  let auction: AucEngine;
  let owner: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;

  // constants for tests
  const DURATION = 2 * 24 * 60 * 60; // 2 days in seconds
  const FEE = 10; // 10% fee
  
  // auction parameters
  const STARTING_PRICE = ethers.parseEther("200"); // 200 ETH
  const DISCOUNT_RATE = ethers.parseEther("0.001"); // 0.001 ETH per second
  const ITEM_NAME = "Test Item";

  beforeEach(async function () {
    // get test accounts
    [owner, seller, buyer] = await ethers.getSigners();
    
    // deploy contract
    const AucEngineFactory = await ethers.getContractFactory("AucEngine");
    auction = await AucEngineFactory.deploy();
    await auction.waitForDeployment();
  });

  /**
   * deploy and init
   */
  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await auction.owner()).to.equal(owner.address);
    });

    it("Should have zero auctions initially", async function () {
      // check that we cannot access auction with index 0
      await expect(auction.auctions(0)).to.be.reverted;
    });
  });

  /**
   * tests for create auction
   */
  describe("Create Auction", function () {
    it("Should create an auction with correct parameters", async function () {
      // start auction by seller
      const tx = await auction.connect(seller).createAuction(
        STARTING_PRICE,
        DISCOUNT_RATE,
        ITEM_NAME,
        0 // 0 = use DURATION by default
      );

      // get current block timestamp
      const block = await ethers.provider.getBlock(tx.blockNumber!);
      const timestamp = block!.timestamp;

      // check created auction data
      const createdAuction = await auction.auctions(0);
      expect(createdAuction.seller).to.equal(seller.address);
      expect(createdAuction.startingPrice).to.equal(STARTING_PRICE);
      expect(createdAuction.finalPrice).to.equal(STARTING_PRICE);
      expect(createdAuction.discountRate).to.equal(DISCOUNT_RATE);
      expect(createdAuction.item).to.equal(ITEM_NAME);
      expect(createdAuction.stopped).to.equal(false);
      expect(createdAuction.startAt).to.equal(timestamp);
      expect(createdAuction.endsAt).to.equal(timestamp + DURATION);
    });

    it("Should emit AuctionCreated event", async function () {
      await expect(
        auction.connect(seller).createAuction(
          STARTING_PRICE,
          DISCOUNT_RATE,
          ITEM_NAME,
          0
        )
      )
        .to.emit(auction, "AuctionCreated")
        .withArgs(0, ITEM_NAME, STARTING_PRICE, DURATION);
    });

    it("Should create auction with custom duration", async function () {
      const customDuration = 3600; // 1 hour
      
      const tx = await auction.connect(seller).createAuction(
        STARTING_PRICE,
        DISCOUNT_RATE,
        ITEM_NAME,
        customDuration
      );

      const block = await ethers.provider.getBlock(tx.blockNumber!);
      const timestamp = block!.timestamp;

      const createdAuction = await auction.auctions(0);
      expect(createdAuction.endsAt).to.equal(timestamp + customDuration);
    });

    it("Should reject auction with incorrect starting price", async function () {
      // price should be greater than discountRate * duration
      const maxDiscount = DISCOUNT_RATE * BigInt(DURATION);
      const incorrectPrice = maxDiscount; // equal is not enough, must be greater
      
      await expect(
        auction.connect(seller).createAuction(
          incorrectPrice,
          DISCOUNT_RATE,
          ITEM_NAME,
          0
        )
      ).to.be.revertedWith("incorrect starting price");
    });

    it("Should allow creating multiple auctions", async function () {
      // create first auction
      await auction.connect(seller).createAuction(
        STARTING_PRICE,
        DISCOUNT_RATE,
        "Item 1",
        0
      );

      // create second auction
      await auction.connect(buyer).createAuction(
        STARTING_PRICE,
        DISCOUNT_RATE,
        "Item 2",
        0
      );

      const auction1 = await auction.auctions(0);
      const auction2 = await auction.auctions(1);

      expect(auction1.item).to.equal("Item 1");
      expect(auction2.item).to.equal("Item 2");
      expect(auction1.seller).to.equal(seller.address);
      expect(auction2.seller).to.equal(buyer.address);
    });
  });

  /**
   * tests for get current price
   */
  describe("Get Price", function () {
    beforeEach(async function () {
      // create auction before each test in this block
      await auction.connect(seller).createAuction(
        STARTING_PRICE,
        DISCOUNT_RATE,
        ITEM_NAME,
        0
      );
    });

    it("Should return starting price at the beginning", async function () {
      const price = await auction.getPriceFor(0);
      expect(price).to.equal(STARTING_PRICE);
    });

    it("Should decrease price over time", async function () {
      // pass time for 1 hour (3600 seconds)
      const timeToPass = 3600;
      await time.increase(timeToPass);

      const expectedDiscount = DISCOUNT_RATE * BigInt(timeToPass);
      const expectedPrice = STARTING_PRICE - expectedDiscount;

      const actualPrice = await auction.getPriceFor(0);
      expect(actualPrice).to.equal(expectedPrice);
    });

    it("Should calculate price correctly after 1 day", async function () {
      const oneDay = 24 * 60 * 60;
      await time.increase(oneDay);

      const expectedDiscount = DISCOUNT_RATE * BigInt(oneDay);
      const expectedPrice = STARTING_PRICE - expectedDiscount;

      const actualPrice = await auction.getPriceFor(0);
      expect(actualPrice).to.equal(expectedPrice);
    });

    it("Should revert for stopped auction", async function () {
      // get current price
      const price = await auction.getPriceFor(0);
      
      // buy item (stop auction)
      // note: actual purchase price will be slightly lower due to block mining
      await auction.connect(buyer).buy(0, { value: price });

      await expect(auction.getPriceFor(0)).to.be.revertedWith("auction is stopped!");
    });
  });

  /**
   * tests for buy
   */
  describe("Buy", function () {
    beforeEach(async function () {
      await auction.connect(seller).createAuction(
        STARTING_PRICE,
        DISCOUNT_RATE,
        ITEM_NAME,
        0
      );
    });

    it("Should allow buying at current price", async function () {
      const currentPrice = await auction.getPriceFor(0);
      // the price drops by discountRate because the transaction takes 1 second (1 block)
      const expectedPrice = currentPrice - DISCOUNT_RATE;
      
      // buy item
      await expect(
        auction.connect(buyer).buy(0, { value: currentPrice })
      ).to.emit(auction, "AuctionEnded")
        .withArgs(0, expectedPrice, buyer.address);
    });

    it("Should transfer correct amount to seller (minus fee)", async function () {
        const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
    
        const tx = await auction.connect(buyer).buy(0, { value: STARTING_PRICE });
        const receipt = await tx.wait();
        
        // get final price from event
        const event = receipt!.logs.find(
        log => auction.interface.parseLog(log as any)?.name === "AuctionEnded"
        );
        const parsedEvent = auction.interface.parseLog(event as any);
        const finalPrice = parsedEvent!.args[1];
    
        const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
        const expectedAmount = finalPrice - (finalPrice * BigInt(FEE) / BigInt(100));
    
        expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedAmount);
    });

    it("Should refund excess payment", async function () {
      const currentPrice = await auction.getPriceFor(0);
      // calculate actual price considering 1 sec block mining
      const actualPrice = currentPrice - DISCOUNT_RATE;
      
      const overpayment = ethers.parseEther("5"); // 5 eth overpayment
      const totalSent = currentPrice + overpayment;

      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);

      // buy with overpayment
      const tx = await auction.connect(buyer).buy(0, { value: totalSent });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);

      // check that balance decreased only by actualPrice + gas
      const expectedDecrease = actualPrice + gasUsed;
      expect(buyerBalanceBefore - buyerBalanceAfter).to.equal(expectedDecrease);
    });

    it("Should reject purchase with insufficient funds", async function () {
      const currentPrice = await auction.getPriceFor(0);
      const insufficientAmount = currentPrice - ethers.parseEther("0.1");

      await expect(
        auction.connect(buyer).buy(0, { value: insufficientAmount })
      ).to.be.revertedWith("not enough funds!!!");
    });

    it("Should reject purchase after auction ended", async function () {
      // pass time more than duration
      await time.increase(DURATION + 1);

      // attempt to buy should fail
      await expect(
        auction.connect(buyer).buy(0, { value: STARTING_PRICE })
      ).to.be.revertedWith("auction is ended!");
    });

    it("Should work with discounted price after time passes", async function () {
      // wait 12 hours
      const halfDay = 12 * 60 * 60;
      await time.increase(halfDay);

      const discountedPrice = await auction.getPriceFor(0);
      expect(discountedPrice).to.be.lt(STARTING_PRICE);

      // buy with discounted price
      await expect(
        auction.connect(buyer).buy(0, { value: discountedPrice })
      ).to.not.be.reverted;
    });

    it("Should reject purchase with zero value", async function () {
      await expect(
        auction.connect(buyer).buy(0, { value: 0 })
      ).to.be.revertedWith("not enough funds!!!");
    });

    it("Should handle multiple purchases from different buyers correctly", async function () {
      // create second auction
      await auction.connect(seller).createAuction(
        STARTING_PRICE,
        DISCOUNT_RATE,
        "Item 2",
        0
      );

      const price1 = await auction.getPriceFor(0);
      const price2 = await auction.getPriceFor(1);

      // first buyer buy first item
      await auction.connect(buyer).buy(0, { value: price1 });

      // second buyer buy second item
      const [, , buyer2] = await ethers.getSigners();
      await auction.connect(buyer2).buy(1, { value: price2 });
    });
  });

  /**
   * complex scenarios
   */
  describe("Complex Scenarios", function () {
    it("Should handle full auction lifecycle", async function () {
      // create auction
      await auction.connect(seller).createAuction(
        STARTING_PRICE,
        DISCOUNT_RATE,
        ITEM_NAME,
        0
      );

      // check starting price
      let price = await auction.getPriceFor(0);
      expect(price).to.equal(STARTING_PRICE);

      // wait for price decrease
      await time.increase(3600); // 1 hour
      price = await auction.getPriceFor(0);
      expect(price).to.be.lt(STARTING_PRICE);

      // calculate actual price at purchase (price - 1 tick)
      const actualBuyPrice = price - DISCOUNT_RATE;

      // buy
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      await auction.connect(buyer).buy(0, { value: price });
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);

      // check fee transfer
      const expectedAmount = actualBuyPrice - (actualBuyPrice * BigInt(FEE) / BigInt(100));
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedAmount);
    });

    it("Should calculate fee correctly for different prices", async function () {
      const testPrices = [
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        ethers.parseEther("1000")
      ];

      for (let i = 0; i < testPrices.length; i++) {
        // use smaller discount for easier calculation in loop
        const discountRate = ethers.parseEther("0.01");

        await auction.connect(seller).createAuction(
          testPrices[i],
          discountRate, 
          `Item ${i}`,
          3600 // 1h
        );

        const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
        const price = await auction.getPriceFor(i);
        
        // actual price drops by discountRate during buy tx
        const actualPrice = price - discountRate;

        await auction.connect(buyer).buy(i, { value: price });
        
        const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
        const expectedFee = actualPrice * BigInt(FEE) / BigInt(100);
        const expectedAmount = actualPrice - expectedFee;
        
        expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedAmount);
      }
    });
  });

  /**
   * edge cases and security
   */
  describe("Edge Cases and Security", function () {
    it("Should handle auction ending exactly at deadline", async function () {
      await auction.connect(seller).createAuction(
        STARTING_PRICE,
        DISCOUNT_RATE,
        ITEM_NAME,
        0
      );

      // pass time exactly to the end of auction
      await time.increase(DURATION);

      const price = await auction.getPriceFor(0);

      // attempt to buy at the last moment should fail
      await expect(
        auction.connect(buyer).buy(0, { value: price })
      ).to.be.revertedWith("auction is ended!");
    });

    it("Should handle very small discount rates", async function () {
      const smallDiscount = BigInt(1); // 1 wei per second
      const price = ethers.parseEther("1");

      await auction.connect(seller).createAuction(
        price,
        smallDiscount,
        ITEM_NAME,
        3600
      );

      await time.increase(1800); // 30 minutes

      const currentPrice = await auction.getPriceFor(0);
      const expectedDiscount = smallDiscount * BigInt(1800);
      expect(currentPrice).to.equal(price - expectedDiscount);
    });

    it("Should handle large price values", async function () {
      const largePrice = ethers.parseEther("1000000"); // 1 million eth
      // we need a discount that doesn't exceed price over duration
      // 1 eth * 172800 sec = 172,800 eth < 1,000,000 eth
      const discount = ethers.parseEther("1");

      await auction.connect(seller).createAuction(
        largePrice,
        discount,
        ITEM_NAME,
        0
      );

      const price = await auction.getPriceFor(0);
      expect(price).to.equal(largePrice);
    });
  });
});