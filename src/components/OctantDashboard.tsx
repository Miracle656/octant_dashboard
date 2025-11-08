import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import {
	TrendingUp,
	Wallet,
	Zap,
	DollarSign,
	Activity,
	ArrowDownToLine,
	ArrowUpFromLine,
	RefreshCw,
	Loader2
} from 'lucide-react';

// ABIs
const STRATEGY_ABI = [
	'function name() view returns (string)',
	'function totalAssets() view returns (uint256)',
	'function totalSupply() view returns (uint256)',
	'function balanceOf(address) view returns (uint256)',
	'function dragonRouter() view returns (address)',
	'function pricePerShare() view returns (uint256)',
	'function asset() view returns (address)',
];

const ERC20_ABI = [
	'function symbol() view returns (string)',
	'function decimals() view returns (uint8)',
];

// Contract addresses
const CONTRACTS = {
	skyStrategy: '0x213D250f688b699a5b42B7D27cA2db03CC29e5d4',
	morphoStrategy: '0x8ea3Fa89931d7fC9A401E31329BA378A1BE95664',
};

const RPC_URL = 'https://virtual.mainnet.eu.rpc.tenderly.co/82c86106-662e-4d7f-a974-c311987358ff';

const formatCurrency = (value: any, decimals = 6) => {
	const num = Number(value) / Math.pow(10, decimals);
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(num);
};

