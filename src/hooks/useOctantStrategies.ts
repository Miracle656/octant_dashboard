// hooks/useOctantStrategies.ts
// This file provides React hooks to fetch real on-chain data

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Import ABIs (place these in your src/abis/ folder)
import YieldDonatingTokenizedStrategyABI from '../abis/YieldDonatingTokenizedStrategy.json';
import SkyCompounderStrategyFactoryABI from '../abis/SkyCompounderStrategyFactory.json';
import MorphoCompounderStrategyFactoryABI from '../abis/MorphoCompounderStrategyFactory.json';

// Contract addresses (replace with actual deployed addresses)
const CONTRACTS = {
  skyFactory: '0x62f83c78924f8fBa153D3F77af27779D6F786eB0',
  morphoFactory: '0xa6D4aFE829A021aB21d19903861AaD71e4c23dDC',
  baseFactory: '0x0000000000000000000000000000000000000000', // Not needed yet
};

// RPC provider
const provider = new ethers.providers.JsonRpcProvider(
  'https://virtual.mainnet.eu.rpc.tenderly.co/82c86106-662e-4d7f-a974-c311987358ff'
);

export interface Strategy {
  address: string;
  name: string;
  protocol: string;
  asset: string;
  tvl: number;
  apy: number;
  yieldGenerated: number;
  donationAddress: string;
  deployer: string;
  status: 'active' | 'paused' | 'shutdown';
  depositCount: number;
  lastReport: number;
  pricePerShare: number;
}

/**
 * Hook to fetch all deployed strategies from factories
 */
export function useOctantStrategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      
      // Fetch from Sky Factory
      const skyFactory = new ethers.Contract(
        CONTRACTS.skyFactory,
        SkyCompounderStrategyFactoryABI,
        provider
      );

      // Get all StrategyDeploy events
      const filter = skyFactory.filters.StrategyDeploy();
      const events = await skyFactory.queryFilter(filter);

      // Fetch details for each strategy
      const strategyPromises = events.map(async (event) => {
        const strategyAddress = event.args?.strategyAddress;
        if (!strategyAddress) return null;

        const strategy = new ethers.Contract(
          strategyAddress,
          YieldDonatingTokenizedStrategyABI,
          provider
        );

        // Fetch strategy data
        const [
          name,
          totalAssets,
          totalSupply,
          pricePerShare,
          dragonRouter,
          lastReport,
          isShutdown,
          asset,
        ] = await Promise.all([
          strategy.name(),
          strategy.totalAssets(),
          strategy.totalSupply(),
          strategy.pricePerShare(),
          strategy.dragonRouter(),
          strategy.lastReport(),
          strategy.isShutdown(),
          strategy.asset(),
        ]);

        // Calculate yield generated (simplified)
        const yieldGenerated = totalAssets.sub(totalSupply).toNumber() / 1e6;

        return {
          address: strategyAddress,
          name,
          protocol: 'Sky Protocol',
          asset: getAssetSymbol(asset),
          tvl: totalAssets.toNumber() / 1e6,
          apy: 8.5, // Calculate from historical data
          yieldGenerated,
          donationAddress: dragonRouter,
          deployer: event.args?.deployer || '',
          status: isShutdown ? 'shutdown' : 'active',
          depositCount: totalSupply.gt(0) ? 100 : 0, // Estimate
          lastReport: lastReport.toNumber() * 1000,
          pricePerShare: pricePerShare.toNumber() / 1e6,
        } as Strategy;
      });

      const fetchedStrategies = (await Promise.all(strategyPromises)).filter(
        (s): s is Strategy => s !== null
      );

      setStrategies(fetchedStrategies);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching strategies:', err);
    } finally {
      setLoading(false);
    }
  };

  return { strategies, loading, error, refetch: fetchStrategies };
}

/**
 * Hook to interact with a specific strategy
 */
