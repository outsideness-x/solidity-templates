"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/utils/contractData";

declare global {
  interface Window {
    ethereum: any;
  }
}

// Тип данных для аукциона
type Auction = {
  index: number;
  seller: string;
  startingPrice: bigint;
  finalPrice: bigint;
  startAt: number;
  endsAt: number;
  discountRate: bigint;
  item: string;
  stopped: boolean;
};

export default function Home() {
  // --- Состояния ---
  const [account, setAccount] = useState<string>("");
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Форма
  const [itemName, setItemName] = useState("");
  const [startPrice, setStartPrice] = useState("");
  const [discountRate, setDiscountRate] = useState("");
  const [duration, setDuration] = useState("");

  // Таймер
  const [currentTime, setCurrentTime] = useState(Date.now() / 1000);

  // --- 1. Подключение ---
  const connectWallet = async () => {
    if (!window.ethereum) return alert("Пожалуйста, установите MetaMask!");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signers = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      
      // Здесь Ethers сам поймет тип ABI благодаря "as const" в constants.ts
      const _contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      setAccount(signers[0]);
      setContract(_contract);
    } catch (error) {
      console.error("Ошибка подключения:", error);
    }
  };

  // --- 2. Загрузка данных ---
  const loadAuctions = async () => {
    if (!contract) return;
    setIsLoading(true);
    const items: Auction[] = [];
    let index = 0;

    // Бесконечный цикл, пока не наткнемся на ошибку (конец массива)
    while (true) {
      try {
        const auctionRaw = await contract.auctions(index);
        items.push({
          index: index,
          seller: auctionRaw[0],
          startingPrice: auctionRaw[1],
          finalPrice: auctionRaw[2],
          startAt: Number(auctionRaw[3]),
          endsAt: Number(auctionRaw[4]),
          discountRate: auctionRaw[5],
          item: auctionRaw[6],
          stopped: auctionRaw[7],
        });
        index++;
      } catch (e) {
        break; 
      }
    }
    setAuctions(items);
    setIsLoading(false);
  };

  useEffect(() => {
    if (contract) loadAuctions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now() / 1000), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- 3. Создание ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;

    console.log("contract methods", contract);

    try {
      const priceWei = ethers.parseEther(startPrice);
      const discountWei = ethers.parseEther(discountRate);
      const durationSec = Number(duration);

      const tx = await contract.createAuction(priceWei, discountWei, itemName, durationSec);
      await tx.wait();
      
      alert("Аукцион создан!");
      loadAuctions();
    } catch (err: any) {
      console.error(err);
      alert("Ошибка: " + (err.reason || err.message));
    }
  };

  // buy
  //const handleBuy = async (auction: Auction, currentPrice: bigint) => {
    //if (!contract) return;
    //try {
      //const tx = await contract.buy(auction.index, { value: currentPrice });
      //await tx.wait();
      //alert("Куплено!");
      //loadAuctions();
    //} catch (err: any) {
      //console.error(err);
      //alert("Ошибка: " + (err.reason || err.message));
    //}
  //};

  const handleBuy = async (auction: Auction, currentPrice: bigint) => {
    if (!contract) return;
    try {
      // отправляем auction.startingPrice вместо currentPrice
      const tx = await contract.buy(auction.index, { 
        value: auction.startingPrice 
      });
      
      await tx.wait();
      alert("Куплено успешно! Сдача возвращена на кошелек.");
      loadAuctions();
    } catch (err: any) {
      console.error(err);
      // Пытаемся достать понятную ошибку, если она есть
      const message = err.reason || err.message || "Неизвестная ошибка";
      alert("Ошибка покупки: " + message);
    }
  };

  // --- Расчет цены (Frontend Math) ---
  const getPrice = (auction: Auction) => {
    if (auction.stopped) return auction.finalPrice;
    
    const elapsed = BigInt(Math.floor(currentTime - auction.startAt));
    if (elapsed < BigInt(0)) return auction.startingPrice;

    const discount = auction.discountRate * elapsed;
    const price = auction.startingPrice - discount;
    
    return price > BigInt(0) ? price : BigInt(0);
  };

  // --- HTML ---
  return (
    <main className="min-h-screen p-8 bg-gray-100 text-gray-900">
      <div className="max-w-6xl mx-auto">
        
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dutch Auction</h1>
          {!account ? (
            <button onClick={connectWallet} className="bg-blue-600 text-white px-4 py-2 rounded">
              Подключить кошелек
            </button>
          ) : (
            <div className="bg-white px-4 py-2 rounded border">
              {account.slice(0,6)}...{account.slice(-4)}
            </div>
          )}
        </header>

        {account && (
          <div className="bg-white p-6 rounded shadow mb-8">
            <h2 className="text-xl font-bold mb-4">Новый лот</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Название" className="border p-2 rounded" value={itemName} onChange={e=>setItemName(e.target.value)} required />
              <input placeholder="Цена (ETH)" type="number" step="any" className="border p-2 rounded" value={startPrice} onChange={e=>setStartPrice(e.target.value)} required />
              <input placeholder="Скидка (ETH/сек)" type="number" step="any" className="border p-2 rounded" value={discountRate} onChange={e=>setDiscountRate(e.target.value)} required />
              <input placeholder="Длительность (сек)" type="number" className="border p-2 rounded" value={duration} onChange={e=>setDuration(e.target.value)} required />
              <button type="submit" className="md:col-span-2 bg-black text-white py-2 rounded">Создать</button>
            </form>
          </div>
        )}

        <h2 className="text-xl font-bold mb-4">Лоты</h2>
        {isLoading && <p>Загрузка...</p>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((auction) => {
            const currentPrice = getPrice(auction);
            const isEnded = currentTime > auction.endsAt;

            return (
              <div key={auction.index} className={`p-4 rounded shadow border ${auction.stopped ? 'bg-gray-200' : 'bg-white'}`}>
                <div className="flex justify-between mb-2">
                  <h3 className="font-bold text-lg">{auction.item}</h3>
                  <span className="text-sm bg-gray-200 px-2 rounded">#{auction.index}</span>
                </div>
                
                <p className="text-sm text-gray-600">Продавец: {auction.seller.slice(0,6)}...</p>
                <div className="my-4">
                  <p className="text-xs text-gray-500">Текущая цена:</p>
                  <p className="text-2xl font-bold text-blue-600">{ethers.formatEther(currentPrice)} ETH</p>
                </div>

                {auction.stopped ? (
                  <div className="bg-red-500 text-white text-center py-2 rounded font-bold">ПРОДАНО</div>
                ) : isEnded ? (
                  <div className="bg-gray-500 text-white text-center py-2 rounded font-bold">ЗАВЕРШЕН</div>
                ) : (
                  <button onClick={() => handleBuy(auction, currentPrice)} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                    Купить
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!isLoading && auctions.length === 0 && <p>Аукционов нет.</p>}
      </div>
    </main>
  );
}