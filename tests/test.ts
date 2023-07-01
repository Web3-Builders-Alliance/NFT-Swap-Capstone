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
const aliceKey = require("./alice.json");
//3f1GZhhG1McwPPp5PSnsZ5ZDFKQvhQpquasfbFnSQHzN
const bobKey = require("./bob.json");

describe("anchor-escrow", () => {
  let provider = anchor.AnchorProvider.local("http://127.0.0.1:8899");
  const { connection } = provider;
  const programId = new PublicKey(
    "9FmWRCsKPpFsUxcs9nV2K4GVgHTnVXeEfT4uMK3vuurL"
  );
  const program = new anchor.Program(IDL, programId, provider);

  const alice = Keypair.fromSecretKey(new Uint8Array(aliceKey));
  const initializer = Keypair.fromSecretKey(new Uint8Array(aliceKey));
  const bob = Keypair.fromSecretKey(new Uint8Array(bobKey));

  let nftA = null as PublicKey;
  let nftB = null as PublicKey;

  const metaplexA = Metaplex.make(connection).use(keypairIdentity(alice));

  before(async () => {
    let res = await connection.requestAirdrop(
      alice.publicKey,
      100 * anchor.web3.LAMPORTS_PER_SOL
    );

    let latestBlockHash = await connection.getLatestBlockhash();

    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: res,
    });

    const { nft: nft1 } = await metaplexA.nfts().create({
      uri: "https://arweave.net/123",
      name: "My NFT A",
      sellerFeeBasisPoints: 500, // Represents 5.00%.
    });

    console.log("nft1", nft1);

    nftA = nft1.address;
  });

  it("initializes program state", async () => {
    try {
      let aliceTokenAccountA = await createAccount(
        connection,
        alice,
        nftA,
        alice.publicKey
      );
    } catch (err) {
      console.log("err", err);
      throw new Error(err);
    }
  });
});