export function useStrategy(strategyAddress: string) {
  const [strategyData, setStrategyData] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (strategyAddress) {
      fetchStrategyData();
    }
  }, [strategyAddress]);

  const fetchStrategyData = async () => {
    try {
      const strategy = new ethers.Contract(
        strategyAddress,
        YieldDonatingTokenizedStrategyABI,
        provider
      );

      const [totalAssets, name, dragonRouter, pricePerShare] = await Promise.all([
        strategy.totalAssets(),
        strategy.name(),
        strategy.dragonRouter(),
        strategy.pricePerShare(),
      ]);

      setStrategyData({
        address: strategyAddress,
        name,
        protocol: 'Unknown',
        asset: 'USDC',
        tvl: totalAssets.toNumber() / 1e6,
        apy: 0,
        yieldGenerated: 0,
        donationAddress: dragonRouter,
        deployer: '',
        status: 'active',
        depositCount: 0,
        lastReport: Date.now(),
        pricePerShare: pricePerShare.toNumber() / 1e6,
      });
    } catch (err) {
      console.error('Error fetching strategy data:', err);
    } finally {
      setLoading(false);
    }
  };

  const deposit = async (amount: string, signer: ethers.Signer) => {
    try {
      const strategy = new ethers.Contract(
        strategyAddress,
        YieldDonatingTokenizedStrategyABI,
        signer
      );

      const assetAddress = await strategy.asset();
      const asset = new ethers.Contract(
        assetAddress,
        ['function approve(address,uint256) returns (bool)'],
        signer
      );

      // Approve
      const approveTx = await asset.approve(
        strategyAddress,
        ethers.utils.parseUnits(amount, 6)
      );
      await approveTx.wait();

      // Deposit
      const depositTx = await strategy.deposit(
        ethers.utils.parseUnits(amount, 6),
        await signer.getAddress()
      );
      await depositTx.wait();

      await fetchStrategyData();
      return true;
    } catch (err) {
      console.error('Deposit error:', err);
      return false;
    }
  };

  const withdraw = async (amount: string, signer: ethers.Signer) => {
    try {
      const strategy = new ethers.Contract(
        strategyAddress,
        YieldDonatingTokenizedStrategyABI,
        signer
      );

      const tx = await strategy.withdraw(
        ethers.utils.parseUnits(amount, 6),
        await signer.getAddress(),
        await signer.getAddress()
      );
      await tx.wait();

      await fetchStrategyData();
      return true;
    } catch (err) {
      console.error('Withdraw error:', err);
      return false;
    }
  };

  return { strategyData, loading, deposit, withdraw, refetch: fetchStrategyData };
}

/**
 * Hook to deploy a new strategy
 */
export function useDeployStrategy() {
  const [deploying, setDeploying] = useState(false);

  const deployStrategy = async (
    params: {
      protocol: 'sky' | 'morpho' | 'aave';
      asset: string;
      name: string;
      donationAddress: string;
      management: string;
      keeper: string;
      emergencyAdmin: string;
      enableBurning: boolean;
    },
    signer: ethers.Signer
  ) => {
    try {
      setDeploying(true);

      let factoryAddress: string;
      let factoryABI: any;

      // Select appropriate factory
      if (params.protocol === 'sky') {
        factoryAddress = CONTRACTS.skyFactory;
        factoryABI = SkyCompounderStrategyFactoryABI;
      } else if (params.protocol === 'morpho') {
        factoryAddress = CONTRACTS.morphoFactory;
        factoryABI = MorphoCompounderStrategyFactoryABI;
      } else {
        throw new Error('Unsupported protocol');
      }

      const factory = new ethers.Contract(factoryAddress, factoryABI, signer);

      // Deploy strategy
      const tx = await factory.createStrategy(
        params.name,
        params.management,
        params.keeper,
        params.emergencyAdmin,
        params.donationAddress,
        params.enableBurning,
        '0x...' // tokenizedStrategyAddress - replace with actual
      );

      const receipt = await tx.wait();

      // Parse StrategyDeploy event to get new strategy address
      const event = receipt.events?.find((e: any) => e.event === 'StrategyDeploy');
      const strategyAddress = event?.args?.strategyAddress;

      return { success: true, address: strategyAddress };
    } catch (err) {
      console.error('Deployment error:', err);
      return { success: false, error: err };
    } finally {
      setDeploying(false);
    }
  };

  return { deployStrategy, deploying };
}

/**
 * Hook to fetch yield history
 */
export function useYieldHistory(strategyAddress: string) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (strategyAddress) {
      fetchHistory();
    }
  }, [strategyAddress]);

  const fetchHistory = async () => {
    try {
      const strategy = new ethers.Contract(
        strategyAddress,
        YieldDonatingTokenizedStrategyABI,
        provider
      );

      // Get all Reported events
      const filter = strategy.filters.Reported();
      const events = await strategy.queryFilter(filter);

      const historyData = events.map((event) => ({
        timestamp: event.blockNumber, // Convert to actual timestamp
        profit: event.args?.profit.toNumber() / 1e6 || 0,
        loss: event.args?.loss.toNumber() / 1e6 || 0,
      }));

      setHistory(historyData);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  return { history, loading, refetch: fetchHistory };
}

/**
 * Hook to fetch donation flow data
 */
export function useDonationFlow() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      // Fetch DonationMinted events from all strategies
      // Aggregate by dragon router
      // Calculate totals per category

      // Mock data for now
      setDonations([
        { category: 'Open Source', amount: 145000, percentage: 42 },
        { category: 'Climate', amount: 89000, percentage: 26 },
        { category: 'Education', amount: 62000, percentage: 18 },
        { category: 'Infrastructure', amount: 48000, percentage: 14 },
      ]);
    } catch (err) {
      console.error('Error fetching donations:', err);
    } finally {
      setLoading(false);
    }
  };

  return { donations, loading, refetch: fetchDonations };
}

// Helper functions
function getAssetSymbol(address: string): string {
  const assetMap: Record<string, string> = {
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'USDC',
    '0x6B175474E89094C44Da98b954EedeAC495271d0F': 'DAI',
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'WETH',
    '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT',
  };
  return assetMap[address] || 'Unknown';
}

export default {
  useOctantStrategies,
  useStrategy,
  useDeployStrategy,
  useYieldHistory,
  useDonationFlow,
};