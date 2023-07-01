import * as anchor from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { IDL } from "../target/types/anchor_escrow";
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
} from "@metaplex-foundation/js";
import {
  PublicKey,
  SystemProgram,
  Connection,
  Commitment,
  TransactionMessage,
  VersionedTransaction,
  Keypair,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

const fs = require("fs");

//J8yRFJACioJ2UE4Hw4UmUnm3pij8paXAq49P4ZYtGX4y
const alice = require("./alice.json");
//3f1GZhhG1McwPPp5PSnsZ5ZDFKQvhQpquasfbFnSQHzN
const bob = require("./bob.json");

describe("anchor-escrow", () => {
  const commitment: Commitment = "processed"; // processed, confirmed, finalized
  const connection = new Connection("http://localhost:8899", {
    commitment,
  });

  const payer = Keypair.fromSecretKey(new Uint8Array(alice));
  const initializer = Keypair.fromSecretKey(new Uint8Array(alice));
  const taker = Keypair.fromSecretKey(new Uint8Array(bob));
  const mintAuthority = anchor.web3.Keypair.generate();

  let nftA = null;
  let nftB = null;

  const metaplexA = Metaplex.make(connection)
    .use(keypairIdentity(payer))
    .use(bundlrStorage());

  before(async () => {
    const { nft: nft1 } = await metaplexA.nfts().create({
      uri: "https://arweave.net/123",
      name: "My NFT A",
      sellerFeeBasisPoints: 500, // Represents 5.00%.
    });

    nftA = nft1;
  });

  it("Initialize program state", async () => {});
});
