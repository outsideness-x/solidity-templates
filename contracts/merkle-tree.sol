// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Merkle tree:
//       Root: H(AB+CD)
//       /            \
//    H(AB)          H(CD)
//    /  \           /  \
//  H(A) H(B)      H(C) H(D)
//   |    |         |    |
//   A    B         C    D

contract Tree {
    bytes32[] public hashes;
    bytes32 public merkleRoot;

    // tx's -- leaves
    string[4] Transactions = [
        "tx1: alice -> bob",
        "tx2: bob -> fred",
        "tx3: fred -> ann",
        "tx4: ann -> mike"
    ];

    constructor() {
        for(uint i = 0; i < Transactions.length; i++) {
            hashes.push(makeHash(Transactions[i])); 
        }

        uint count = Transactions.length;
        uint offset = 0;

        
        while (count > 1) {
            for(uint i = 0; i < count - 1; i += 2) {
                bytes32 hash = makeHash(
                    abi.encodePacked(
                        hashes[offset + i],
                        hashes[offset + i + 1]
                    )
                );
                hashes.push(hash);
            }

            offset += count; 
            count = count / 2;
        }

        merkleRoot = hashes[hashes.length - 1];
    }

    // transactions verifying

    // "tx3: fred -> ann"
    // 2
    // 0xcb96912c2ab54841a320470861e3fb2efcc73df91d2e404b586fa1ae4a4ba948
    // 0xd8431bab4b1b0d5043b414fdeb594bf4d5e41498d72c0fcb565a5f4c6e07a77a
    // 0x923788c7857e80dc91def19f56432f454d4ca63ae5eaa6f03a8ce9f30c6adfa0

    function verify(string memory transaction, uint index, bytes32 root, bytes32[] memory proof) public pure returns (bool) {
        bytes32 hash = makeHash(transaction);

        for (uint i = 0; i < proof.length; i++) {
            bytes32 element = proof[i];
            if (index % 2 == 0) {
                hash = keccak256(abi.encodePacked(hash, element));
            } else {
                hash = keccak256(abi.encodePacked(element, hash));
            }

            index = index / 2;
        }

        return hash == root;
    }

    // encoding a string into packed bytes (abi.encodePacked())
    function encode(string memory input) public pure returns (bytes memory) {
        return abi.encodePacked(input);
    }

    function makeHash(string memory input) public pure returns (bytes32) {
        return keccak256(encode(input));
    }

    function makeHash(bytes memory input) public pure returns (bytes32) {
        return keccak256(input);
    }
}