export default function OctantDashboard() {
	const { ready, authenticated, user, login, logout } = usePrivy();
	const [strategies, setStrategies] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [totalTVL, setTotalTVL] = useState(0);
	const [refreshing, setRefreshing] = useState(false);

	// Add these new state variables at the top with your other useState declarations
	const [selectedStrategy, setSelectedStrategy] = useState<any>(null);
	const [depositAmount, setDepositAmount] = useState('');
	const [withdrawAmount, setWithdrawAmount] = useState('');
	const [depositOpen, setDepositOpen] = useState(false);
	const [depositing, setDepositing] = useState(false);
	const [withdrawing, setWithdrawing] = useState(false);
	const [userBalance, setUserBalance] = useState('0');

	useEffect(() => {
		fetchStrategies();
	}, []);

	const fetchStrategies = async () => {
		try {
			setRefreshing(true);
			const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

			const strategyAddresses = [
				{
					address: CONTRACTS.morphoStrategy,
					protocol: 'Morpho Blue',
					name: 'Morpho USDC Public Goods',
				},
				{
					address: CONTRACTS.skyStrategy,
					protocol: 'Sky Protocol',
					name: 'Sky USDC Public Goods',
				},
			];

			const strategiesData = await Promise.all(
				strategyAddresses.map(async ({ address, protocol, name }) => {
					try {
						const strategyContract = new ethers.Contract(
							address,
							STRATEGY_ABI,
							provider
						);

						const [
							totalAssets,
							totalSupply,
							dragonRouter,
							pricePerShare,
							assetAddress,
						] = await Promise.all([
							strategyContract.totalAssets(),
							strategyContract.totalSupply(),
							strategyContract.dragonRouter(),
							strategyContract.pricePerShare(),
							strategyContract.asset(),
						]);

						const assetContract = new ethers.Contract(
							assetAddress,
							ERC20_ABI,
							provider
						);
						const [symbol, decimals] = await Promise.all([
							assetContract.symbol(),
							assetContract.decimals(),
						]);

						const tvl = totalAssets;
						const yieldGenerated = totalAssets.sub(totalSupply);

						return {
							address,
							name,
							protocol,
							asset: symbol,
							decimals,
							tvl: tvl.toString(),
							totalSupply: totalSupply.toString(),
							yieldGenerated: yieldGenerated.gt(0) ? yieldGenerated.toString() : '0',
							donationAddress: dragonRouter,
							pricePerShare: pricePerShare.toString(),
							status: 'active',
						};
					} catch (err) {
						console.error(`Error fetching ${protocol}:`, err);
						return null;
					}
				})
			);

			const validStrategies = strategiesData.filter((s): s is any => s !== null);
			setStrategies(validStrategies);

			const total = validStrategies.reduce((sum, s) => {
				return sum + Number(s.tvl) / Math.pow(10, s.decimals);
			}, 0);
			setTotalTVL(total);

			setLoading(false);
			setRefreshing(false);
		} catch (err: any) {
			console.error('Error fetching strategies:', err);
			setError(err.message);
			setLoading(false);
			setRefreshing(false);
		}
	};

	if (!ready) {
		return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
	}

	const connectWallet = async () => {
		if (authenticated) {
			await logout();
		} else {
			await login();
		}
	};

	if (loading) {
		return (
			<div className="from-background to-muted/20 min-h-screen bg-gradient-to-b">
				<header className="bg-background/95 border-b backdrop-blur">
					<div className="container mx-auto px-4 py-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-pink-600">
									<Zap className="h-6 w-6 text-white" />
								</div>
								<div>
									<h1 className="text-2xl font-bold">Octant v2</h1>
									<p className="text-muted-foreground text-xs">
										Loading live data...
									</p>
								</div>
							</div>
						</div>
					</div>
				</header>
				<div className="container mx-auto space-y-8 px-4 py-8">
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						{[1, 2, 3, 4].map((i) => (
							<Card key={i} className="p-6">
								<Skeleton className="mb-2 h-4 w-24" />
								<Skeleton className="mb-4 h-8 w-32" />
								<Skeleton className="h-4 w-full" />
							</Card>
						))}
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Card className="max-w-md p-8">
					<h2 className="mb-2 text-xl font-bold text-red-500">Error Loading Data</h2>
					<p className="text-muted-foreground mb-4">{error}</p>
					<Button onClick={fetchStrategies}>
						<RefreshCw className="mr-2 h-4 w-4" />
						Retry
					</Button>
				</Card>
			</div>
		);
	}

	const handleDeposit = async () => {
	if (!authenticated || !user?.wallet?.address || !selectedStrategy) {
		toast.error('Please connect wallet first');
		return;
	}

	try {
		setDepositing(true);
		
		// Get fresh provider
		const provider = new ethers.providers.Web3Provider(window.ethereum as any);
		const signer = provider.getSigner();
		
		// First, get the asset address from the strategy
		const strategyContract = new ethers.Contract(
			selectedStrategy.address,
			STRATEGY_ABI,
			provider // Use provider first to read
		);
		
		const assetAddress = await strategyContract.asset();
		
		// Now get asset contract
		const assetContract = new ethers.Contract(
			assetAddress,
			ERC20_ABI,
			signer
		);
		
		// Get strategy contract with signer for transactions
		const strategyWithSigner = new ethers.Contract(
			selectedStrategy.address,
			STRATEGY_ABI,
			signer
		);
		
		const amount = ethers.utils.parseUnits(depositAmount, selectedStrategy.decimals);
		
		// Check allowance
		const allowance = await assetContract.allowance(user.wallet.address, selectedStrategy.address);
		
		if (allowance.lt(amount)) {
			toast.info('Approving tokens...');
			const approveTx = await assetContract.approve(selectedStrategy.address, amount);
			await approveTx.wait();
			toast.success('Tokens approved!');
		}
		
		// Deposit
		toast.info('Depositing...');
		const depositTx = await strategyWithSigner.deposit(amount, user.wallet.address);
		await depositTx.wait();
		
		toast.success(`Successfully deposited ${depositAmount} ${selectedStrategy.asset}!`);
		setDepositAmount('');
		setDepositOpen(false);
		fetchStrategies(); // Refresh data
	} catch (err: any) {
		console.error('Deposit error:', err);
		toast.error(err.message || 'Deposit failed');
	} finally {
		setDepositing(false);
	}
};

	const handleWithdraw = async () => {
	if (!authenticated || !user?.wallet?.address || !selectedStrategy) {
		toast.error('Please connect wallet first');
		return;
	}

	try {
		setWithdrawing(true);
		
		const provider = new ethers.providers.Web3Provider(window.ethereum as any);
		const signer = provider.getSigner();
		
		const strategyContract = new ethers.Contract(
			selectedStrategy.address,
			STRATEGY_ABI,
			signer
		);
		
		const amount = ethers.utils.parseUnits(withdrawAmount, selectedStrategy.decimals);
		
		toast.info('Withdrawing...');
		const withdrawTx = await strategyContract.withdraw(
			amount,
			user.wallet.address,
			user.wallet.address
		);
		await withdrawTx.wait();
		
		toast.success(`Successfully withdrew ${withdrawAmount} ${selectedStrategy.asset}!`);
		setWithdrawAmount('');
		setDepositOpen(false); // Close dialog
		fetchStrategies(); // Refresh data
	} catch (err: any) {
		console.error('Withdraw error:', err);
		toast.error(err.message || 'Withdrawal failed');
	} finally {
		setWithdrawing(false);
	}
};

	return (
		<div className="from-background to-muted/20 min-h-screen bg-gradient-to-b">
			{/* Header */}
			<header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-pink-600">
								<Zap className="h-6 w-6 text-white" />
							</div>
							<div>
								<h1 className="text-2xl font-bold">Octant v2</h1>
								<p className="text-muted-foreground text-xs">
									Live Data • {strategies.length} Strategies
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button
								onClick={fetchStrategies}
								variant="outline"
								size="sm"
								disabled={refreshing}
							>
								<RefreshCw
									className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
								/>
								{refreshing ? 'Refreshing...' : 'Refresh'}
							</Button>
							<Button
								onClick={connectWallet}
								variant={authenticated ? 'outline' : 'default'}
							>
								{authenticated ? (
									<>
										<Wallet className="mr-2 h-4 w-4" />
										{user?.wallet?.address?.slice(0, 6)}...
										{user?.wallet?.address?.slice(-4)}
									</>
								) : (
									<>
										<Wallet className="mr-2 h-4 w-4" />
										Connect Wallet
									</>
								)}
							</Button>
						</div>
					</div>
				</div>
			</header>

			<div className="container mx-auto space-y-8 px-4 py-8">
				{/* Stats Overview */}
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-violet-500/5 p-6">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<p className="text-muted-foreground text-sm font-medium">
									Total Value Locked
								</p>
								<h3 className="text-3xl font-bold">
									$
									{totalTVL.toLocaleString('en-US', {
										minimumFractionDigits: 0,
										maximumFractionDigits: 0,
									})}
								</h3>
							</div>
							<DollarSign className="h-8 w-8 text-violet-500" />
						</div>
						<div className="mt-4 flex items-center gap-1 text-sm">
							<div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
							<span className="font-medium text-green-500">Live</span>
						</div>
					</Card>

					<Card className="border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-pink-500/5 p-6">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<p className="text-muted-foreground text-sm font-medium">
									Active Strategies
								</p>
								<h3 className="text-3xl font-bold">{strategies.length}</h3>
							</div>
							<Activity className="h-8 w-8 text-pink-500" />
						</div>
						<div className="mt-4 flex items-center gap-1 text-sm">
							<span className="text-muted-foreground">Morpho + Sky</span>
						</div>
					</Card>

					<Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-6">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<p className="text-muted-foreground text-sm font-medium">Network</p>
								<h3 className="text-2xl font-bold">Tenderly</h3>
							</div>
							<Zap className="h-8 w-8 text-orange-500" />
						</div>
						<div className="mt-4 flex items-center gap-1 text-sm">
							<span className="text-muted-foreground">Mainnet Fork</span>
						</div>
					</Card>

					<Card className="border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-500/5 p-6">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<p className="text-muted-foreground text-sm font-medium">
									Your Deposit
								</p>
								<h3 className="text-2xl font-bold">$1,000</h3>
							</div>
							<TrendingUp className="h-8 w-8 text-green-500" />
						</div>
						<div className="mt-4 flex items-center gap-1 text-sm">
							<span className="text-muted-foreground">In Morpho strategy</span>
						</div>
					</Card>
				</div>

				{/* Strategies List */}
				<div className="space-y-6">
					<div>
						<h2 className="mb-2 text-2xl font-bold">Active Strategies</h2>
						<p className="text-muted-foreground">Live data from deployed contracts</p>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						{strategies.map((strategy) => (
							<Card
								key={strategy.address}
								className="p-6 transition-shadow hover:shadow-lg"
							>
								<div className="space-y-4">
									<div className="flex items-start justify-between">
										<div>
											<h3 className="text-lg font-semibold">
												{strategy.name}
											</h3>
											<p className="text-muted-foreground text-sm">
												{strategy.protocol}
											</p>
										</div>
										<Badge
											variant="outline"
											className="border-green-500/20 bg-green-500/10 text-green-500"
										>
											{strategy.status}
										</Badge>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<p className="text-muted-foreground text-xs">TVL</p>
											<p className="text-lg font-bold">
												{formatCurrency(strategy.tvl, strategy.decimals)}
											</p>
										</div>
										<div>
											<p className="text-muted-foreground text-xs">Asset</p>
											<p className="text-lg font-bold">{strategy.asset}</p>
										</div>
									</div>

									<Separator />

									<div className="space-y-2">
										<div className="flex justify-between text-sm">
											<span className="text-muted-foreground">
												Yield Generated
											</span>
											<span className="font-medium">
												{formatCurrency(
													strategy.yieldGenerated,
													strategy.decimals
												)}
											</span>
										</div>
										<div className="flex justify-between text-sm">
											<span className="text-muted-foreground">
												Price Per Share
											</span>
											<span className="font-medium">
												{(
													Number(strategy.pricePerShare) /
													Math.pow(10, strategy.decimals)
												).toFixed(6)}
											</span>
										</div>
										<div className="flex justify-between text-sm">
											<span className="text-muted-foreground">Contract</span>
											<span className="font-mono text-xs">
												{strategy.address.slice(0, 6)}...
												{strategy.address.slice(-4)}
											</span>
										</div>
									</div>

									<div className="flex gap-2">
										<Button
											variant="outline"
											className="flex-1"
											onClick={(e) => {
												e.stopPropagation();
												setSelectedStrategy(strategy);
												setDepositOpen(true);
											}}
										>
											<ArrowDownToLine className="mr-2 h-4 w-4" />
											Deposit
										</Button>
										<Button
											variant="outline"
											className="flex-1"
											onClick={(e) => {
												e.stopPropagation();
												setSelectedStrategy(strategy);
												// Trigger withdraw dialog
											}}
										>
											<ArrowUpFromLine className="mr-2 h-4 w-4" />
											Withdraw
										</Button>
									</div>
								</div>
							</Card>
						))}
					</div>
				</div>

				{/* Deposit/Withdraw Dialog */}
				<Dialog open={depositOpen} onOpenChange={setDepositOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Manage Position</DialogTitle>
							<DialogDescription>
								{selectedStrategy?.name} - {selectedStrategy?.protocol}
							</DialogDescription>
						</DialogHeader>

						<Tabs defaultValue="deposit">
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="deposit">Deposit</TabsTrigger>
								<TabsTrigger value="withdraw">Withdraw</TabsTrigger>
							</TabsList>

							<TabsContent value="deposit" className="space-y-4">
								<div className="space-y-2">
									<Label>Amount ({selectedStrategy?.asset})</Label>
									<Input
										type="number"
										placeholder="0.00"
										value={depositAmount}
										onChange={(e) => setDepositAmount(e.target.value)}
									/>
									<p className="text-muted-foreground text-xs">
										Your balance: {userBalance} {selectedStrategy?.asset}
									</p>
								</div>
								<Button
									className="w-full"
									onClick={handleDeposit}
									disabled={depositing || !depositAmount}
								>
									{depositing && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									{depositing ? 'Depositing...' : 'Deposit'}
								</Button>
							</TabsContent>

							<TabsContent value="withdraw" className="space-y-4">
								<div className="space-y-2">
									<Label>Amount ({selectedStrategy?.asset})</Label>
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
									{withdrawing && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									{withdrawing ? 'Withdrawing...' : 'Withdraw'}
								</Button>
							</TabsContent>
						</Tabs>
					</DialogContent>
				</Dialog>

				{/* Contract Info */}
				<Card className="p-6">
					<h3 className="mb-4 text-lg font-semibold">Deployed Contract Addresses</h3>
					<div className="space-y-2 font-mono text-sm">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Morpho Strategy:</span>
							<div className="flex items-center gap-2">
								<span>{CONTRACTS.morphoStrategy}</span>
								<Badge variant="outline" className="bg-green-500/10 text-green-500">
									Live
								</Badge>
							</div>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Sky Strategy:</span>
							<div className="flex items-center gap-2">
								<span>{CONTRACTS.skyStrategy}</span>
								<Badge variant="outline" className="bg-green-500/10 text-green-500">
									Live
								</Badge>
							</div>
						</div>
					</div>
				</Card>
			</div>

			{/* Footer */}
			<footer className="mt-16 border-t py-8">
				<div className="text-muted-foreground container mx-auto px-4 text-center text-sm">
					<p>Built for Octant v2 Hackathon • Fetching Live Blockchain Data</p>
				</div>
			</footer>
		</div>
	);
}
