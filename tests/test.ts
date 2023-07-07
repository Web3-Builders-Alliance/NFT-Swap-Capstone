import * as anchor from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { IDL } from "../target/types/anchor_escrow";
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
} from "@metaplex-foundation/js";
import { PROGRAM_ID as METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
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
  Account,
} from "@solana/spl-token";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

const { assert, expect } = chai;
chai.use(chaiAsPromised);

const fs = require("fs");

//J8yRFJACioJ2UE4Hw4UmUnm3pij8paXAq49P4ZYtGX4y
const aliceKey = require("./alice.json");
//3f1GZhhG1McwPPp5PSnsZ5ZDFKQvhQpquasfbFnSQHzN
const bobKey = require("./bob.json");

describe("anchor-escrow", () => {
  const provider = anchor.AnchorProvider.env();
  // let provider = anchor.AnchorProvider.local("http://127.0.0.1:8899");

  const { connection } = provider;
  const programId = new PublicKey(
    "9FmWRCsKPpFsUxcs9nV2K4GVgHTnVXeEfT4uMK3vuurL"
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

  let aliceTokenAccountA: Account;
  let bobTokenAccountA: Account;
  let aliceTokenAccountB: Account;
  let bobTokenAccountB: Account;

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

  const vaultAuthorityKey = PublicKey.findProgramAddressSync(
    [Buffer.from(authoritySeed, "utf-8")],
    program.programId
  )[0];
  let vaultKey = null as PublicKey;

  const masterEditionKey = PublicKey.findProgramAddressSync(
    [Buffer.from(authoritySeed, "utf-8")],
    program.programId
  )[0];

  let masterEditionA = null as PublicKey;

  it("works", async () => {
    // let res = await connection.requestAirdrop(
    //   alice.publicKey,
    //   100 * anchor.web3.LAMPORTS_PER_SOL
    // );

    // let latestBlockHash = await connection.getLatestBlockhash();

    // await connection.confirmTransaction({
    //   blockhash: latestBlockHash.blockhash,
    //   lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    //   signature: res,
    // });

    const { nft: nft1 } = await metaplexA.nfts().create({
      uri: "https://arweave.net/123",
      name: "My NFT A",
      sellerFeeBasisPoints: 500,
    });
    nftA = nft1.address;
    const { nft: nft2 } = await metaplexB.nfts().create({
      uri: "https://arweave.net/123",
      name: "My NFT B",
      sellerFeeBasisPoints: 500,
    });
    nftB = nft2.address;

    masterEditionA = await metaplexA
      .nfts()
      .pdas()
      .masterEdition({ mint: nftA });
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
      assert.ok(Number(bobTokenAccountA.amount) == 0);
      assert.ok(Number(bobTokenAccountB.amount) == 1);
    } catch (err) {
      throw new Error(err);
    }
  });

  it("mint A and mint B must be NFTs", async () => {
    let tokenMint = await createMint(
      connection,
      alice,
      alice.publicKey,
      null,
      0
    );

    let aliceTokenAccount = await createAccount(
      connection,
      alice,
      tokenMint,
      alice.publicKey
    );

    await mintTo(connection, alice, tokenMint, aliceTokenAccount, alice, 100);

    const tokenVaultKey = PublicKey.findProgramAddressSync(
      [
        vaultAuthorityKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        nftA.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )[0];
    async function tryRegularToken() {
      try {
        const result = await program.methods
          .initialize(randomSeed, tokenMint, nftB)
          .accounts({
            initializer: alice.publicKey,
            mint: tokenMint,
            vaultAuthority: vaultAuthorityKey,
            vault: tokenVaultKey,
            masterEdition: masterEditionA,
            initializerDepositTokenAccount: aliceTokenAccountA.address,
            initializerReceiveTokenAccount: aliceTokenAccountB.address,
            escrowState: escrowStateKey,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            tokenProgram: TOKEN_PROGRAM_ID,
            metadataProgram: METADATA_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .signers([alice])
          .rpc();
      } catch (err) {
        throw new Error("Token must be NFT");
      }
    }
    expect(tryRegularToken()).to.eventually.throw("Token must be NFT");
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
          initializer: alice.publicKey,
          mint: nftA,
          vaultAuthority: vaultAuthorityKey,
          vault: vaultKey,
          masterEdition: masterEditionA,
          initializerDepositTokenAccount: aliceTokenAccountA.address,
          initializerReceiveTokenAccount: aliceTokenAccountB.address,
          escrowState: escrowStateKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
          metadataProgram: METADATA_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([alice])
        .rpc();

      let fetchedVault = await getAccount(connection, vaultKey);
      let fetchedEscrowState = await program.account.escrowState.fetch(
        escrowStateKey
      );
    } catch (err) {
      throw new Error(err);
    }
  });

  it("taker must submit correct NFT", async () => {
    async function tryWrongNFT() {
      try {
        //mint wrong nft to bob
        const { nft } = await metaplexB.nfts().create({
          uri: "https://arweave.net/123",
          name: "My NFT E",
          sellerFeeBasisPoints: 500,
        });
        let nftE = nft.address;

        const result = await program.methods
          .exchange()
          .accounts({
            taker: bob.publicKey,
            initializerDepositTokenMint: nftA,
            takerDepositTokenMint: nftE,
            takerDepositTokenAccount: bobTokenAccountB.address,
            takerReceiveTokenAccount: bobTokenAccountA.address,
            initializerDepositTokenAccount: aliceTokenAccountA.address,
            initializerReceiveTokenAccount: aliceTokenAccountB.address,
            initializer: alice.publicKey,
            escrowState: escrowStateKey,
            vault: vaultKey,
            vaultAuthority: vaultAuthorityKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([bob])
          .rpc();
        console.log("result", result);
      } catch (err) {
        throw new Error("Wrong NFT");
      }
    }
    expect(tryWrongNFT()).to.eventually.throw("Wrong NFT");
  });

  it("Exchange escrow state", async () => {
    const result = await program.methods
      .exchange()
      .accounts({
        taker: bob.publicKey,
        initializerDepositTokenMint: nftA,
        takerDepositTokenMint: nftB,
        takerDepositTokenAccount: bobTokenAccountB.address,
        takerReceiveTokenAccount: bobTokenAccountA.address,
        initializerDepositTokenAccount: aliceTokenAccountA.address,
        initializerReceiveTokenAccount: aliceTokenAccountB.address,
        initializer: alice.publicKey,
        escrowState: escrowStateKey,
        vault: vaultKey,
        vaultAuthority: vaultAuthorityKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([bob])
      .rpc();

    let aliceNFTAccountA = await getAccount(
      connection,
      aliceTokenAccountA.address
    );
    let aliceNFTAccountB = await getAccount(
      connection,
      aliceTokenAccountB.address
    );
    let bobNFTAccountA = await getAccount(connection, bobTokenAccountA.address);
    let bobNFTAccountB = await getAccount(connection, bobTokenAccountB.address);
    assert.ok(Number(aliceNFTAccountA.amount) == 0);
    assert.ok(Number(aliceNFTAccountB.amount) == 1);
    assert.ok(Number(bobNFTAccountA.amount) == 1);
    assert.ok(Number(bobNFTAccountB.amount) == 0);
  });

  it("initializes and cancels", async () => {
    //create new NFTs and accounts
    const { nft: nft1 } = await metaplexA.nfts().create({
      uri: "https://arweave.net/123",
      name: "My NFT C",
      sellerFeeBasisPoints: 500, // Represents 5.00%.
    });
    let nftC = nft1.address;

    const { nft: nft2 } = await metaplexB.nfts().create({
      uri: "https://arweave.net/123",
      name: "My NFT D",
      sellerFeeBasisPoints: 500, // Represents 5.00%.
    });
    let nftD = nft2.address;

    const _vaultKey = PublicKey.findProgramAddressSync(
      [
        vaultAuthorityKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        nftC.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )[0];
    vaultKey = _vaultKey;

    masterEditionA = await metaplexA
      .nfts()
      .pdas()
      .masterEdition({ mint: nftC });

    let aliceTokenAccountC = await getOrCreateAssociatedTokenAccount(
      connection,
      alice,
      nftC,
      alice.publicKey
    );

    let aliceTokenAccountD = await getOrCreateAssociatedTokenAccount(
      connection,
      alice,
      nftD,
      alice.publicKey
    );

    const initializedTx = await program.methods
      .initialize(randomSeed, nftC, nftB)
      .accounts({
        initializer: alice.publicKey,
        mint: nftC,
        vaultAuthority: vaultAuthorityKey,
        vault: vaultKey,
        masterEdition: masterEditionA,
        initializerDepositTokenAccount: aliceTokenAccountC.address,
        initializerReceiveTokenAccount: aliceTokenAccountD.address,
        escrowState: escrowStateKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        metadataProgram: METADATA_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([alice])
      .rpc();

    // Cancel the escrow.
    const canceledTX = await program.methods
      .cancel()
      .accounts({
        initializer: alice.publicKey,
        mint: nftC,
        vault: vaultKey,
        vaultAuthority: vaultAuthorityKey,
        initializerDepositTokenAccount: aliceTokenAccountC.address,
        escrowState: escrowStateKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([alice])
      .rpc();

    let aliceNFTAccountC = await getAccount(
      connection,
      aliceTokenAccountC.address
    );
    assert.ok(aliceNFTAccountC.owner.equals(alice.publicKey));
    // Check alice still owns the NFT.
    assert.ok(Number(aliceNFTAccountC.amount) == 1);

    let aliceNFTAccountD = await getAccount(
      connection,
      aliceTokenAccountD.address
    );
    assert.ok(aliceNFTAccountD.owner.equals(alice.publicKey));
    assert.ok(Number(aliceNFTAccountD.amount) == 0);
  });
});
