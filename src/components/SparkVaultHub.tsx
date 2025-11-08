import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from '@/components/ui/dialog';
import {
	TrendingUp,
	Wallet,
	Zap,
	DollarSign,
	ArrowUpRight,
	RefreshCw,
	Loader2,
	Calculator,
	PieChart,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';

// Spark Vault ABI
const SPARK_VAULT_ABI = [
	"function deposit(uint256 assets, address receiver) returns (uint256)",
	"function withdraw(uint256 assets, address receiver, address owner) returns (uint256)",
	"function totalAssets() view returns (uint256)",
	"function balanceOf(address account) view returns (uint256)",
	"function convertToAssets(uint256 shares) view returns (uint256)",
	"function convertToShares(uint256 assets) view returns (uint256)",
	"function maxDeposit(address) view returns (uint256)",
	"function maxWithdraw(address owner) view returns (uint256)",
	"function asset() view returns (address)",
];

const ERC20_ABI = [
	"function symbol() view returns (string)",
	"function decimals() view returns (uint8)",
	"function balanceOf(address) view returns (uint256)",
	"function approve(address spender, uint256 amount) returns (bool)",
	"function allowance(address owner, address spender) view returns (uint256)",
];

// Spark Vaults on Mainnet
const SPARK_VAULTS = {
	sDAI: {
		address: '0x83F20F44975D03b1b09e64809B757c47f942BEeA',
		name: 'Spark DAI Savings',
		symbol: 'sDAI',
		asset: 'DAI',
		color: '#f59e0b',
	},
	sUSDS: {
		address: '0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD',
		name: 'Spark USDS Savings',
		symbol: 'sUSDS',
		asset: 'USDS',
		color: '#8b5cf6',
	},
};

const RPC_URL = 'https://virtual.mainnet.eu.rpc.tenderly.co/82c86106-662e-4d7f-a974-c311987358ff';

const formatCurrency = (value: any, decimals = 18) => {
	const num = Number(value) / Math.pow(10, decimals);
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(num);
};

const formatNumber = (value: any, decimals = 18) => {
	const num = Number(value) / Math.pow(10, decimals);
	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(num);
};

export default function SparkVaultHub() {
	const { ready, authenticated, user, login } = usePrivy();
	const [vaults, setVaults] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [selectedVault, setSelectedVault] = useState<any>(null);
	const [depositAmount, setDepositAmount] = useState('');
	const [withdrawAmount, setWithdrawAmount] = useState('');
	const [depositOpen, setDepositOpen] = useState(false);
	const [depositing, setDepositing] = useState(false);
	const [withdrawing, setWithdrawing] = useState(false);
	const [userBalances, setUserBalances] = useState<any>({});
	const [calculatorAmount, setCalculatorAmount] = useState('1000');
	const [calculatorDays, setCalculatorDays] = useState('365');

	useEffect(() => {
		fetchVaults();
	}, []);

	useEffect(() => {
		if (authenticated && user?.wallet?.address) {
			fetchUserBalances();
		}
	}, [authenticated, user]);

	const fetchVaults = async () => {
		try {
			setRefreshing(true);
			const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

			const vaultPromises = Object.entries(SPARK_VAULTS).map(async ([key, vault]) => {
				try {
					const vaultContract = new ethers.Contract(vault.address, SPARK_VAULT_ABI, provider);
					const totalAssets = await vaultContract.totalAssets();

					// Mock APY (in production, calculate from historical data)
					const mockAPY = key === 'sDAI' ? 7.2 : 8.5;

					return {
						key,
						...vault,
						tvl: totalAssets.toString(),
						apy: mockAPY,
						decimals: 18,
					};
				} catch (err) {
					console.error(`Error fetching ${key}:`, err);
					return null;
				}
			});

			const fetchedVaults = (await Promise.all(vaultPromises)).filter((v): v is any => v !== null);
			setVaults(fetchedVaults);
			setLoading(false);
			setRefreshing(false);
		} catch (err) {
			console.error('Error fetching vaults:', err);
			setLoading(false);
			setRefreshing(false);
		}
	};

	const fetchUserBalances = async () => {
		if (!user?.wallet?.address) return;

		try {
			const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
			const balances: any = {};

			for (const vault of vaults) {
				const vaultContract = new ethers.Contract(vault.address, SPARK_VAULT_ABI, provider);
				const shares = await vaultContract.balanceOf(user.wallet.address);
				const assets = await vaultContract.convertToAssets(shares);

				balances[vault.key] = {
					shares: shares.toString(),
					assets: assets.toString(),
				};
			}

			setUserBalances(balances);
		} catch (err) {
			console.error('Error fetching user balances:', err);
		}
	};

	const handleDeposit = async () => {
		if (!authenticated || !user?.wallet?.address) {
			toast.error('Please connect wallet first');
			return;
		}

		try {
			setDepositing(true);
			const provider = new ethers.providers.Web3Provider(window.ethereum as any);
			const signer = provider.getSigner();

			const vaultContract = new ethers.Contract(selectedVault.address, SPARK_VAULT_ABI, provider);
			const assetAddress = await vaultContract.asset();

			const assetContract = new ethers.Contract(assetAddress, ERC20_ABI, signer);
			const vaultWithSigner = new ethers.Contract(selectedVault.address, SPARK_VAULT_ABI, signer);

			const amount = ethers.utils.parseUnits(depositAmount, selectedVault.decimals);

			// Check allowance
			const allowance = await assetContract.allowance(user.wallet.address, selectedVault.address);

			if (allowance.lt(amount)) {
				toast.info('Approving tokens...');
				const approveTx = await assetContract.approve(selectedVault.address, amount);
				await approveTx.wait();
				toast.success('Tokens approved!');
			}

			// Deposit
			toast.info('Depositing to Spark Vault...');
			const depositTx = await vaultWithSigner.deposit(amount, user.wallet.address);
			await depositTx.wait();

			toast.success(`Successfully deposited ${depositAmount} ${selectedVault.asset}!`);
			setDepositAmount('');
			setDepositOpen(false);
			fetchVaults();
			fetchUserBalances();
		} catch (err: any) {
			console.error('Deposit error:', err);
			toast.error(err.message || 'Deposit failed');
		} finally {
			setDepositing(false);
		}
	};

	const handleWithdraw = async () => {
		if (!authenticated || !user?.wallet?.address) {
			toast.error('Please connect wallet first');
			return;
		}

		try {
			setWithdrawing(true);
			const provider = new ethers.providers.Web3Provider(window.ethereum as any);
			const signer = provider.getSigner();

			const vaultContract = new ethers.Contract(selectedVault.address, SPARK_VAULT_ABI, signer);
			const amount = ethers.utils.parseUnits(withdrawAmount, selectedVault.decimals);

			toast.info('Withdrawing from Spark Vault...');
			const withdrawTx = await vaultContract.withdraw(
				amount,
				user.wallet.address,
				user.wallet.address
			);
			await withdrawTx.wait();

			toast.success(`Successfully withdrew ${withdrawAmount} ${selectedVault.asset}!`);
			setWithdrawAmount('');
			setDepositOpen(false);
			fetchVaults();
			fetchUserBalances();
		} catch (err: any) {
			console.error('Withdraw error:', err);
			toast.error(err.message || 'Withdrawal failed');
		} finally {
			setWithdrawing(false);
		}
	};

	const calculateYield = () => {
		const principal = parseFloat(calculatorAmount) || 0;
		const days = parseInt(calculatorDays) || 365;
		const bestAPY = Math.max(...vaults.map(v => v.apy));
		const yield_ = (principal * bestAPY * days) / (365 * 100);
		return yield_;
	};

	const totalTVL = vaults.reduce((sum, v) => sum + Number(v.tvl) / 1e18, 0);
	const bestVault = vaults.reduce((best, v) => v.apy > best.apy ? v : best, vaults[0] || {});

	if (!ready || loading) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header Skeleton */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-3 w-60" />
              </div>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-10 w-[400px]" />
          
          {/* Chart Skeleton */}
          <Card className="p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-[200px] w-full" />
          </Card>

          {/* Vault Cards Skeleton */}
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>

                  <Skeleton className="h-px w-full" />

                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>

                  <Skeleton className="h-10 w-full" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


	return (
		<div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
			{/* Header */}
			<header className="border-b bg-background/95 backdrop-blur">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center">
								<Zap className="h-6 w-6 text-white" />
							</div>
							<div>
								<h1 className="text-2xl font-bold">Spark Vault Hub</h1>
								<p className="text-xs text-muted-foreground">
									Unified Interface for Spark Savings Vaults V2
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button 
								onClick={fetchVaults} 
								variant="outline" 
								size="sm"
								disabled={refreshing}
							>
								<RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
								{refreshing ? 'Refreshing...' : 'Refresh'}
							</Button>
							{!authenticated ? (
								<Button onClick={login}>
									<Wallet className="mr-2 h-4 w-4" />
									Connect Wallet
								</Button>
							) : (
								<Button variant="outline">
									<Wallet className="mr-2 h-4 w-4" />
									{user?.wallet?.address?.slice(0, 6)}...{user?.wallet?.address?.slice(-4)}
								</Button>
							)}
						</div>
					</div>
				</div>
			</header>

			<div className="container mx-auto px-4 py-8 space-y-8">
				{/* Stats Overview */}
				<div className="grid gap-4 md:grid-cols-3">
					<Card className="p-6 bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<p className="text-sm font-medium text-muted-foreground">Total TVL</p>
								<h3 className="text-3xl font-bold">
									${totalTVL.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
								</h3>
							</div>
							<DollarSign className="h-8 w-8 text-orange-500" />
						</div>
						<div className="mt-4 flex items-center gap-1 text-sm">
							<span className="text-muted-foreground">Across {vaults.length} Spark vaults</span>
						</div>
					</Card>

					<Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<p className="text-sm font-medium text-muted-foreground">Best APY</p>
								<h3 className="text-3xl font-bold text-green-500">
									{bestVault?.apy?.toFixed(2)}%
								</h3>
							</div>
							<TrendingUp className="h-8 w-8 text-green-500" />
						</div>
						<div className="mt-4 flex items-center gap-1 text-sm">
							<span className="text-muted-foreground">{bestVault?.symbol}</span>
						</div>
					</Card>

					<Card className="p-6 bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<p className="text-sm font-medium text-muted-foreground">Active Vaults</p>
								<h3 className="text-3xl font-bold">{vaults.length}</h3>
							</div>
							<Zap className="h-8 w-8 text-violet-500" />
						</div>
						<div className="mt-4 flex items-center gap-1 text-sm">
							<div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
							<span className="text-green-500 font-medium">Live Data</span>
						</div>
					</Card>
				</div>

				{/* Tabs */}
				<Tabs defaultValue="vaults" className="space-y-6">
					<TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
						<TabsTrigger value="vaults">Vaults</TabsTrigger>
						<TabsTrigger value="calculator">Calculator</TabsTrigger>
						<TabsTrigger value="portfolio">Portfolio</TabsTrigger>
					</TabsList>

					{/* Vaults Tab */}
					<TabsContent value="vaults" className="space-y-6">
						<div>
							<h2 className="text-2xl font-bold mb-2">Spark Savings Vaults</h2>
							<p className="text-muted-foreground">
								Compare APYs and deposit to the best Spark vault with one click
							</p>
						</div>

						{/* APY Comparison Chart */}
						<Card className="p-6">
							<h3 className="text-lg font-semibold mb-4">APY Comparison</h3>
							<ResponsiveContainer width="100%" height={200}>
								<BarChart data={vaults}>
									<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
									<XAxis dataKey="symbol" className="text-xs" />
									<YAxis className="text-xs" />
									<RechartsTooltip
										formatter={(value: any) => `${value.toFixed(2)}%`}
										contentStyle={{
											backgroundColor: 'hsl(var(--background))',
											border: '1px solid hsl(var(--border))',
										}}
									/>
									<Bar dataKey="apy" radius={[8, 8, 0, 0]}>
										{vaults.map((vault, index) => (
											<Cell key={index} fill={vault.color} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</Card>

						{/* Vault Cards */}
						<div className="grid gap-4 md:grid-cols-2">
							{vaults.map((vault) => (
								<Card
									key={vault.key}
									className="p-6 hover:shadow-lg transition-shadow"
								>
									<div className="space-y-4">
										<div className="flex items-start justify-between">
											<div>
												<h3 className="font-semibold text-lg">{vault.name}</h3>
												<p className="text-sm text-muted-foreground">{vault.symbol}</p>
											</div>
											<Badge
												variant="outline"
												className="bg-green-500/10 text-green-500 border-green-500/20"
											>
												{vault.apy.toFixed(2)}% APY
											</Badge>
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div>
												<p className="text-xs text-muted-foreground">TVL</p>
												<p className="text-lg font-bold">
													{formatCurrency(vault.tvl, vault.decimals)}
												</p>
											</div>
											<div>
												<p className="text-xs text-muted-foreground">Asset</p>
												<p className="text-lg font-bold">{vault.asset}</p>
											</div>
										</div>

										<Separator />

										<div className="space-y-2">
											<div className="flex justify-between text-sm">
												<span className="text-muted-foreground">Contract</span>
												<span className="font-mono text-xs">
													{vault.address.slice(0, 6)}...{vault.address.slice(-4)}
												</span>
											</div>
											<div className="flex justify-between text-sm">
												<span className="text-muted-foreground">Type</span>
												<span className="font-medium">ERC-4626</span>
											</div>
										</div>

										<Button
											className="w-full"
											onClick={() => {
												setSelectedVault(vault);
												setDepositOpen(true);
											}}
										>
											Manage Position
											<ArrowUpRight className="ml-2 h-4 w-4" />
										</Button>
									</div>
								</Card>
							))}
						</div>
					</TabsContent>

					{/* Calculator Tab */}
					<TabsContent value="calculator" className="space-y-6">
						<div>
							<h2 className="text-2xl font-bold mb-2">Yield Calculator</h2>
							<p className="text-muted-foreground">
								Calculate potential returns from Spark vaults
							</p>
						</div>

						<Card className="p-6">
							<div className="space-y-6">
								<div className="space-y-2">
									<Label>Deposit Amount (USD)</Label>
									<Input
										type="number"
										value={calculatorAmount}
										onChange={(e) => setCalculatorAmount(e.target.value)}
										placeholder="1000"
									/>
								</div>

								<div className="space-y-2">
									<Label>Time Period (Days)</Label>
									<Input
										type="number"
										value={calculatorDays}
										onChange={(e) => setCalculatorDays(e.target.value)}
										placeholder="365"
									/>
								</div>

								<Separator />

								<div className="space-y-3">
									<div className="flex justify-between items-center">
										<span className="text-muted-foreground">Principal</span>
										<span className="text-lg font-semibold">
											${parseFloat(calculatorAmount || '0').toLocaleString()}
										</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-muted-foreground">Estimated Yield</span>
										<span className="text-lg font-semibold text-green-500">
											${calculateYield().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
										</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-muted-foreground">Total Return</span>
										<span className="text-2xl font-bold">
											${(parseFloat(calculatorAmount || '0') + calculateYield()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
										</span>
									</div>
								</div>

								<div className="bg-muted p-4 rounded-lg">
									<p className="text-sm text-muted-foreground">
										Based on best APY of {bestVault?.apy?.toFixed(2)}% from {bestVault?.symbol}
									</p>
								</div>
							</div>
						</Card>
					</TabsContent>

					{/* Portfolio Tab */}
					<TabsContent value="portfolio" className="space-y-6">
						<div>
							<h2 className="text-2xl font-bold mb-2">Your Portfolio</h2>
							<p className="text-muted-foreground">
								Your positions across Spark vaults
							</p>
						</div>

						{!authenticated ? (
							<Card className="p-12 text-center">
								<Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
								<h3 className="text-xl font-semibold mb-2">Connect Wallet</h3>
								<p className="text-muted-foreground mb-4">
									Connect your wallet to view your Spark vault positions
								</p>
								<Button onClick={login}>
									<Wallet className="mr-2 h-4 w-4" />
									Connect Wallet
								</Button>
							</Card>
						) : (
							<div className="space-y-4">
								{vaults.map((vault) => {
									const balance = userBalances[vault.key];
									const hasPosition = balance && Number(balance.assets) > 0;

									return (
										<Card key={vault.key} className="p-6">
											<div className="flex items-center justify-between">
												<div>
													<h3 className="font-semibold">{vault.name}</h3>
													<p className="text-sm text-muted-foreground">{vault.symbol}</p>
												</div>
												{hasPosition ? (
													<div className="text-right">
														<p className="text-lg font-bold">
															{formatNumber(balance.assets, vault.decimals)} {vault.asset}
														</p>
														<p className="text-xs text-muted-foreground">
															{formatNumber(balance.shares, vault.decimals)} shares
														</p>
													</div>
												) : (
													<Badge variant="outline">No Position</Badge>
												)}
											</div>
										</Card>
									);
								})}
							</div>
						)}
					</TabsContent>
				</Tabs>
			</div>

			{/* Deposit/Withdraw Dialog */}
			<Dialog open={depositOpen} onOpenChange={setDepositOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Manage Position</DialogTitle>
						<DialogDescription>
							{selectedVault?.name} - {selectedVault?.apy?.toFixed(2)}% APY
						</DialogDescription>
					</DialogHeader>

					<Tabs defaultValue="deposit">
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="deposit">Deposit</TabsTrigger>
							<TabsTrigger value="withdraw">Withdraw</TabsTrigger>
						</TabsList>

						<TabsContent value="deposit" className="space-y-4">
							<div className="space-y-2">
								<Label>Amount ({selectedVault?.asset})</Label>
								<Input
									type="number"
									placeholder="0.00"
									value={depositAmount}
									onChange={(e) => setDepositAmount(e.target.value)}
								/>
							</div>
							<Button
								className="w-full"
								onClick={handleDeposit}
								disabled={depositing || !depositAmount}
							>
								{depositing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{depositing ? 'Depositing...' : 'Deposit to Spark Vault'}
							</Button>
						</TabsContent>

						<TabsContent value="withdraw" className="space-y-4">
							<div className="space-y-2">
								<Label>Amount ({selectedVault?.asset})</Label>
								<Input
									type="number"
									placeholder="0.00"
									value={withdrawAmount}
									onChange={(e) => setWithdrawAmount(e.target.value)}
								/>
							</div>
							<Button
								className="w-full"
								onClick={handleWithdraw}
								disabled={withdrawing || !withdrawAmount}
								variant="outline"
							>
								{withdrawing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{withdrawing ? 'Withdrawing...' : 'Withdraw from Vault'}
							</Button>
						</TabsContent>
					</Tabs>
				</DialogContent>
			</Dialog>

			{/* Footer */}
			<footer className="border-t mt-16 py-8">
				<div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
					<p>Spark Vault Hub • Built for Octant v2 Hackathon • Powered by Spark Protocol</p>
				</div>
			</footer>
		</div>
	);
}