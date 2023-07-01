import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
} from "@metaplex-foundation/js";
import { Connection, Keypair, Commitment } from "@solana/web3.js";

const fs = require("fs");

// Load a local keypair.
const keypairFile = fs.readFileSync("./wallet.json");
const wallet = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(keypairFile.toString()))
);

console.log("wallet", wallet.publicKey.toBase58());

// const connection = new Connection(clusterApiUrl("devnet"));
const commitment: Commitment = "processed"; // processed, confirmed, finalized

const connection = new Connection("https://api.devnet.solana.com", {
  commitment,
  wsEndpoint: "wss://api.devnet.solana.com/",
});

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(wallet))
  .use(bundlrStorage());

(async () => {
  try {
    const { nft } = await metaplex.nfts().create({
      uri: "https://arweave.net/123",
      name: "My NFT",
      sellerFeeBasisPoints: 500, // Represents 5.00%.
    });
    console.log("nft", nft);
  } catch (err) {
    console.log("err", err);
  }
})();
