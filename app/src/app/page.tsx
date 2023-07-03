'use client';

import {TextField, Button} from "@mui/material"
import {useState} from "react"

export default function Home() {

  const [yourMintID, setYourMintID] = useState("");
  const [tradingMintID, setTradingMintId] = useState("");

  const checkIsPublicKey = ()=>{

  }

  return (
    <main className="flex border-spacing-2 min-h-screen flex-col items-center p-24">
      <TextField 
        label="Your NFT Mint ID" 
        variant="outlined" 
        value={yourMintID} 
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setYourMintID(event.target.value);
        }}
      />
      <TextField 
        label="Trading for NFT Mint ID" 
        variant="outlined" 
        value={tradingMintID} 
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setTradingMintId(event.target.value);
        }}
      />
      <Button
        onClick={()=>{}}
      >Initialize Swap</Button>
    </main>
  )
}
