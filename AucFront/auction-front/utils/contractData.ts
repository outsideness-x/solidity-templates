export const CONTRACT_ADDRESS = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"; 

export const CONTRACT_ABI: any =
    [
        {
            "inputs": [],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "index",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "itemName",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "startingPrice",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "duration",
                    "type": "uint256"
                }
            ],
            "name": "AuctionCreated",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "index",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "finalPrice",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "winner",
                    "type": "address"
                }
            ],
            "name": "AuctionEnded",
            "type": "event"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "index",
                    "type": "uint256"
                }
            ],
            "name": "buy",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_startingPrice",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "_discountRate",
                    "type": "uint256"
                },
                {
                    "internalType": "string",
                    "name": "_item",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "_duration",
                    "type": "uint256"
                }
            ],
            "name": "createAuction",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "auctions",
            "outputs": [
                {
                    "internalType": "address payable",
                    "name": "seller",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "startingPrice",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "finalPrice",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "startAt",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "endsAt",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "discountRate",
                    "type": "uint256"
                },
                {
                    "internalType": "string",
                    "name": "item",
                    "type": "string"
                },
                {
                    "internalType": "bool",
                    "name": "stopped",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "index",
                    "type": "uint256"
                }
            ],
            "name": "getPriceFor",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "owner",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]