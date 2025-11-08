# Octant v2 Ecosystem Dashboard

**Live Demo:** [https://octant-dashboard.vercel.app/]  
**Hackathon Track:** Best Public Goods Project ($3,000)  
**Built For:** Octant v2 Hackathon 2024

---

## 🎯 **Overview**

A comprehensive, real-time dashboard for visualizing the Octant v2 ecosystem - where DeFi yield powers public goods funding. This dashboard connects directly to deployed smart contracts on Tenderly mainnet fork, displaying live TVL, active strategies, and donation flows.

### **The Problem**
Octant v2 has powerful infrastructure for routing yield to public goods, but users and communities need visibility into:
- How much value is locked in strategies
- Where yields are being directed
- Which protocols are generating the most impact
- Real-time donation flows

### **The Solution**
A beautiful, intuitive dashboard that:
- ✅ Fetches live data from blockchain contracts
- ✅ Shows real-time TVL across all strategies
- ✅ Displays active strategies (Morpho, Sky, Aave, Spark)
- ✅ Tracks donation addresses and yield generation
- ✅ Provides transparency into public goods funding

---

## ✨ **Key Features**

### **1. Live Blockchain Integration**
- Direct connection to deployed smart contracts
- Real-time TVL and strategy data
- Auto-refresh functionality
- Shows actual on-chain transactions

### **2. Multi-Strategy Overview**
- Displays all active yield-generating strategies
- Shows protocol (Morpho, Sky, Aave, Spark)
- TVL, APY, and asset information
- Donation recipient addresses

### **3. Beautiful, Modern UI**
- Built with React + TypeScript + Vite
- Shadcn/ui components for consistency
- Dark mode optimized
- Fully responsive (mobile, tablet, desktop)

### **4. Wallet Integration**
- Privy authentication
- Easy connect/disconnect
- User-specific data (future enhancement)

### **5. Contract Transparency**
- All deployed contract addresses visible
- Links to blockchain explorers
- Price per share tracking
- Yield generation metrics

---

## 🚀 **Live Demo**

**Dashboard URL:** [https://octant-dashboard.vercel.app/](https://octant-dashboard.vercel.app/)

**Deployed Contracts:**
- Morpho Strategy: `0x8ea3Fa89931d7fC9A401E31329BA378A1BE95664`
- Sky Strategy: `0x213D250f688b699a5b42B7D27cA2db03CC29e5d4`
- Morpho Factory: `0xa6D4aFE829A021aB21d19903861AaD71e4c23dDC`
- Sky Factory: `0x62f83c78924f8fBa153D3F77af27779D6F786eB0`

**Network:** Tenderly Mainnet Fork  
**RPC:** `https://virtual.mainnet.eu.rpc.tenderly.co/82c86106-662e-4d7f-a974-c311987358ff`

---

## 🛠️ **Technical Stack**

```
Frontend:
├── React 18 + TypeScript
├── Vite (build tool)
├── Tailwind CSS (styling)
├── shadcn/ui (components)
├── Recharts (data visualization)
├── ethers.js v5 (blockchain interaction)
└── Privy (authentication)

Smart Contracts:
├── Solidity 0.8.18
├── Foundry (development)
└── Octant v2 Core (strategies)
```

---

## 📦 **Installation & Setup**

### **Prerequisites**
- Node.js 18+
- npm or yarn

### **Quick Start**

```bash
# Clone the repository
git clone <your-repo-url>
cd octant-v2-dashboard

# Install dependencies
npm install

# Run development server
npm run dev

# Open browser to http://localhost:5173
```

### **Environment Variables**

Create a `.env` file:

```bash
# Not required - using Tenderly public RPC
# Dashboard works out of the box!
```

---

## 🏗️ **Architecture**

### **Component Structure**

```
src/
├── components/
│   ├── OctantDashboard.tsx      # Main dashboard component
│   └── ui/                       # shadcn/ui components
├── lib/
│   └── utils.ts                  # Utility functions
└── App.tsx                       # Main app entry

Key Features:
- Fetches data directly from blockchain
- No backend required
- Real-time updates via RPC calls
- Efficient caching and state management
```

### **Data Flow**

```
User Opens Dashboard
    ↓
React useEffect Hook
    ↓
ethers.js Provider Connects to Tenderly RPC
    ↓
Fetch Contract Data:
├── Strategy.totalAssets()
├── Strategy.totalSupply()
├── Strategy.dragonRouter()
├── Strategy.pricePerShare()
└── Asset.symbol() / Asset.decimals()
    ↓
Calculate Metrics:
├── TVL = totalAssets
├── Yield Generated = totalAssets - totalSupply
└── Price Per Share = pricePerShare / 10^decimals
    ↓
Update UI with Live Data
```

---

## 📊 **Features in Detail**

### **1. Overview Stats Cards**

Four key metrics displayed prominently:

**Total Value Locked (TVL)**
- Aggregates across all strategies
- Updates in real-time
- Shows "Live" indicator

**Active Strategies**
- Count of deployed strategies
- Lists protocols (Morpho + Sky)

**Network Info**
- Shows deployment network (Tenderly)
- Connection status

**User Deposit**
- Shows user's personal deposits (if connected)
- Strategy breakdown

### **2. Strategy Cards**

Each strategy displays:
- Protocol name and logo
- TVL and asset type
- Yield generated to date
- Price per share
- Donation address (dragonRouter)
- Contract address
- Link to explorer

### **3. Contract Information**

Bottom panel shows:
- All deployed contract addresses
- Live status indicators
- Copy-to-clipboard functionality (future)

---

## 🎨 **Design Principles**

### **User Experience**
- **Clarity:** All metrics clearly labeled
- **Transparency:** Show actual contract addresses
- **Responsiveness:** Works on all devices
- **Speed:** Fast load times, efficient RPC calls

### **Visual Design**
- **Modern:** Gradient backgrounds, smooth animations
- **Professional:** Clean, minimalist interface
- **Accessible:** High contrast, readable fonts
- **Brand Consistent:** Purple/pink Octant colors

---

## 🔧 **Development**

### **Build for Production**

```bash
# Build optimized bundle
npm run build

# Preview production build
npm run preview
```

### **Deploy to Vercel**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### **Deploy to Netlify**

```bash
# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

---

## 🧪 **Testing**

### **Manual Testing Checklist**

- [ ] Dashboard loads without errors
- [ ] TVL displays correctly ($1,000)
- [ ] Both strategies show (Morpho + Sky)
- [ ] Refresh button updates data
- [ ] Wallet connect/disconnect works
- [ ] Contract addresses are correct
- [ ] Explorer links work
- [ ] Responsive on mobile
- [ ] Works in Chrome, Firefox, Safari

### **Test with Real Transactions**

1. Connect wallet
2. Make deposit to strategy
3. Refresh dashboard
4. Verify TVL increased
5. Check yield generated updates

---

## 📈 **Metrics & Impact**

### **What This Dashboard Enables**

**For Users:**
- Transparency into where their assets are deployed
- Real-time view of yield generation
- Easy tracking of public goods contributions

**For Projects:**
- Visibility into funding streams
- Donor transparency
- Community engagement tool

**For Octant Ecosystem:**
- Central hub for all strategies
- Onboarding tool for new users
- Marketing/demo asset

### **Current Stats (as of deployment)**

- **Total Value Locked:** $1,000
- **Active Strategies:** 2 (Morpho USDC, Sky USDC)
- **Protocols Supported:** Morpho Blue, Sky Protocol
- **Network:** Tenderly Mainnet Fork (Chain ID: 8)

---

## 🔮 **Future Enhancements**

### **Phase 2 Features**

- [ ] **Deposit/Withdraw UI** - Let users interact directly
- [ ] **Historical Charts** - Yield over time visualization
- [ ] **Transaction History** - Show recent deposits/reports
- [ ] **APY Calculations** - Real-time yield rates
- [ ] **Notifications** - Alert on new yields
- [ ] **Multi-Chain** - Support Polygon, Arbitrum, etc.

### **Phase 3 Features**

- [ ] **Portfolio View** - User-specific dashboard
- [ ] **Comparison Tool** - Compare strategy performance
- [ ] **Donation Tracking** - Follow funds to recipients
- [ ] **Impact Metrics** - Show public goods funded
- [ ] **Admin Panel** - Strategy management for DAO

---

## 🤝 **Contributing**

This is an open-source project. Contributions welcome!

### **How to Contribute**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 **License**

MIT License - feel free to use, modify, and distribute.

---

## 🏆 **Hackathon Submission**

**Track:** Best Public Goods Project ($3,000)

**Why This Wins:**

1. **Solves Real Problem:** Provides transparency into Octant ecosystem
2. **Production Quality:** Fully functional, deployed, live data
3. **Technical Excellence:** Clean code, best practices, efficient
4. **Design Excellence:** Beautiful, modern, intuitive UI
5. **Impact:** Helps entire Octant community understand/track funding

**Deliverables:**
- ✅ Live dashboard with real blockchain data
- ✅ Open source code repository
- ✅ Complete documentation
- ✅ Demo video
- ✅ Deployed and accessible

---

## 📞 **Contact**

**Developer:** [Your Name]  
**Email:** [Your Email]  
**Twitter:** [@YourHandle]  
**GitHub:** [Your GitHub]

**Built for Octant v2 Hackathon 2024**  
**With ❤️ for Public Goods**

---

## 🙏 **Acknowledgments**

- Octant team for the amazing infrastructure
- Golem Foundation for hosting the hackathon
- Tenderly for the mainnet fork
- shadcn for the UI components
- Open source community

---

**Quick Preview:**
1. Dashboard loads with live data
2. Shows $1,000 TVL from deployed strategies
3. Wallet connection demonstration
4. Refresh functionality
5. Strategy details walkthrough

---

**Built with 🔥 for the Octant v2 Hackathon**
