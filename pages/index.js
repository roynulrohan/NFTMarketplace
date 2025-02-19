import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Web3Modal from 'web3modal';
import { nftaddress, nftmarketaddress } from '../config';
import NFT from '../artifacts/contracts/NFT.sol/NFT.json';
import Market from '../artifacts/contracts/NFTMarket.sol/NFTMarket.json';
import { NFTCard } from '../components/NFTCard';

export default function Home() {
    const [nfts, setNfts] = useState([]);
    const [loadingState, setLoadingState] = useState('not-loaded');

    useEffect(() => {
        loadNFTs();
    }, []);

    async function loadNFTs() {
        const provider = new ethers.providers.JsonRpcProvider();
        const tokenContract = new ethers.Contract(nftaddress, NFT.abi, provider);
        const marketContract = new ethers.Contract(nftmarketaddress, Market.abi, provider);
        const data = await marketContract.fetchMarketItems();

        const items = await Promise.all(
            data.map(async (i) => {
                const tokenUri = await tokenContract.tokenURI(i.tokenId);
                const meta = await axios.get(tokenUri);
                let price = ethers.utils.formatUnits(i.price.toString(), 'ether');
                let item = {
                    price,
                    tokenId: i.tokenId.toNumber(),
                    seller: i.seller,
                    owner: i.owner,
                    image: meta.data.image,
                    name: meta.data.name,
                    description: meta.data.description,
                };
                return item;
            })
        );
        setNfts(items);
        setLoadingState('loaded');
    }
    async function buyNFT(nft) {
        const web3Modal = new Web3Modal();
        const connection = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);

        const signer = provider.getSigner();
        const contract = new ethers.Contract(nftmarketaddress, Market.abi, signer);
        const price = ethers.utils.parseUnits(nft.price.toString(), 'ether');
        const transaction = await contract.createMarketSale(nftaddress, nft.tokenId, {
            value: price,
        });
        await transaction.wait();
    }
    if (loadingState === 'loaded' && !nfts.length) return <h1 className='px-20 py-10 text-3xl'>No items in market place</h1>;
    return (
        <div className='p-4'>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4'>
                {nfts.map((nft, i) => (
                    <NFTCard key={i} nft={nft} buyCallback={() => buyNFT(nft)} forSale />
                ))}
            </div>
        </div>
    );
}
