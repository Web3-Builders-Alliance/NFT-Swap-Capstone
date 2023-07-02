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
  getOrCreateAssociatedTokenAccount,
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
    "G9yTenWDLBYm1ayZ7gprRhjCS5BuWcn9tVa394Utr1jL"
  );
  const program = new anchor.Program(IDL, programId, provider);

  // Main Roles
  const alice = Keypair.fromSecretKey(new Uint8Array(aliceKey));
  const initializer = Keypair.fromSecretKey(new Uint8Array(aliceKey));
  const bob = Keypair.fromSecretKey(new Uint8Array(bobKey));

  let nftA = null as PublicKey;
  let nftB = null as PublicKey;

  const metaplexA = Metaplex.make(connection).use(keypairIdentity(alice));
  const metaplexB = Metaplex.make(connection).use(keypairIdentity(bob));

  let aliceTokenAccountA = null;
  let bobTokenAccountA = null;
  let aliceTokenAccountB = null;
  let bobTokenAccountB = null;

  // Determined Seeds
  const stateSeed = "state";
  const authoritySeed = "authority";

  // Random Seed
  const randomSeed: anchor.BN = new anchor.BN(
    Math.floor(Math.random() * 100000000)
  );

  // Derive PDAs: escrowStateKey, vaultKey, vaultAuthorityKey
  const escrowStateKey = PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode(stateSeed)),
      randomSeed.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  )[0];
  console.log("escrowStateKey", escrowStateKey);

  const vaultAuthorityKey = PublicKey.findProgramAddressSync(
    [Buffer.from(authoritySeed, "utf-8")],
    program.programId
  )[0];
  let vaultKey = null as PublicKey;

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
    nftA = nft1.address;
    const { nft: nft2 } = await metaplexB.nfts().create({
      uri: "https://arweave.net/123",
      name: "My NFT B",
      sellerFeeBasisPoints: 500, // Represents 5.00%.
    });
    nftB = nft2.address;
  });

  it("initializes program state", async () => {
    try {
      aliceTokenAccountA = await getOrCreateAssociatedTokenAccount(
        connection,
        alice,
        nftA,
        alice.publicKey
      );
      bobTokenAccountA = await getOrCreateAssociatedTokenAccount(
        connection,
        bob,
        nftA,
        bob.publicKey
      );
      aliceTokenAccountB = await getOrCreateAssociatedTokenAccount(
        connection,
        alice,
        nftB,
        alice.publicKey
      );
      bobTokenAccountB = await getOrCreateAssociatedTokenAccount(
        connection,
        bob,
        nftB,
        bob.publicKey
      );
      //Alice starts with her NFT and Bob starts with his
      assert.ok(Number(aliceTokenAccountA.amount) == 1);
      assert.ok(Number(aliceTokenAccountB.amount) == 0);
      assert.ok(Number(bobTokenAccountA.amount) == 1);
      assert.ok(Number(bobTokenAccountB.amount) == 0);
    } catch (err) {
      console.log("err", err);
      throw new Error(err);
    }
  });

  it("Initializes escrow", async () => {
    try {
      const _vaultKey = PublicKey.findProgramAddressSync(
        [
          vaultAuthorityKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          nftA.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )[0];
      vaultKey = _vaultKey;

      const result = await program.methods
        .initialize(randomSeed, nftA, nftB)
        .accounts({
          initializer: initializer.publicKey,
          vaultAuthority: vaultAuthorityKey,
          vault: vaultKey,
          mint: nftA,
          masterEdition: nftA,
          initializerDepositTokenAccount: aliceTokenAccountA,
          initializerReceiveTokenAccount: aliceTokenAccountB,
          escrowState: escrowStateKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([initializer])
        .rpc();
      console.log(
        `https://solana.fm/tx/${result}?cluster=http%253A%252F%252Flocalhost%253A8899%252F`
      );

      let fetchedVault = await getAccount(connection, vaultKey);
      let fetchedEscrowState = await program.account.escrowState.fetch(
        escrowStateKey
      );
    } catch (err) {
      console.log("err", err);
      throw new Error(err);
    }
  });
});
